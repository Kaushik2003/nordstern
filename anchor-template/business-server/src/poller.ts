import { listTransactions, patchTransaction } from './platform.js';
import { assetId } from './config.js';
import { rate, payout } from './adapters/index.js';

// ─── Withdrawal poller (off-ramp) ──────────────────────────────────────────────
// The AP Observer watches the treasury account and moves a withdrawal to
// `pending_anchor` once the user's USDC arrives (matched by memo). This poller
// picks those up, disburses INR via the PayoutProvider, and completes — recording
// the FX (USDC in → INR out). Money moves are status-driven and idempotent:
// completion only happens on a confirmed payout, and processed txs leave
// `pending_anchor`, so they aren't re-processed.

const POLL_MS = 10_000;

async function processWithdrawal(tx: Record<string, any>): Promise<void> {
  const usdcAmount = tx.amount_expected?.amount ?? '0';
  const q = await rate.quote();
  const inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);

  console.log(`[withdrawal] ${tx.id}: received ${usdcAmount} USDC → paying ₹${inrAmount}`);
  const result = await payout.disburse({
    transactionId: tx.id, inrAmount, usdcAmount, destination: tx.destination_account,
  });

  if (result.status !== 'completed') {
    // Leave in pending_anchor for the next tick / manual review — never complete
    // a withdrawal whose fiat payout hasn't confirmed.
    console.log(`[withdrawal] ${tx.id} payout=${result.status} (${result.message ?? ''}) — left pending`);
    return;
  }

  await patchTransaction(tx.id, {
    status: 'completed',
    amount_in:  { amount: usdcAmount, asset: assetId() },       // USDC received
    amount_out: { amount: inrAmount,  asset: 'iso4217:INR' },   // INR paid out
    amount_fee: { amount: '0',        asset: assetId() },
  });
  console.log(`[withdrawal] ${tx.id} → completed (ref ${result.reference ?? 'n/a'})`);
}

async function poll(): Promise<void> {
  try {
    const records = await listTransactions({ sep: '24', status: 'pending_anchor' });
    for (const tx of records.filter((r: any) => r.kind === 'withdrawal')) {
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
