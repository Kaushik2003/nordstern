import { Router } from 'express';
import type { Request } from 'express';
import { listTransactions, fetchTransaction, patchTransaction } from './platform.js';
import { pool } from './db.js';
import { kyc } from './adapters/index.js';
import { ASSET_CODE, PROVIDERS, TREASURY_PUBLIC } from './config.js';
import { generateMemo } from './stellar.js';
import { requireCustomerSession, fetchCustomerWallets } from './customerSession.js';
import { propagateKycToPlatform } from './kycPropagate.js';

// ─── Customer-facing API (ns_customer session) ──────────────────────────────────
// Tenant-isolated to THIS anchor. History is scoped to the authenticated customer's
// linked wallets — never another customer's transactions. Financial data stays
// authoritative in this anchor (Platform API); we only read + relabel it. No new store.

export const customerApiRouter = Router();
customerApiRouter.use('/customer', requireCustomerSession);

// SEP-24 status → friendly customer phase. Only real statuses.
function phase(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'refunded') return 'refunded';
  if (s === 'error' || s === 'expired') return 'failed';
  if (s === 'pending_stellar') return 'completing';
  if (s === 'pending_anchor' || s === 'pending_external') return 'processing';
  if (s.startsWith('pending_user') || s === 'incomplete') return 'awaiting_payment';
  return 'processing';
}

const amt = (a: any): string | null => (a && a.amount != null ? String(a.amount) : null);

// Every Stellar account a transaction could belong to.
function txAccounts(tx: Record<string, any>): string[] {
  return [tx.sep10_account, tx.customers?.sender?.account, tx.destination_account].filter(Boolean);
}

function toCustomerTx(tx: Record<string, any>) {
  const kind = tx.kind === 'withdrawal' ? 'sell' : 'buy';
  // The AP legs are opposite per direction:
  //   deposit (buy):    amount_in = INR,   amount_out = asset delivered
  //   withdrawal (sell): amount_in = asset, amount_out = INR paid out
  // Map to the customer's INR vs asset amounts accordingly, so a sell receipt shows the
  // real INR credited (not the asset count with a ₹ sign).
  const asset = kind === 'sell'
    ? (amt(tx.amount_in) ?? amt(tx.amount_expected))
    : (amt(tx.amount_out) ?? amt(tx.amount_expected));
  const inr = kind === 'sell' ? amt(tx.amount_out) : amt(tx.amount_in);
  return {
    id: tx.id,
    kind,
    phase: phase(String(tx.status ?? '')),
    assetAmount: asset,
    inrAmount: inr,
    reference: String(tx.id ?? '').slice(0, 8).toUpperCase() || null,
    createdAt: tx.started_at ?? null,
    completedAt: tx.completed_at ?? null,
    assetCode: ASSET_CODE,
    // Technical (UI shows only under "Advanced"):
    rawStatus: String(tx.status ?? ''),
    stellarId: tx.stellar_transactions?.[0]?.id ?? null,
    destination: tx.destination_account ?? null,
  };
}

function customerId(req: Request): string {
  return (req as Request & { customerId?: string }).customerId!;
}

// GET /customer/transactions — this customer's history on THIS anchor.
customerApiRouter.get('/customer/transactions', async (req, res) => {
  try {
    const addresses = new Set(await fetchCustomerWallets(customerId(req)));
    if (addresses.size === 0) { res.json({ transactions: [] }); return; }
    const records = await listTransactions({ sep: '24', order: 'desc' });
    const mine = records
      .filter((tx) => txAccounts(tx).some((a) => addresses.has(a)))
      .map(toCustomerTx)
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    res.json({ transactions: mine });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /customer/transactions/:id — one, only if it belongs to this customer.
customerApiRouter.get('/customer/transactions/:id', async (req, res) => {
  try {
    const addresses = new Set(await fetchCustomerWallets(customerId(req)));
    const tx = await fetchTransaction(req.params.id as string).catch(() => null);
    if (!tx || !txAccounts(tx).some((a) => addresses.has(a))) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const out = toCustomerTx(tx);
    // For a sell, surface the actual payout reference (bank UTR / PSP id) so the receipt
    // shows where the money went — not just the internal transaction id.
    if (out.kind === 'sell') {
      const { rows } = await pool.query(
        `SELECT reference FROM nordstern.withdrawal_payouts WHERE transaction_id = $1`,
        [tx.id],
      );
      (out as Record<string, unknown>).payoutReference = rows[0]?.reference ?? null;
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /customer/withdraw/:id — where to send the asset for a withdrawal: the treasury
// account + the required memo the Observer matches on. Lets the native app build a "click to
// send" payment (wallet signs) instead of a copy-paste webview. Same values the SEP-24
// webview shows; session-gated. The memo is derived identically to the SEP-24 path
// (generateMemo), so the Observer matches the incoming payment automatically.
customerApiRouter.get('/customer/withdraw/:id', async (req, res) => {
  const id = req.params.id as string;
  const memo = generateMemo(id);
  // Register the expected transfer with the Anchor Platform so its Observer matches the
  // incoming payment by memo and advances the tx to pending_anchor. The SEP-24 webview does
  // this on render; the native "click to send" flow bypasses the webview, so it MUST happen
  // here — otherwise the payment lands on-chain but is never matched and the sell hangs.
  await patchTransaction(id, { status: 'pending_user_transfer_start', memo, memo_type: 'text' }).catch(() => {});
  res.json({ treasury: TREASURY_PUBLIC, memo, assetCode: ASSET_CODE });
});

// POST /customer/kyc/start — begin DIDIT verification tied to the CUSTOMER identity.
// vendor_data = customerId so the webhook decision propagates to the central profile.
// The client never sets its own status; this only starts a hosted session.
customerApiRouter.post('/customer/kyc/start', async (req, res) => {
  try {
    const id = customerId(req);
    // Optional same-origin return URL the client passes so DIDIT sends the user back
    // to the app; validated to an http(s) URL to avoid open redirects.
    const raw = String((req.body ?? {}).returnUrl ?? '');
    const returnUrl = /^https?:\/\//.test(raw) ? raw : undefined;
    if (PROVIDERS.kyc === 'mock') {
      await propagateKycToPlatform({ vendor_data: id, status: 'Approved' });
      res.json({ url: returnUrl ?? '/', status: 'ACCEPTED' });
      return;
    }
    const session = await kyc.startSession(id, undefined, returnUrl);
    res.json({ url: session.url, status: session.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /credits|top ?up/i.test(msg)
      ? 'Verification is temporarily unavailable. Please try again later.'
      : 'Could not start verification. Please try again.';
    res.status(502).json({ error: friendly });
  }
});
