import {
  Keypair, Horizon, TransactionBuilder, BASE_FEE, Operation, Asset, Memo,
} from '@stellar/stellar-sdk';
import {
  HORIZON_URL, TREASURY_PUBLIC, TREASURY_SECRET, ASSET_CODE, ASSET_ISSUER_PUBLIC, NET_PASS,
} from './config.js';

// ─── Stellar helpers ───────────────────────────────────────────────────────────
// The anchor holds a USDC float and TRANSFERS real USDC (it does not mint).
// Deposit = treasury → user; withdrawal detection/payout is Phase C.

const horizon = new Horizon.Server(HORIZON_URL);
const usdcAsset = () => new Asset(ASSET_CODE, ASSET_ISSUER_PUBLIC);

// Deterministic memo derived from the transaction id. On withdrawal the Platform
// stores it and the Observer matches the incoming USDC payment by it.
export function generateMemo(transactionId: string): string {
  return transactionId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

// The anchor's USDC float. Returns the balance string, '0' if the trustline exists
// but is empty, or null if the treasury isn't set / has no USDC trustline.
export async function getTreasuryUsdcBalance(): Promise<string | null> {
  if (!TREASURY_PUBLIC) return null;
  const account = await horizon.loadAccount(TREASURY_PUBLIC);
  const bal = account.balances.find(
    (b: any) => b.asset_code === ASSET_CODE && b.asset_issuer === ASSET_ISSUER_PUBLIC,
  );
  return bal ? bal.balance : null;
}

// Treasury balances (XLM + USDC) for the operator dashboard.
export async function getTreasuryBalances(): Promise<{ xlm: string | null; usdc: string | null }> {
  if (!TREASURY_PUBLIC) return { xlm: null, usdc: null };
  const account = await horizon.loadAccount(TREASURY_PUBLIC);
  const xlm = account.balances.find((b: any) => b.asset_type === 'native')?.balance ?? null;
  const usdc = account.balances.find(
    (b: any) => b.asset_code === ASSET_CODE && b.asset_issuer === ASSET_ISSUER_PUBLIC,
  )?.balance ?? null;
  return { xlm, usdc };
}

// Reserve guardrail — refuse to release USDC the treasury float can't cover.
// This is what makes the anchor a liquidity provider rather than a minter.
export async function assertTreasuryReserve(amount: string): Promise<void> {
  const bal = await getTreasuryUsdcBalance();
  if (bal === null) throw new Error('treasury has no USDC trustline — run scripts/fund-treasury.mjs');
  if (Number(bal) < Number(amount)) {
    throw new Error(`insufficient USDC float: treasury holds ${bal}, deposit needs ${amount}`);
  }
}

// Does the recipient have a USDC trustline? A payment to an account without one
// fails; a real wallet establishes it before deposit. We surface a clear error.
export async function hasUsdcTrustline(account: string): Promise<boolean> {
  try {
    const acct = await horizon.loadAccount(account);
    return acct.balances.some(
      (b: any) => b.asset_code === ASSET_CODE && b.asset_issuer === ASSET_ISSUER_PUBLIC,
    );
  } catch {
    return false; // account not found / unfunded
  }
}

// Deposit on-ramp: transfer USDC from the treasury float to the user.
// The payment carries a deterministic text memo (derived from the SEP transaction
// id) so a landed-but-unrecorded transfer can later be found on-chain by
// `findTreasuryPayment` — this is what makes the release idempotent and
// crash-recoverable (see releases.ts). The memo is optional so older callers /
// tests still work, but the release path always passes it.
export async function sendUsdc(destination: string, amount: string, memo?: string): Promise<string> {
  if (!TREASURY_SECRET) throw new Error('TREASURY_SECRET not set');
  const keypair = Keypair.fromSecret(TREASURY_SECRET);
  const account = await horizon.loadAccount(TREASURY_PUBLIC);
  const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NET_PASS })
    .addOperation(Operation.payment({ destination, asset: usdcAsset(), amount }))
    .setTimeout(30);
  if (memo) builder.addMemo(Memo.text(memo));
  const tx = builder.build();
  tx.sign(keypair);
  const result = await horizon.submitTransaction(tx);
  return (result as any).hash;
}

// Reconciliation lookup: has THIS deposit already been paid out on-chain?
// Answers "did the money leave?" without guessing — we scan the treasury's recent
// transactions for one whose text memo matches, then confirm it contains a payment
// of `amount` USDC to `destination`. Returns the settling tx hash, or null.
//
// Bounded to the most recent `SCAN_LIMIT` treasury transactions: reconciliation
// runs seconds-to-minutes after a submit (crash recovery), so the transaction is
// always in the recent window. A high-volume production treasury would page with a
// stored cursor instead — noted as a scaling follow-up.
const SCAN_LIMIT = 50;
export async function findTreasuryPayment(
  destination: string,
  amount: string,
  memo: string,
): Promise<{ hash: string } | null> {
  if (!TREASURY_PUBLIC) return null;
  const page = await horizon
    .transactions()
    .forAccount(TREASURY_PUBLIC)
    .order('desc')
    .limit(SCAN_LIMIT)
    .call();

  for (const rec of page.records) {
    if (!rec.successful || rec.memo_type !== 'text' || rec.memo !== memo) continue;
    // Memo matched — confirm the operation actually paid the expected amount/asset
    // to the expected destination (memo alone is not proof of the exact transfer).
    const ops = await rec.operations();
    const paid = ops.records.some(
      (o: any) =>
        o.type === 'payment' &&
        o.to === destination &&
        o.asset_code === ASSET_CODE &&
        o.asset_issuer === ASSET_ISSUER_PUBLIC &&
        Number(o.amount) === Number(amount),
    );
    if (paid) return { hash: rec.hash };
  }
  return null;
}

// Mirror of findTreasuryPayment for the OFF-ramp: has the user's asset arrived AT the
// treasury for this withdrawal? Matches the incoming payment by memo + exact amount/asset.
// Used by the withdrawal poller to detect the transfer itself when the Anchor Platform
// Observer can't advance the tx (e.g. AP events disabled) — so off-ramp completes without
// depending on the AP event pipeline. Confirming amount+asset+memo (not memo alone) keeps
// it safe against an unrelated payment that happens to reuse a memo.
export async function findIncomingWithdrawal(
  amount: string,
  memo: string,
): Promise<{ hash: string } | null> {
  if (!TREASURY_PUBLIC) return null;
  const page = await horizon
    .transactions()
    .forAccount(TREASURY_PUBLIC)
    .order('desc')
    .limit(SCAN_LIMIT)
    .call();

  for (const rec of page.records) {
    if (!rec.successful || rec.memo_type !== 'text' || rec.memo !== memo) continue;
    const ops = await rec.operations();
    const received = ops.records.some(
      (o: any) =>
        o.type === 'payment' &&
        o.to === TREASURY_PUBLIC &&
        o.asset_code === ASSET_CODE &&
        o.asset_issuer === ASSET_ISSUER_PUBLIC &&
        Number(o.amount) === Number(amount),
    );
    if (received) return { hash: rec.hash };
  }
  return null;
}
