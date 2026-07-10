import { listTransactions, patchTransaction, fetchTransaction } from './platform.js';
import { assetId } from './config.js';
import { rate, payout } from './adapters/index.js';
import { pool } from './db.js';
import { generateMemo, findIncomingWithdrawal } from './stellar.js';

// ─── Withdrawal poller (off-ramp) ──────────────────────────────────────────────
// The AP Observer moves a withdrawal to `pending_anchor` once the user's USDC
// arrives (matched by memo). This poller disburses INR via the PayoutProvider and
// completes, recording the FX (USDC in → INR out).
//
// AT-MOST-ONCE payout: the AP's `status` query filter is unreliable (it returns
// every status, verified against the running v4.4.0), so we CANNOT rely on it to
// stop re-processing — nor on the AP status transition "sticking". Every payout is
// therefore guarded by a durable claim in `nordstern.withdrawal_payouts`: a
// withdrawal is claimed before any fiat moves, so a re-listed or crash-replayed
// withdrawal can never be disbursed twice. Mirror of the deposit outbox (DEC-007).

const POLL_MS = 10_000;

// A SEP-24 session that never completes should not linger as "In Progress" forever. Any
// deposit/withdrawal still awaiting the user's action (incomplete / pending_user_transfer_start)
// older than this is expired → the customer sees "Couldn't complete", and it drops out of the
// active list. Safe: these statuses precede any money movement, so expiring one moves no funds.
const SESSION_MAX_MS = 5 * 60_000;              // 5 minutes
const REAP_STATUSES = new Set(['incomplete', 'pending_user_transfer_start']);

// Atomic single-claim: INSERT the intent, or reclaim a 'failed' row. Returns
// 'claimed' when we own the payout; 'in_flight' when another tick owns it; or
// 'completed' (with the prior reference) when it was already paid.
async function claimWithdrawalPayout(
  txId: string, usdcAmount: string, inrAmount: string,
): Promise<{ kind: 'claimed' } | { kind: 'in_flight' } | { kind: 'completed'; reference: string | null }> {
  const { rows } = await pool.query(
    `INSERT INTO nordstern.withdrawal_payouts (transaction_id, amount_usdc, amount_inr, status)
     VALUES ($1, $2, $3, 'processing')
     ON CONFLICT (transaction_id) DO UPDATE
       SET status='processing', updated_at=now()
       WHERE withdrawal_payouts.status = 'failed'
     RETURNING status`,
    [txId, usdcAmount, inrAmount],
  );
  if (rows.length > 0) return { kind: 'claimed' };

  const { rows: cur } = await pool.query(
    `SELECT status, reference FROM nordstern.withdrawal_payouts WHERE transaction_id=$1`, [txId],
  );
  if (cur[0]?.status === 'completed') return { kind: 'completed', reference: cur[0].reference ?? null };
  return { kind: 'in_flight' };
}

const markWithdrawalPaid = (txId: string, ref: string | null) =>
  pool.query(`UPDATE nordstern.withdrawal_payouts SET status='completed', reference=$2, updated_at=now() WHERE transaction_id=$1`, [txId, ref]);
const markWithdrawalFailed = (txId: string, msg: string) =>
  pool.query(`UPDATE nordstern.withdrawal_payouts SET status='failed', last_error=$2, updated_at=now() WHERE transaction_id=$1`, [txId, msg.slice(0, 500)]);

// Idempotently reflect a completed payout in the Platform tx (skip if already done).
async function completeInAp(txId: string, usdcAmount: string, inrAmount: string): Promise<void> {
  const tx = await fetchTransaction(txId).catch(() => null);
  if (tx?.status === 'completed') return;
  await patchTransaction(txId, {
    status: 'completed',
    amount_in:  { amount: usdcAmount, asset: assetId() },       // USDC received
    amount_out: { amount: inrAmount,  asset: 'iso4217:INR' },   // INR paid out
    amount_fee: { amount: '0',        asset: assetId() },
  });
}

