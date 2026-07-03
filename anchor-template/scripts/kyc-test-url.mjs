/**
 * KYC manual-test helper — mints a real SEP-24 interactive URL and STOPS.
 *
 * Unlike test-deposit.mjs (which auto-confirms and bypasses the DIDIT gate),
 * this just gives you a browser-openable URL so you can exercise the real KYC
 * flow: gate → DIDIT iframe/new-tab → webhook → gate opens → money screen.
 *
 *   1. Generate + fund a user keypair; add a USDC trustline.
 *   2. SEP-10 auth → JWT.
 *   3. SEP-24 deposit (or withdrawal) interactive → print the URL + account.
 *
 * Env: SEP_URL (default :8080), USDC_AMOUNT (default 10), KIND (deposit|withdrawal).
 *
 *   node scripts/kyc-test-url.mjs
 *   KIND=withdrawal node scripts/kyc-test-url.mjs
 */

import {
  Keypair, Transaction, Networks, Horizon, TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';

const SEP_URL = process.env.SEP_URL ?? 'http://localhost:8080';
const AMOUNT  = process.env.USDC_AMOUNT ?? '10';
const KIND    = (process.env.KIND ?? 'deposit').toLowerCase();
const ISSUER  = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON = 'https://horizon-testnet.stellar.org';
const usdc = new Asset('USDC', ISSUER);
const server = new Horizon.Server(HORIZON);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };

console.log(`=== KYC interactive-URL helper (${KIND}) ===\n`);

// 1. user + fund + USDC trustline
const user = Keypair.random();
console.log(`Step 1: user ${user.publicKey()}`);
if (!(await fetch(`https://friendbot.stellar.org?addr=${user.publicKey()}`)).ok) fail('Friendbot');
const ua = await server.loadAccount(user.publicKey());
const trust = new TransactionBuilder(ua, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.changeTrust({ asset: usdc, limit: '1000000' })).setTimeout(30).build();
trust.sign(user);
await server.submitTransaction(trust);
console.log('  ✓ funded + USDC trustline');

// 2. SEP-10
const { transaction: ch, network_passphrase } = await (await fetch(`${SEP_URL}/auth?account=${user.publicKey()}`)).json();
const chtx = new Transaction(ch, network_passphrase ?? Networks.TESTNET);
chtx.sign(user);
const { token } = await (await fetch(`${SEP_URL}/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction: chtx.toXDR() }),
})).json();
if (!token) fail('no JWT');
console.log('  ✓ SEP-10 JWT');

// 3. SEP-24 interactive (no auto-complete — that is the whole point)
const dep = await (await fetch(`${SEP_URL}/sep24/transactions/${KIND}/interactive`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ asset_code: 'USDC', account: user.publicKey(), amount: AMOUNT }),
})).json();
if (!dep.id) fail(`interactive init: ${JSON.stringify(dep)}`);

console.log(`\n  tx id  : ${dep.id}`);
console.log(`  account: ${user.publicKey()}   ← DIDIT vendor_data`);
console.log(`\n  OPEN THIS IN A BROWSER:\n\n    ${dep.url}\n`);
console.log('Watch: ngrok inspector http://localhost:4040 · logs `docker compose logs -f business-server`');
