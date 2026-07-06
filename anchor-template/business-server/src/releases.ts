import { pool } from './db.js';
import { assetId } from './config.js';
import { fetchTransaction, patchTransaction } from './platform.js';
import { assertTreasuryReserve, sendUsdc, findTreasuryPayment } from './stellar.js';

// ─── Deposit release: Transfer-After-Commit (outbox) ────────────────────────────
// The deposit money-move used to be: send USDC on Stellar, THEN record the outcome
// in the (external) Anchor Platform DB. A crash in that window left funds sent with
// no local record and no automatic recovery — a stuck transaction a naive operator
// could re-run into a double-spend.
//
// This module makes the release durable and idempotent:
//   1. Claim a row in `nordstern.deposit_releases` (status 'submitting') BEFORE any
//      money moves — the authoritative local record of intent. The claim is atomic,
//      so it is also the universal double-send guard across every deposit provider.
//   2. Send USDC carrying a deterministic memo, but first ask the chain whether that
//      exact transfer already landed (findTreasuryPayment) — so a retry adopts the
//      prior transfer instead of sending a second one.
//   3. Record the hash locally ('submitted'), complete the Platform tx, mark
//      'completed'. A reconciler resolves anything left mid-flight by a crash.
//
// The reconciler waits STALE_MS before touching a row, which is far longer than a
// Stellar ledger close: any transfer that truly reached the network is therefore
// already visible on-chain before we'd ever consider re-driving, so re-drive can
// only resubmit transfers that never landed. That window is what makes automatic
// recovery safe.

export interface ReleaseParams {
  transactionId: string;
  destination: string;
  usdcAmount: string;
  inrAmount: string;
  inrPerUsdc: string;
  rateSource: string;
  memo: string;
}

export type ExecuteOutcome =
  | { kind: 'released'; hash: string }   // we sent (or adopted) the transfer and completed
  | { kind: 'already'; hash: string }    // a prior attempt already settled it
  | { kind: 'in_flight' };               // another caller owns the live send; not ready

const RECONCILE_MS = 30_000;
const STALE_SECONDS = 25;   // grace before the reconciler acts on a row (≫ ledger close)
const MAX_ATTEMPTS = 5;     // stop auto-re-driving a persistently failing release

// ── Atomic claim ────────────────────────────────────────────────────────────────
// INSERT the intent, or reclaim a previously 'failed' row. Returns 'claimed' when we
// own the release; 'busy' (with the current status/hash) when someone else does or
// it is already done. The `WHERE status='failed'` on the conflict path is what makes
// this a single-winner claim: an existing submitting/submitted/completed row is left
// untouched and yields no returned row.
async function claimReleaseSlot(
  p: ReleaseParams,
): Promise<{ kind: 'claimed' } | { kind: 'busy'; status: string; hash: string | null }> {
  const { rows } = await pool.query(
    `INSERT INTO nordstern.deposit_releases
       (transaction_id, destination, amount_usdc, amount_inr, inr_per_usdc, rate_source, memo, status, attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'submitting',1)
     ON CONFLICT (transaction_id) DO UPDATE
       SET status='submitting', attempts = deposit_releases.attempts + 1, updated_at = now()
       WHERE deposit_releases.status = 'failed'
     RETURNING status`,
    [p.transactionId, p.destination, p.usdcAmount, p.inrAmount, p.inrPerUsdc, p.rateSource, p.memo],
  );
  if (rows.length > 0) return { kind: 'claimed' };

  const { rows: cur } = await pool.query(
    `SELECT status, stellar_tx_hash FROM nordstern.deposit_releases WHERE transaction_id = $1`,
    [p.transactionId],
  );
  return { kind: 'busy', status: cur[0]?.status ?? 'unknown', hash: cur[0]?.stellar_tx_hash ?? null };
}

async function markSubmitted(txId: string, hash: string): Promise<void> {
  await pool.query(
    `UPDATE nordstern.deposit_releases SET status='submitted', stellar_tx_hash=$2, updated_at=now() WHERE transaction_id=$1`,
    [txId, hash],
  );
}

async function markCompleted(txId: string, hash?: string): Promise<void> {
  await pool.query(
    `UPDATE nordstern.deposit_releases
        SET status='completed', stellar_tx_hash=COALESCE($2, stellar_tx_hash), updated_at=now()
      WHERE transaction_id=$1`,
    [txId, hash ?? null],
  );
}

async function markFailed(txId: string, message: string): Promise<void> {
  await pool.query(
    `UPDATE nordstern.deposit_releases SET status='failed', last_error=$2, updated_at=now() WHERE transaction_id=$1`,
    [txId, message.slice(0, 500)],
  );
}

// Complete the Anchor Platform transaction — idempotently (skip if already done, so
// a retry / reconcile never fights the AP over a settled tx).
async function completeApTransaction(p: ReleaseParams, hash: string): Promise<void> {
  const tx = await fetchTransaction(p.transactionId).catch(() => null);
  if (tx?.status === 'completed') return;
  await patchTransaction(p.transactionId, {
    status: 'completed',
    amount_in:  { amount: p.inrAmount,  asset: 'iso4217:INR' },
    amount_out: { amount: p.usdcAmount, asset: assetId() },
    amount_fee: { amount: '0',          asset: assetId() },
    stellar_transactions: [{ id: hash }],
  });
}