// Exported for money-flow tests (R6 M3). Behaviorally unchanged — this is the
// at-most-once payout unit the poller drives per pending withdrawal.
export async function processWithdrawal(tx: Record<string, any>): Promise<void> {
  const usdcAmount = tx.amount_expected?.amount ?? '0';
  const q = await rate.quote();
  const inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);

  // Claim BEFORE any fiat moves — the durable at-most-once guard.
  const claim = await claimWithdrawalPayout(tx.id, usdcAmount, inrAmount);
  if (claim.kind === 'in_flight') return;
  if (claim.kind === 'completed') {
    // Already paid; a prior AP patch may have failed — self-heal without re-paying.
    await completeInAp(tx.id, usdcAmount, inrAmount);
    return;
  }

  console.log(`[withdrawal] ${tx.id}: received ${usdcAmount} USDC → paying ₹${inrAmount}`);
  let result;
  try {
    result = await payout.disburse({ transactionId: tx.id, inrAmount, usdcAmount, destination: tx.destination_account });
  } catch (err) {
    await markWithdrawalFailed(tx.id, err instanceof Error ? err.message : String(err));
    throw err;
  }

  if (result.status !== 'completed') {
    // Never complete a withdrawal whose fiat payout hasn't confirmed. Mark 'failed'
    // so the next tick can re-drive it (the claim reclaims 'failed' rows).
    await markWithdrawalFailed(tx.id, `payout ${result.status}: ${result.message ?? ''}`);
    console.log(`[withdrawal] ${tx.id} payout=${result.status} (${result.message ?? ''}) — left pending`);
    return;
  }

  // Record the payout as done BEFORE the AP patch, so a crash in between can't cause
  // a re-pay (next tick sees 'completed' → self-heals the AP patch only).
  await markWithdrawalPaid(tx.id, result.reference ?? null);
  await completeInAp(tx.id, usdcAmount, inrAmount);
  console.log(`[withdrawal] ${tx.id} → completed (ref ${result.reference ?? 'n/a'})`);
}

// ── Self-detection: pending_user_transfer_start → pending_anchor ────────────────
// Normally the AP's HorizonPaymentObserver detects the user's incoming asset (matched by
// memo) and advances the withdrawal to `pending_anchor`. But that transition rides the AP
// event pipeline, which is disabled in setups without a queue (events.enabled=false) — the
// Observer sees the payment but never advances the tx, so the off-ramp hangs. This pass
// makes detection self-contained: for each awaiting-transfer withdrawal, ask Horizon whether
// the matching payment (memo + exact amount/asset) has landed at the treasury, and if so
// advance it ourselves. The subsequent processWithdrawal step is still guarded by the durable
// at-most-once claim, so detecting here can never cause a double payout.
async function detectIncomingWithdrawals(): Promise<void> {
  const records = await listTransactions({ sep: '24', status: 'pending_user_transfer_start' });
  const awaiting = records.filter(
    (r: any) => r.kind === 'withdrawal' && r.status === 'pending_user_transfer_start',
  );
  for (const tx of awaiting) {
    try {
      const amount = tx.amount_expected?.amount;
      if (!amount || Number(amount) <= 0) continue;
      const hit = await findIncomingWithdrawal(String(amount), generateMemo(tx.id));
      if (hit) {
        await patchTransaction(tx.id, { status: 'pending_anchor' });
        console.log(`[withdrawal] ${tx.id} transfer detected on-chain (${hit.hash}) → pending_anchor`);
      }
    } catch (err) {
      console.error(`[withdrawal] detect error on ${tx.id}:`, (err as Error).message);
    }
  }
}

// Expire sessions that have been awaiting the user's action for longer than SESSION_MAX_MS.
// Runs AFTER detection so a real-but-slightly-late transfer is picked up before it's reaped.
async function reapStaleSessions(): Promise<void> {
  const records = await listTransactions({ sep: '24', order: 'desc' });
  const now = Date.now();
  for (const tx of records) {
    if (!REAP_STATUSES.has(tx.status)) continue;
    const started = Date.parse(tx.started_at ?? tx.updated_at ?? '');
    if (!started || now - started < SESSION_MAX_MS) continue;
    try {
      await patchTransaction(tx.id, {
        status: 'expired',
        message: 'Session expired — no payment received within 5 minutes.',
      });
      console.log(`[reaper] ${tx.id} (${tx.kind}, ${tx.status}) expired after ${Math.round((now - started) / 60000)}m`);
    } catch (err) {
      console.error(`[reaper] failed to expire ${tx.id}:`, (err as Error).message);
    }
  }
}

async function poll(): Promise<void> {
  try {
    // 1. Detect user transfers the AP Observer may not have advanced (events disabled).
    await detectIncomingWithdrawals();

    // 1b. Expire abandoned sessions (>5 min awaiting the user) so they leave "In Progress".
    await reapStaleSessions();

    // 2. Pay out anything now pending_anchor (at-most-once guarded).
    const records = await listTransactions({ sep: '24', status: 'pending_anchor' });
    // The AP status filter is unreliable — filter client-side. Only genuinely
    // pending_anchor withdrawals are candidates; completed/errored ones are excluded.
    const pending = records.filter((r: any) => r.kind === 'withdrawal' && r.status === 'pending_anchor');
    for (const tx of pending) {
      await processWithdrawal(tx).catch((err) =>
        console.error(`[withdrawal] error on ${tx.id}:`, err.message),
      );
    }
  } catch (err) {
    console.error('[poller] error:', (err as Error).message);
  }
}

export function startWithdrawalPoller(): void {
  console.log(`[poller] withdrawal poller every ${POLL_MS / 1000}s`);
  setInterval(poll, POLL_MS);
}
