import crypto from 'crypto';
import { pool } from '../../db.js';
import {
  RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_BUSINESS_NAME,
} from '../../config.js';
import { DepositProvider, DepositInstructions, DepositOrder } from './DepositProvider.js';

// ─── Razorpay deposit collection ────────────────────────────────────────────────
// Real fiat-in for the SEP-24 deposit: collect INR via Razorpay Checkout, VERIFY
// the payment server-side, and only then let USDC be released. Like the DIDIT KYC
// module this is the SPINE — the SEP-24 webview (createOrder + verifyCheckout) and
// the webhook (markPaidByOrder) call these functions directly; the class is a thin
// DepositProvider wrapper. State lives in nordstern.razorpay_payments (db.ts).
//
// We talk to Razorpay's REST API with raw fetch + Basic auth and verify signatures
// with node:crypto — matching how DIDIT and the Cashfree payout are done in this
// repo (no vendor SDK in the flow), rather than importing the `razorpay` package.
//
// Money-safety invariants:
//   • INR is LOCKED at order creation and reused verbatim (charge = display = amount_in).
//   • The release is claimed with an atomic paid→releasing transition, so the webview
//     return and the webhook can never both send USDC (claimForRelease).
//   • verifyCheckout / markPaidByOrder both RE-VERIFY against the Razorpay API before
//     trusting a payment — the signed client callback / webhook is necessary, not
//     sufficient.

const RZP_BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)');
  }
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

