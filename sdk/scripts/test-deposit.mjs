/**
 * Phase B smoke test — full USDC on-ramp end to end.
 *
 *   1. Generate + fund a user keypair; add a USDC trustline.
 *   2. SEP-10 auth → JWT.
 *   3. SEP-24 deposit interactive for N USDC.
 *   4. POST the business-server /interactive/complete (simulate the user confirm).
 *   5. Assert the user's on-chain USDC balance increased by N (real transfer).
 *
 * Env: SEP_URL (default :8080), BIZ_URL (default :3000), USDC_AMOUNT (default 10).
 *
 *   BIZ_URL=http://localhost:3005 node scripts/test-deposit.mjs
 */

import {
  Keypair, Transaction, Networks, Horizon, TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';

const SEP_URL = process.env.SEP_URL ?? 'http://localhost:8080';
const BIZ_URL = process.env.BIZ_URL ?? 'http://localhost:3000';
const AMOUNT  = process.env.USDC_AMOUNT ?? '10';
const ISSUER  = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON = 'https://horizon-testnet.stellar.org';
const usdc = new Asset('USDC', ISSUER);
const server = new Horizon.Server(HORIZON);

const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };

console.log('=== Phase B deposit smoke test (INR -> USDC) ===\n');

// 1. user + fund + USDC trustline
const user = Keypair.random();
console.log(`Step 1: user ${user.publicKey()}`);
if (!(await fetch(`https://friendbot.stellar.org?addr=${user.publicKey()}`)).ok) fail('Friendbot');
const ua = await server.loadAccount(user.publicKey());
const trust = new TransactionBuilder(ua, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.changeTrust({ asset: usdc, limit: '1000000' })).setTimeout(30).build();
trust.sign(user);
await server.submitTransaction(trust);
ok('funded + USDC trustline');

// 2. SEP-10
console.log('\nStep 2: SEP-10');
const { transaction: ch, network_passphrase } = await (await fetch(`${SEP_URL}/auth?account=${user.publicKey()}`)).json();
const chtx = new Transaction(ch, network_passphrase ?? Networks.TESTNET);
chtx.sign(user);
const { token } = await (await fetch(`${SEP_URL}/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction: chtx.toXDR() }),
})).json();
if (!token) fail('no JWT');
ok('JWT');

// 3. SEP-24 deposit interactive
console.log(`\nStep 3: SEP-24 deposit interactive (${AMOUNT} USDC)`);
const dep = await (await fetch(`${SEP_URL}/sep24/transactions/deposit/interactive`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ asset_code: 'USDC', account: user.publicKey(), amount: AMOUNT }),
})).json();
if (!dep.id) fail(`deposit init: ${JSON.stringify(dep)}`);
ok(`tx ${dep.id}`);

// 4. confirm (business-server complete) — triggers the real USDC transfer
console.log('\nStep 4: confirm → business-server releases USDC');
const comp = await fetch(`${BIZ_URL}/sep24/interactive/complete`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ transaction_id: dep.id }),
});
const compBody = await comp.text();
if (!comp.ok) fail(`complete ${comp.status}: ${compBody.slice(0, 300)}`);
ok('complete returned 200');

// 5. assert on-chain receipt
console.log('\nStep 5: verify on-chain USDC receipt');
let received = '0';
for (let i = 0; i < 10; i++) {
  const bal = (await server.loadAccount(user.publicKey())).balances
    .find((b) => b.asset_code === 'USDC' && b.asset_issuer === ISSUER);
  received = bal?.balance ?? '0';
  if (Number(received) >= Number(AMOUNT)) break;
  await new Promise((r) => setTimeout(r, 2000));
}
if (Number(received) < Number(AMOUNT)) fail(`user USDC balance ${received}, expected >= ${AMOUNT}`);
ok(`user received ${received} USDC`);

console.log('\n=== Phase B deposit: PASS ===');
console.log(`Real USDC moved treasury → user for the INR on-ramp (rate applied to amount_in).`);
