import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { startTestDb, type TestDb } from './_harness.js';

// ─── Withdrawal payout money-flow tests (R6 M3) ──────────────────────────────────
// Real Postgres + real poller.ts. Only the Anchor Platform (platform.js) and the
// payout PSP (adapters) are stubbed. Invariant: fiat is disbursed AT MOST ONCE per
// withdrawal, regardless of re-listing, races, crashes, or retries.

const h = vi.hoisted(() => ({
  quote: vi.fn(),
  disburse: vi.fn(),
  patchTransaction: vi.fn(),
  fetchTransaction: vi.fn(),
  listTransactions: vi.fn(),
}));

vi.mock('../adapters/index.js', () => ({
  rate: { quote: h.quote },
  payout: { disburse: h.disburse },
  deposit: {},
}));
vi.mock('../platform.js', () => ({
  patchTransaction: h.patchTransaction,
  fetchTransaction: h.fetchTransaction,
  listTransactions: h.listTransactions,
}));

let tdb: TestDb;
let pool: Pool;
let processWithdrawal: typeof import('../poller.js').processWithdrawal;

const tx = (id: string) => ({
  id,
  kind: 'withdrawal',
  status: 'pending_anchor',
  amount_expected: { amount: '10.00' },
  destination_account: 'bank-' + id,
});

const rowOf = async (id: string) =>
  (await pool.query('SELECT status, reference FROM nordstern.withdrawal_payouts WHERE transaction_id=$1', [id])).rows[0];

beforeAll(async () => {
  tdb = await startTestDb();
  pool = tdb.pool;
  ({ processWithdrawal } = await import('../poller.js'));
}, 180_000);

afterAll(async () => {
  await tdb?.stop();
});

beforeEach(async () => {
  await pool.query('TRUNCATE nordstern.withdrawal_payouts');
  h.quote.mockReset().mockResolvedValue({ inrPerUsdc: '85' });
  h.disburse.mockReset().mockResolvedValue({ status: 'completed', reference: 'PAYOUT_REF' });
  h.patchTransaction.mockReset().mockResolvedValue(undefined);
  h.fetchTransaction.mockReset().mockResolvedValue({ status: 'pending_anchor' });
  h.listTransactions.mockReset().mockResolvedValue([]);
});

describe('withdrawal payout — at-most-once', () => {
  it('happy path: disburses once and completes', async () => {
    await processWithdrawal(tx('w1'));
    expect(h.disburse).toHaveBeenCalledTimes(1);
    const r = await rowOf('w1');
    expect(r.status).toBe('completed');
    expect(r.reference).toBe('PAYOUT_REF');
  });

  it('DUPLICATE (re-listed) withdrawal never pays twice', async () => {
    await processWithdrawal(tx('w2'));
    await processWithdrawal(tx('w2')); // AP re-lists a completed withdrawal
    expect(h.disburse).toHaveBeenCalledTimes(1); // fiat moved exactly once
  });

  it('DUPLICATE (concurrent race) never pays twice', async () => {
    await Promise.all([processWithdrawal(tx('w3')), processWithdrawal(tx('w3'))]);
    expect(h.disburse).toHaveBeenCalledTimes(1);
    expect((await rowOf('w3')).status).toBe('completed');
  });

  it('IDEMPOTENT: an already-completed payout self-heals AP without re-paying', async () => {
    await pool.query(
      `INSERT INTO nordstern.withdrawal_payouts (transaction_id, amount_usdc, amount_inr, status, reference)
       VALUES ('w4','10.00','850.00','completed','OLD_REF')`,
    );
    h.fetchTransaction.mockResolvedValue({ status: 'pending_anchor' }); // AP patch never landed
    await processWithdrawal(tx('w4'));
    expect(h.disburse).not.toHaveBeenCalled();          // never re-pays
    expect(h.patchTransaction).toHaveBeenCalled();       // but does re-complete AP
  });

  it('FAILURE recovery: a failed payout is left re-drivable, then succeeds once', async () => {
    h.disburse
      .mockResolvedValueOnce({ status: 'failed', message: 'bank timeout' })
      .mockResolvedValue({ status: 'completed', reference: 'PAYOUT_2' });

    await processWithdrawal(tx('w5'));                    // payout fails
    expect((await rowOf('w5')).status).toBe('failed');

    await processWithdrawal(tx('w5'));                    // next tick reclaims + retries
    const r = await rowOf('w5');
    expect(r.status).toBe('completed');
    expect(r.reference).toBe('PAYOUT_2');
    expect(h.disburse).toHaveBeenCalledTimes(2);          // 1 failed + 1 successful; money moved once
  });
});
