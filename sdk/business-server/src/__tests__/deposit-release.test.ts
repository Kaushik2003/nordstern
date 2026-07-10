import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { startTestDb, type TestDb } from './_harness.js';

// ─── Deposit release money-flow tests (R6 M3) ───────────────────────────────────
// Real Postgres + real releases.ts. Only the external money boundaries are stubbed:
// the Stellar chain (stellar.js) and the Anchor Platform (platform.js). We assert on
// OBSERVABLE behavior — how many times money actually moved (sendUsdc call count) and
// the durable row state — never on internals.
//
// The invariant under test: a deposit's USDC can be sent AT MOST ONCE, no matter how
// many times the release is triggered, retried, raced, or crash-recovered.

const h = vi.hoisted(() => ({
  sendUsdc: vi.fn(),
  findTreasuryPayment: vi.fn(),
  assertTreasuryReserve: vi.fn(),
  patchTransaction: vi.fn(),
  fetchTransaction: vi.fn(),
}));

vi.mock('../stellar.js', () => ({
  sendUsdc: h.sendUsdc,
  findTreasuryPayment: h.findTreasuryPayment,
  assertTreasuryReserve: h.assertTreasuryReserve,
}));
vi.mock('../platform.js', () => ({
  patchTransaction: h.patchTransaction,
  fetchTransaction: h.fetchTransaction,
  listTransactions: vi.fn(async () => []),
}));

let tdb: TestDb;
let pool: Pool;
let executeRelease: typeof import('../releases.js').executeRelease;
let reconcileDepositReleases: typeof import('../releases.js').reconcileDepositReleases;

const params = (id: string) => ({
  transactionId: id,
  destination: 'GDEST_' + id,
  usdcAmount: '10.00',
  inrAmount: '850.00',
  inrPerUsdc: '85',
  rateSource: 'test',
  memo: 'memo-' + id,
});

const statusOf = async (id: string): Promise<string | undefined> =>
  (await pool.query('SELECT status FROM nordstern.deposit_releases WHERE transaction_id=$1', [id]))
    .rows[0]?.status;

const insertRow = (id: string, status: string, hash: string | null, attempts = 1) =>
  pool.query(
    `INSERT INTO nordstern.deposit_releases
       (transaction_id,destination,amount_usdc,amount_inr,inr_per_usdc,rate_source,memo,status,stellar_tx_hash,attempts)
     VALUES ($1,$2,'10.00','850.00','85','test',$3,$4,$5,$6)`,
    [id, 'GDEST_' + id, 'memo-' + id, status, hash, attempts],
  );

const makeStale = (id: string) =>
  pool.query(`UPDATE nordstern.deposit_releases SET updated_at = now() - interval '60 seconds' WHERE transaction_id=$1`, [id]);

beforeAll(async () => {
  tdb = await startTestDb();
  pool = tdb.pool;
  ({ executeRelease, reconcileDepositReleases } = await import('../releases.js'));
}, 180_000);

afterAll(async () => {
  await tdb?.stop();
});

beforeEach(async () => {
  await pool.query('TRUNCATE nordstern.deposit_releases');
  h.sendUsdc.mockReset().mockResolvedValue('HASH_NEW');
  h.findTreasuryPayment.mockReset().mockResolvedValue(null);
  h.assertTreasuryReserve.mockReset().mockResolvedValue(undefined);
  h.patchTransaction.mockReset().mockResolvedValue(undefined);
  h.fetchTransaction.mockReset().mockResolvedValue({ status: 'pending_user_transfer_start' });
});

