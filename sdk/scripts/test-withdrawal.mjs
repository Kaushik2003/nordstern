/**
 * Phase C smoke test — full USDC off-ramp end to end.
 *
 *   1. Generate a user with USDC (Friendbot XLM + trustline + DEX swap).
 *   2. SEP-10 → JWT.
 *   3. SEP-24 withdraw interactive → tx id.
 *   4. POST business-server /interactive/complete → pending_user_transfer_start + memo.
 *   5. Send USDC to the treasury with that memo.
 *   6. AP Observer detects it → pending_anchor → poller pays INR → completed.
 *   7. Assert the tx completes with amount_out in INR.
 *
 * Env: SEP_URL (:8080), BIZ_URL (:3000), PLATFORM_URL (:8085), USDC_AMOUNT (10).
 *
 *   BIZ_URL=http://localhost:3005 PLATFORM_URL=http://localhost:8085 node scripts/test-withdrawal.mjs
 */

import {
  Keypair, Transaction, Networks, Horizon, TransactionBuilder, BASE_FEE, Operation, Asset, Memo,
} from '@stellar/stellar-sdk';

const SEP_URL      = process.env.SEP_URL ?? 'http://localhost:8080';
const BIZ_URL      = process.env.BIZ_URL ?? 'http://localhost:3000';
const PLATFORM_URL = process.env.PLATFORM_URL ?? 'http://localhost:8085';
const AMOUNT  = process.env.USDC_AMOUNT ?? '10';
const ISSUER  = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON = 'https://horizon-testnet.stellar.org';
const PASS = Networks.TESTNET;
const usdc = new Asset('USDC', ISSUER);
const server = new Horizon.Server(HORIZON);
const memoFor = (id) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submit(builderFn, signer) {
  const account = await server.loadAccount(signer.publicKey());
  const tx = builderFn(new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASS })).setTimeout(60).build();
  tx.sign(signer);
  return server.submitTransaction(tx);
}

console.log('=== Phase C withdrawal smoke test (USDC -> INR) ===\n');

// 1. user with USDC (Friendbot + trustline + DEX swap XLM->USDC)
const user = Keypair.random();
console.log(`Step 1: user ${user.publicKey()}`);
if (!(await fetch(`https://friendbot.stellar.org?addr=${user.publicKey()}`)).ok) fail('Friendbot');
await submit((b) => b.addOperation(Operation.changeTrust({ asset: usdc, limit: '1000000' })), user);
const rec = (await (await fetch(`${HORIZON}/paths/strict-send?source_asset_type=native&source_amount=40&destination_assets=USDC%3A${ISSUER}`)).json())._embedded?.records?.[0];
if (!rec) fail('no XLM->USDC path to seed user');
await submit((b) => b.addOperation(Operation.pathPaymentStrictSend({
  sendAsset: Asset.native(), sendAmount: '40', destination: user.publicKey(), destAsset: usdc,
  destMin: (Number(rec.destination_amount) * 0.9).toFixed(7),
  path: rec.path.map((p) => (p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code, p.asset_issuer))),
})), user);
ok('user holds USDC');

// 2. SEP-10
console.log('\nStep 2: SEP-10');
const { transaction: ch, network_passphrase } = await (await fetch(`${SEP_URL}/auth?account=${user.publicKey()}`)).json();
const chtx = new Transaction(ch, network_passphrase ?? PASS);
chtx.sign(user);
const { token } = await (await fetch(`${SEP_URL}/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction: chtx.toXDR() }),
})).json();
if (!token) fail('no JWT');
ok('JWT');

// 3. SEP-24 withdraw interactive
console.log(`\nStep 3: SEP-24 withdraw interactive (${AMOUNT} USDC)`);
const wd = await (await fetch(`${SEP_URL}/sep24/transactions/withdraw/interactive`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ asset_code: 'USDC', account: user.publicKey(), amount: AMOUNT }),
})).json();
if (!wd.id) fail(`withdraw init: ${JSON.stringify(wd)}`);
ok(`tx ${wd.id}`);

// 4. confirm → pending_user_transfer_start + memo
console.log('\nStep 4: confirm (business-server) → pending_user_transfer_start');
const c = await fetch(`${BIZ_URL}/sep24/interactive/complete`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ transaction_id: wd.id }),
});
if (!c.ok) fail(`complete ${c.status}: ${(await c.text()).slice(0, 200)}`);
ok('confirmed');

// 5. send USDC back to the treasury with the memo
console.log('\nStep 5: send USDC to treasury with memo');
const treasury = (await (await fetch(`${BIZ_URL}/health`)).json()).treasury;
const memo = memoFor(wd.id);
await submit((b) => b.addOperation(Operation.payment({ destination: treasury, asset: usdc, amount: AMOUNT })).addMemo(Memo.text(memo)), user);
ok(`sent ${AMOUNT} USDC to ${treasury.slice(0, 8)}... memo ${memo}`);

// 6/7. wait for Observer → poller → completed
console.log('\nStep 6: waiting for detection + payout...');
let status = '';
let tx = {};
for (let i = 0; i < 40; i++) {
  tx = await (await fetch(`${PLATFORM_URL}/transactions/${wd.id}`)).json();
  status = tx.status;
  if (i % 4 === 0) console.log(`  … status=${status}`);
  if (status === 'completed') break;
  if (status === 'error') fail(`tx errored: ${tx.message ?? ''}`);
  await sleep(4000);
}
if (status !== 'completed') fail(`not completed after wait (last status=${status})`);
ok(`completed — amount_in ${tx.amount_in?.amount} ${tx.amount_in?.asset}, amount_out ${tx.amount_out?.amount} ${tx.amount_out?.asset}`);

console.log('\n=== Phase C withdrawal: PASS ===');
console.log('USDC returned → Observer detected → INR paid out (mock) → completed.');