async function apiCreateOrder(args: {
  amountPaise: number; receipt: string; notes: Record<string, string>;
}): Promise<{ id: string }> {
  const res = await fetch(`${RZP_BASE}/orders`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: args.amountPaise, currency: 'INR', receipt: args.receipt,
      notes: args.notes, payment_capture: 1,
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order create failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Authoritative payment check: the order is fully paid only when Razorpay itself
// reports status 'paid'. Used by both verify paths (never trust the caller alone).
async function apiOrderIsPaid(orderId: string): Promise<boolean> {
  const res = await fetch(`${RZP_BASE}/orders/${orderId}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`Razorpay order fetch failed (${res.status}): ${await res.text()}`);
  const order = (await res.json()) as { status?: string };
  return order.status === 'paid';
}

const RELEASABLE = ['paid', 'releasing', 'released'];

// Create (or reuse) the Razorpay order for a deposit. Reuses the existing order
// when the amount is unchanged, or once payment has started (so reloads/repeat
// clicks don't mint duplicate orders and can't move the locked amount). Only mints
// a fresh order for a first request, or when the USDC amount changed while still
// unpaid. INR is locked into the row here.
export async function createOrder(args: {
  transactionId: string; usdcAmount: string;
  inrAmount: string; inrPerUsdc: string; rateSource: string;
  account: string; destination: string;
}): Promise<DepositOrder> {
  const prior = (await pool.query(
    'SELECT * FROM nordstern.razorpay_payments WHERE transaction_id = $1',
    [args.transactionId],
  )).rows[0];

  // Reuse once payment has begun (locked), or for the same still-unpaid amount.
  if (prior && (prior.status !== 'created' || prior.amount_usdc === args.usdcAmount)) {
    return {
      orderId: prior.order_id, keyId: RAZORPAY_KEY_ID, amountPaise: Number(prior.amount_paise),
      currency: 'INR', inrAmount: prior.amount_inr, inrPerUsdc: prior.inr_per_usdc,
      rateSource: prior.rate_source ?? '', name: RAZORPAY_BUSINESS_NAME,
    };
  }

  const amountPaise = Math.round(Number(args.inrAmount) * 100);
  const order = await apiCreateOrder({
    amountPaise, receipt: args.transactionId,
    notes: { transaction_id: args.transactionId, account: args.account },
  });

  await pool.query(
    `INSERT INTO nordstern.razorpay_payments
       (transaction_id, order_id, amount_usdc, amount_inr, amount_paise,
        inr_per_usdc, rate_source, status, account, destination, payment_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'created', $8, $9, NULL, now())
     ON CONFLICT (transaction_id) DO UPDATE SET
       order_id = EXCLUDED.order_id, amount_usdc = EXCLUDED.amount_usdc,
       amount_inr = EXCLUDED.amount_inr, amount_paise = EXCLUDED.amount_paise,
       inr_per_usdc = EXCLUDED.inr_per_usdc, rate_source = EXCLUDED.rate_source,
       status = 'created', account = EXCLUDED.account, destination = EXCLUDED.destination,
       payment_id = NULL, updated_at = now()`,
    [
      args.transactionId, order.id, args.usdcAmount, args.inrAmount, amountPaise,
      args.inrPerUsdc, args.rateSource, args.account, args.destination,
    ],
  );

  return {
    orderId: order.id, keyId: RAZORPAY_KEY_ID, amountPaise, currency: 'INR',
    inrAmount: args.inrAmount, inrPerUsdc: args.inrPerUsdc, rateSource: args.rateSource,
    name: RAZORPAY_BUSINESS_NAME,
  };
}

// Mark a row 'paid' (idempotent, never downgrades a releasing/released row).
async function markPaid(where: { transactionId?: string; orderId?: string }, paymentId: string | null): Promise<string | null> {
  const col = where.transactionId ? 'transaction_id' : 'order_id';
  const val = where.transactionId ?? where.orderId;
  const { rows } = await pool.query(
    `UPDATE nordstern.razorpay_payments
       SET status = CASE WHEN status = 'created' THEN 'paid' ELSE status END,
           payment_id = COALESCE(payment_id, $2), updated_at = now()
     WHERE ${col} = $1
     RETURNING transaction_id`,
    [val, paymentId],
  );
  return rows[0]?.transaction_id ?? null;
}

// Verify the Checkout callback (webview return path). Confirms the HMAC signature
// AND re-verifies the order is paid via the API, then marks the row paid. Throws on
// any mismatch — the caller surfaces it and does NOT release.
export async function verifyCheckout(args: {
  transactionId: string; orderId: string; paymentId: string; signature: string;
}): Promise<void> {
  const row = (await pool.query(
    'SELECT order_id FROM nordstern.razorpay_payments WHERE transaction_id = $1',
    [args.transactionId],
  )).rows[0];
  if (!row) throw new Error('no Razorpay order for this transaction');
  if (row.order_id !== args.orderId) throw new Error('order id mismatch');

  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${args.orderId}|${args.paymentId}`).digest('hex');
  const sig = String(args.signature);
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    throw new Error('invalid payment signature');
  }

  if (!(await apiOrderIsPaid(args.orderId))) throw new Error('order is not paid');
  await markPaid({ transactionId: args.transactionId }, args.paymentId);
}

// Webhook path: the signed event names an order_id; re-verify it's paid, then mark
// the matching row paid. Returns the transaction id to release, or null if unknown/
// not actually paid.
export async function markPaidByOrder(orderId: string, paymentId: string | null): Promise<string | null> {
  if (!(await apiOrderIsPaid(orderId))) return null;
  return markPaid({ orderId }, paymentId);
}

// Atomic double-send guard: flip the single 'paid' row to 'releasing' and return the
// locked amounts. Only one concurrent caller (webview return OR webhook) wins; the
// loser gets null.
export async function claimForRelease(transactionId: string): Promise<{
  amountUsdc: string; inrAmount: string; inrPerUsdc: string; rateSource: string;
} | null> {
  const { rows } = await pool.query(
    `UPDATE nordstern.razorpay_payments SET status = 'releasing', updated_at = now()
     WHERE transaction_id = $1 AND status = 'paid'
     RETURNING amount_usdc, amount_inr, inr_per_usdc, rate_source`,
    [transactionId],
  );
  const r = rows[0];
  if (!r) return null;
  return { amountUsdc: r.amount_usdc, inrAmount: r.amount_inr, inrPerUsdc: r.inr_per_usdc, rateSource: r.rate_source ?? '' };
}

export async function markReleased(transactionId: string, stellarTxHash: string): Promise<void> {
  await pool.query(
    `UPDATE nordstern.razorpay_payments
       SET status = 'released', stellar_tx_hash = $2, updated_at = now()
     WHERE transaction_id = $1`,
    [transactionId, stellarTxHash],
  );
}

export async function markReleaseFailed(transactionId: string, message: string): Promise<void> {
  await pool.query(
    `UPDATE nordstern.razorpay_payments
       SET status = 'failed', last_error = $2, updated_at = now()
     WHERE transaction_id = $1`,
    [transactionId, message.slice(0, 500)],
  );
}

export async function isPaid(transactionId: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT status FROM nordstern.razorpay_payments WHERE transaction_id = $1',
    [transactionId],
  );
  return RELEASABLE.includes(rows[0]?.status);
}

// ─── Thin DepositProvider (DEPOSIT_PROVIDER=razorpay) ────────────────────────────
export class RazorpayDepositProvider implements DepositProvider {
  async instructions({ inrAmount }: {
    transactionId: string; inrAmount: string; usdcAmount: string; memo: string;
  }): Promise<DepositInstructions> {
    return {
      label: 'Secure payment',
      lines: [`Amount: ₹${inrAmount}`, 'UPI · cards · netbanking, via Razorpay'],
      note: 'Pay in the Razorpay window. USDC is released only after we verify your payment.',
    };
  }

  isPaid(args: { transactionId: string }): Promise<boolean> { return isPaid(args.transactionId); }
  createOrder(args: Parameters<NonNullable<DepositProvider['createOrder']>>[0]): Promise<DepositOrder> { return createOrder(args); }
  claimForRelease(transactionId: string) { return claimForRelease(transactionId); }
  markReleased(transactionId: string, hash: string) { return markReleased(transactionId, hash); }
  markReleaseFailed(transactionId: string, message: string) { return markReleaseFailed(transactionId, message); }
}
