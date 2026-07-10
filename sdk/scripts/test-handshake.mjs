/**
 * Phase A smoke test — proves the SEP-10 → SEP-24 handshake end to end.
 *
 *   1. Generate + fund a user keypair (Friendbot).
 *   2. SEP-10: fetch the auth challenge, sign it, exchange for a JWT.
 *   3. SEP-24: request a deposit interactive URL for USDC.
 *   4. Load the business-server interactive page (reads the tx from Platform API).
 *
 * It does NOT move USDC — that is Phase B. Env: SEP_URL (default :8080),
 * BIZ_URL (default :3000; set to your BIZ_HOST_PORT during coexistence runs).
 *
 *   node scripts/test-handshake.mjs
 */

import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

const SEP_URL = process.env.SEP_URL ?? 'http://localhost:8080';
const BIZ_URL = process.env.BIZ_URL ?? 'http://localhost:3000';
const ASSET_CODE = 'USDC';

const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };

console.log('=== Phase A handshake smoke test ===\n');

// 1. User keypair + fund
const user = Keypair.random();
console.log(`Step 1: user ${user.publicKey()}`);
const fb = await fetch(`https://friendbot.stellar.org?addr=${user.publicKey()}`);
if (!fb.ok) fail(`Friendbot: ${await fb.text()}`);
ok('funded via Friendbot');

// 2. SEP-10
console.log('\nStep 2: SEP-10 auth');
const chRes = await fetch(`${SEP_URL}/auth?account=${user.publicKey()}`);
if (!chRes.ok) fail(`GET /auth ${chRes.status}: ${await chRes.text()}`);
const { transaction: challengeXdr, network_passphrase } = await chRes.json();
ok('received challenge');

const tx = new Transaction(challengeXdr, network_passphrase ?? Networks.TESTNET);
tx.sign(user);

const tokRes = await fetch(`${SEP_URL}/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transaction: tx.toXDR() }),
});
if (!tokRes.ok) fail(`POST /auth ${tokRes.status}: ${await tokRes.text()}`);
const { token } = await tokRes.json();
if (!token) fail('no JWT returned');
ok(`got JWT (${token.slice(0, 12)}...)`);

// 3. SEP-24 deposit interactive
console.log('\nStep 3: SEP-24 deposit interactive');
const depRes = await fetch(`${SEP_URL}/sep24/transactions/deposit/interactive`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ asset_code: ASSET_CODE, account: user.publicKey() }),
});
if (!depRes.ok) fail(`POST deposit/interactive ${depRes.status}: ${await depRes.text()}`);
const dep = await depRes.json();
if (!dep.url || !dep.id) fail(`unexpected response: ${JSON.stringify(dep)}`);
ok(`interactive url + tx id (${dep.id})`);

// 4. Load the business-server interactive page (rewrite host to BIZ_URL).
console.log('\nStep 4: business-server interactive page');
const interactive = new URL(dep.url);
const target = `${BIZ_URL}${interactive.pathname}${interactive.search}`;
const pageRes = await fetch(target);
const body = await pageRes.text();
if (!pageRes.ok) fail(`GET interactive ${pageRes.status}: ${body.slice(0, 200)}`);
if (!body.includes(dep.id)) fail('interactive page did not render the transaction id');
if (!body.includes(ASSET_CODE)) fail('interactive page did not render the asset');
ok('interactive page rendered the tx read from the Platform API');

console.log('\n=== Phase A handshake: PASS ===');
console.log('SEP-10 auth → SEP-24 deposit → interactive read of Platform API all work.');