// ── The one safe way to release a deposit ───────────────────────────────────────
export async function executeRelease(p: ReleaseParams): Promise<ExecuteOutcome> {
  const claim = await claimReleaseSlot(p);

  if (claim.kind === 'busy') {
    if (claim.status === 'completed' && claim.hash) return { kind: 'already', hash: claim.hash };
    if (claim.status === 'submitted' && claim.hash) {
      // Sent, but AP completion may not have landed (crash between the two) — finish it.
      await completeApTransaction(p, claim.hash);
      await markCompleted(p.transactionId);
      return { kind: 'already', hash: claim.hash };
    }
    // 'submitting' (or unknown): a concurrent caller owns the live send. The
    // reconciler / that caller will finish it; report not-ready to the user path.
    return { kind: 'in_flight' };
  }

  // We own the claim — move the money.
  await patchTransaction(p.transactionId, { status: 'pending_anchor' }).catch(() => {}); // observability only
  try {
    await assertTreasuryReserve(p.usdcAmount);
    // Idempotent send: adopt an already-landed transfer (crash/retry), else submit.
    const existing = await findTreasuryPayment(p.destination, p.usdcAmount, p.memo);
    const hash = existing ? existing.hash : await sendUsdc(p.destination, p.usdcAmount, p.memo);
    await markSubmitted(p.transactionId, hash);   // durable: hash recorded BEFORE AP completion
    await completeApTransaction(p, hash);
    await markCompleted(p.transactionId);
    return { kind: 'released', hash };
  } catch (err) {
    await markFailed(p.transactionId, err instanceof Error ? err.message : String(err));
    throw err;   // releaseDeposit patches AP → 'error' and surfaces to the caller
  }
}

// ── Reconciler ──────────────────────────────────────────────────────────────────
// Resolve any release left non-terminal by a crash. Runs once at startup and on an
// interval. For each stale row: ask the chain; if the transfer landed, make the
// world consistent (complete AP + row); if it never landed, re-drive (bounded by
// MAX_ATTEMPTS) — safe because the STALE window guarantees a real submit is already
// visible on-chain.
export async function reconcileDepositReleases(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT transaction_id, destination, amount_usdc, amount_inr, inr_per_usdc, rate_source, memo, status, stellar_tx_hash, attempts
       FROM nordstern.deposit_releases
      WHERE status IN ('submitting','submitted','failed')
        AND updated_at < now() - make_interval(secs => $1)`,
    [STALE_SECONDS],
  );
  for (const r of rows) {
    await reconcileOne(r).catch((err) =>
      console.error(`[reconcile] ${r.transaction_id}:`, err instanceof Error ? err.message : err),
    );
  }
}

async function reconcileOne(r: Record<string, any>): Promise<void> {
  const p: ReleaseParams = {
    transactionId: r.transaction_id,
    destination: r.destination,
    usdcAmount: r.amount_usdc,
    inrAmount: r.amount_inr,
    inrPerUsdc: r.inr_per_usdc,
    rateSource: r.rate_source,
    memo: r.memo,
  };

  // Did the transfer land? A recorded hash is authoritative; otherwise ask the chain.
  const onchain: { hash: string } | null = r.stellar_tx_hash
    ? { hash: r.stellar_tx_hash }
    : await findTreasuryPayment(p.destination, p.usdcAmount, p.memo);

  if (onchain) {
    await completeApTransaction(p, onchain.hash);
    await markCompleted(p.transactionId, onchain.hash);
    console.log(`[reconcile] ${p.transactionId} settled on-chain (${onchain.hash}) → completed`);
    return;
  }

  if (r.attempts >= MAX_ATTEMPTS) {
    if (r.status !== 'failed') await markFailed(p.transactionId, `no on-chain transfer after ${r.attempts} attempts`);
    console.error(`[reconcile] ${p.transactionId} exhausted auto-recovery (${r.attempts} attempts) — manual review required`);
    return;
  }

  // No on-chain transfer and within budget → re-drive. Mark reclaimable first so
  // executeRelease's claim (which only reclaims 'failed' rows) can take it.
  console.warn(`[reconcile] ${p.transactionId} not on-chain (attempt ${r.attempts}) — re-driving`);
  if (r.status !== 'failed') await markFailed(p.transactionId, 'reconciler re-drive');
  await executeRelease(p).catch((e) =>
    console.error(`[reconcile] re-drive ${p.transactionId} failed:`, e instanceof Error ? e.message : e),
  );
}

export function startReleaseReconciler(): void {
  console.log(`[reconcile] deposit release reconciler every ${RECONCILE_MS / 1000}s (stale > ${STALE_SECONDS}s)`);
  setInterval(() => {
    reconcileDepositReleases().catch((e) =>
      console.error('[reconcile] tick error:', e instanceof Error ? e.message : e),
    );
  }, RECONCILE_MS);
}