describe('deposit release — at-most-once', () => {
  it('happy path: sends once and completes', async () => {
    const out = await executeRelease(params('d1'));
    expect(out).toEqual({ kind: 'released', hash: 'HASH_NEW' });
    expect(h.sendUsdc).toHaveBeenCalledTimes(1);
    expect(await statusOf('d1')).toBe('completed');
  });

  it('DUPLICATE request (sequential) never sends twice', async () => {
    const first = await executeRelease(params('d2'));
    const second = await executeRelease(params('d2'));
    expect(first.kind).toBe('released');
    expect(second).toEqual({ kind: 'already', hash: 'HASH_NEW' });
    expect(h.sendUsdc).toHaveBeenCalledTimes(1); // money moved exactly once
  });

  it('DUPLICATE request (concurrent race) never sends twice', async () => {
    const [a, b] = await Promise.all([executeRelease(params('d3')), executeRelease(params('d3'))]);
    const kinds = [a.kind, b.kind].sort();
    // one wins the claim and releases; the other is guarded (in_flight or already)
    expect(kinds).toContain('released');
    expect(h.sendUsdc).toHaveBeenCalledTimes(1); // the atomic claim held under the race
    expect(await statusOf('d3')).toBe('completed');
  });

  it('RETRY after completion is a no-op send', async () => {
    await executeRelease(params('d4'));
    h.sendUsdc.mockClear();
    const retry = await executeRelease(params('d4'));
    expect(retry.kind).toBe('already');
    expect(h.sendUsdc).not.toHaveBeenCalled();
  });

  it('IDEMPOTENT send: adopts an already-landed transfer instead of resending', async () => {
    h.findTreasuryPayment.mockResolvedValue({ hash: 'ADOPTED_HASH' });
    const out = await executeRelease(params('d5'));
    expect(out).toEqual({ kind: 'released', hash: 'ADOPTED_HASH' });
    expect(h.sendUsdc).not.toHaveBeenCalled(); // adopted the on-chain transfer, did not resend
    expect(await statusOf('d5')).toBe('completed');
  });

  it('RESTART recovery: a crash-left "submitted" row finishes without resending', async () => {
    // Simulate a crash between sendUsdc and AP completion: row exists as 'submitted'.
    await insertRow('d6', 'submitted', 'PRIOR_HASH');
    const out = await executeRelease(params('d6'));
    expect(out).toEqual({ kind: 'already', hash: 'PRIOR_HASH' });
    expect(h.sendUsdc).not.toHaveBeenCalled(); // never re-sends a transfer already on the chain
    expect(await statusOf('d6')).toBe('completed');
  });

  it('TREASURY reserve guard blocks the send and marks failed', async () => {
    h.assertTreasuryReserve.mockRejectedValue(new Error('insufficient reserve'));
    await expect(executeRelease(params('d7'))).rejects.toThrow(/insufficient reserve/);
    expect(h.sendUsdc).not.toHaveBeenCalled();
    expect(await statusOf('d7')).toBe('failed');
  });
});

describe('deposit reconciler — safe recovery under failure', () => {
  it('FAILURE recovery: a failed release is re-driven and completes (money moves once)', async () => {
    // Inject a transient send failure, then let recovery succeed.
    h.sendUsdc.mockRejectedValueOnce(new Error('network blip')).mockResolvedValue('HASH_RETRY');
    await expect(executeRelease(params('d8'))).rejects.toThrow(/network blip/);
    expect(await statusOf('d8')).toBe('failed');
    expect(h.sendUsdc).toHaveBeenCalledTimes(1);

    await makeStale('d8');
    await reconcileDepositReleases(); // not on-chain → re-drives once
    expect(await statusOf('d8')).toBe('completed');
    expect(h.sendUsdc).toHaveBeenCalledTimes(2); // 1 failed attempt + 1 successful re-drive
  });

  it('RECONCILER adopts an on-chain transfer for a stuck row without resending', async () => {
    // A row stuck in 'submitting' (crash before recording the hash), but the transfer DID land.
    await insertRow('d9', 'submitting', null);
    await makeStale('d9');
    h.findTreasuryPayment.mockResolvedValue({ hash: 'ONCHAIN_HASH' });

    await reconcileDepositReleases();
    expect(h.sendUsdc).not.toHaveBeenCalled(); // adopted, never double-sent
    expect(await statusOf('d9')).toBe('completed');
  });
});
