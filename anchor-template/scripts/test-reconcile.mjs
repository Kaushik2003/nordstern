/**
 * Money-safety live test (real testnet + ephemeral Postgres) — proves the OUTBOX
 * RECONCILER recovers the dangerous crash: the USDC left the treasury but the process
 * died BEFORE recording the hash / completing the Platform transaction. On restart the
 * reconciler must find the transfer on-chain, ADOPT its hash, and complete the tx —
 * with NO second transfer (no double-spend).
 *
 * Infra: DATABASE_URL (an ephemeral PG) comes from the environment; a tiny in-process
 * Platform-API stub stands in for the AP; a real testnet self-payment simulates the
 * "already sent but unrecorded" transfer.
 *
 *   DATABASE_URL=postgres://... ./business-server/node_modules/.bin/tsx scripts/test-reconcile.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import http from 'http';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

const TREASURY = process.env.TREASURY_PUBLIC;
const AMOUNT = '0.01';
const txId = `recon-${randomUUID()}`;

// ── In-process Platform-API stub (stands in for the AP) ─────────────────────────
let patched = null;
const stub = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/transactions/')) {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ id: txId, status: 'pending_anchor', kind: 'deposit', destination_account: TREASURY }));
  } else if (req.method === 'PATCH' && req.url.startsWith('/transactions')) {
    let body = ''; req.on('data', (d) => (body += d));
    req.on('end', () => { try { patched = JSON.parse(body); } catch { /* ignore */ } res.end('{}'); });
  } else { res.statusCode = 404; res.end('{}'); }
});
await new Promise((r) => stub.listen(0, r));
process.env.PLATFORM_API_URL = `http://127.0.0.1:${stub.address().port}`;

// Import AFTER env is set — config/db/platform read env at import time.
const { sendUsdc, findTreasuryPayment, generateMemo } = await import('../business-server/src/stellar.ts');
const { initSchema, pool } = await import('../business-server/src/db.ts');
const { reconcileDepositReleases } = await import('../business-server/src/releases.ts');

const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('=== Reconciler crash-recovery live test (testnet + PG) ===\n');
await initSchema();
ok('outbox schema created in ephemeral Postgres');

const memo = generateMemo(txId);

// 1. Simulate the pre-crash transfer: a REAL on-chain send that "already happened".
const hash = await sendUsdc(TREASURY, AMOUNT, memo);
ok(`simulated pre-crash transfer sent on-chain: ${hash}`);
let indexed = null;
for (let i = 0; i < 6 && !indexed; i++) { indexed = await findTreasuryPayment(TREASURY, AMOUNT, memo); if (!indexed) await sleep(5000); }
if (!indexed) fail('transfer not indexed by Horizon in time');
ok('transfer confirmed visible on-chain');

// 2. Seed the crashed outbox row: status 'submitting', NO hash, stale (past the
//    reconciler grace window) — exactly the state a crash-after-send leaves behind.
await pool.query(
  `INSERT INTO nordstern.deposit_releases
     (transaction_id, destination, amount_usdc, amount_inr, inr_per_usdc, rate_source, memo, status, updated_at)
   VALUES ($1,$2,$3,$4,$5,$6,$7,'submitting', now() - interval '60 seconds')`,
  [txId, TREASURY, AMOUNT, '0.85', '85', 'test', memo],
);
ok("seeded crashed release row (status='submitting', no hash)");

// 3. Run the reconciler.
await reconcileDepositReleases();

// 4. Assert full recovery: row completed + hash adopted + AP PATCHed to completed.
const { rows } = await pool.query(
  'SELECT status, stellar_tx_hash FROM nordstern.deposit_releases WHERE transaction_id=$1', [txId],
);
const row = rows[0];
if (!row) fail('outbox row disappeared');
if (row.status !== 'completed') fail(`expected status 'completed', got '${row.status}'`);
if (row.stellar_tx_hash !== hash) fail(`expected adopted on-chain hash ${hash}, got ${row.stellar_tx_hash}`);
ok('reconciler adopted the on-chain hash and marked the row completed');

const patchedStatus = patched?.records?.[0]?.transaction?.status;
if (patchedStatus !== 'completed') fail(`Platform API not completed (patched: ${JSON.stringify(patched)})`);
ok('reconciler completed the Platform transaction (PATCH status=completed)');

console.log('\n✅ Crash-after-send recovered automatically:');
console.log('   the reconciler found the transfer on-chain, adopted its hash (NO second send),');
console.log('   and completed the Platform transaction. This is the double-spend window, closed.\n');

await pool.end();
stub.close();
process.exit(0);
