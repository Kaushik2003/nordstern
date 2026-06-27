/**
 * Simulates a wallet doing a SEP-24 withdrawal.
 *
 * What this script does:
 *   1. SEP-10 authentication as the test user (who has ANCH from Stage 4)
 *   2. Initiates a SEP-24 withdrawal
 *   3. Simulates the user submitting the interactive form
 *   4. Sends ANCH from test user → Distribution account on Stellar (the "withdrawal transfer")
 *   5. Polls the Platform API until the Observer detects the payment and the poller completes it
 *
 * Run from project root:
 *   node scripts/test-withdrawal.mjs
 *
 * Requires: test user from the Stage 4 deposit still has ANCH.
 * If not, run test-deposit.mjs first to get a fresh funded user.
 */

import {
  Keypair, Networks, Horizon, Memo,
  TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

// ─── Load env ─────────────────────────────────────────────────────────────────

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => {
        const eq = l.indexOf('=');
        return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1')];
      })
  );
}

const env = loadEnv('.env.testnet');
const ASSET_CODE   = env.ASSET_CODE;
const ASSET_ISSUER = env.ASSET_ISSUER_PUBLIC;
const DIST_PUBLIC  = env.DISTRIBUTION_PUBLIC;

const HORIZON_URL  = 'https://horizon-testnet.stellar.org';
const SEP_SERVER   = 'http://localhost:8080';
const BUSINESS     = 'http://localhost:3000';

const server = new Horizon.Server(HORIZON_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMemo(txId) {
  return txId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

async function sep10Auth(publicKey, secretKey) {
  const res = await fetch(`${SEP_SERVER}/auth?account=${publicKey}`);
  if (!res.ok) throw new Error(await res.text());
  const { transaction: xdr } = await res.json();

  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(Keypair.fromSecret(secretKey));

  const authRes = await fetch(`${SEP_SERVER}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toEnvelope().toXDR('base64') }),
  });
  if (!authRes.ok) throw new Error(await authRes.text());
  const { token } = await authRes.json();
  return token;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Paste the test user's secret key from the Stage 4 deposit output.
// Alternatively, provide via TEST_USER_SECRET env var.
const TEST_USER_SECRET = process.env.TEST_USER_SECRET;
const TEST_USER_PUBLIC = process.env.TEST_USER_PUBLIC;

if (!TEST_USER_SECRET || !TEST_USER_PUBLIC) {
  console.error('Usage: TEST_USER_SECRET=S... TEST_USER_PUBLIC=G... node scripts/test-withdrawal.mjs');
  console.error('  Use the keypair printed by test-deposit.mjs');
  process.exit(1);
}

async function main() {
  console.log('=== SEP-24 Withdrawal Simulation ===\n');
  console.log('Test user:', TEST_USER_PUBLIC, '\n');

  // Check user has ANCH
  const userAcc = await server.loadAccount(TEST_USER_PUBLIC);
  const anchBalance = userAcc.balances.find(b => b.asset_code === ASSET_CODE);
  if (!anchBalance) {
    console.error(`Test user has no ${ASSET_CODE} balance. Run test-deposit.mjs first.`);
    process.exit(1);
  }
  console.log(`User ${ASSET_CODE} balance: ${anchBalance.balance}`);
  const withdrawAmount = '50';
  console.log(`Will withdraw: ${withdrawAmount} ${ASSET_CODE}\n`);

  // 1. SEP-10 auth
  console.log('Step 1: SEP-10 authentication…');
  const jwt = await sep10Auth(TEST_USER_PUBLIC, TEST_USER_SECRET);
  console.log('  JWT obtained.\n');

  // 2. Initiate SEP-24 withdrawal
  console.log('Step 2: Initiating SEP-24 withdrawal…');
  const withdrawRes = await fetch(`${SEP_SERVER}/sep24/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_code: ASSET_CODE,
      asset_issuer: ASSET_ISSUER,
      amount: withdrawAmount,
    }),
  });
  const withdrawBody = await withdrawRes.json();
  if (!withdrawRes.ok) {
    console.error('Withdrawal initiation failed:', JSON.stringify(withdrawBody, null, 2));
    process.exit(1);
  }

  const txId = withdrawBody.id;
  const interactiveUrl = withdrawBody.url;
  const memo = generateMemo(txId);

  console.log('  Transaction ID:', txId);
  console.log('  Memo:          ', memo);
  console.log('  Interactive URL (informational):', interactiveUrl, '\n');

  // 3. Simulate user submitting the interactive form
  // (In a real wallet the user would open the URL in a browser and click confirm.)
  console.log('Step 3: Simulating interactive form submission…');
  const formRes = await fetch(`${BUSINESS}/sep24/interactive/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      transaction_id: txId,
      destination_account: TEST_USER_PUBLIC,
      amount: withdrawAmount,
      kind: 'withdrawal',
      memo,
    }),
  });
  if (!formRes.ok) {
    const text = await formRes.text();
    console.error('Form submission failed:', text.slice(0, 500));
    process.exit(1);
  }
  console.log('  Form submitted → status: pending_user_transfer_start\n');

  // 4. Send ANCH from test user → Distribution (the actual Stellar transfer)
  console.log(`Step 4: Sending ${withdrawAmount} ${ASSET_CODE} from user → Distribution (on Stellar)…`);
  const asset = new Asset(ASSET_CODE, ASSET_ISSUER);
  const userKeypair = Keypair.fromSecret(TEST_USER_SECRET);
  const userAccount = await server.loadAccount(TEST_USER_PUBLIC);

  const paymentTx = new TransactionBuilder(userAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: DIST_PUBLIC,
      asset,
      amount: withdrawAmount,
    }))
    .addMemo(Memo.text(memo))
    .setTimeout(30)
    .build();

  paymentTx.sign(userKeypair);
  const result = await server.submitTransaction(paymentTx);
  console.log('  Stellar tx hash:', result.hash);
  console.log(`  Sent ${withdrawAmount} ${ASSET_CODE} with memo "${memo}"\n`);

  // 5. Poll Platform API until transaction completes
  // The Observer detects the payment → moves to pending_anchor.
  // The business server's polling loop moves pending_anchor → completed.
  console.log('Step 5: Polling for completion (Observer + business server poller)…');
  const maxWait = 120; // seconds
  const start = Date.now();

  while (Date.now() - start < maxWait * 1000) {
    await sleep(5000);
    const txData = await fetch(`http://localhost:8085/transactions/${txId}`).then(r => r.json());
    const status = txData.status;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] Status: ${status}`);

    if (status === 'completed') {
      console.log('\n=== Withdrawal Complete ===');
      console.log('Transaction:', txId);
      console.log('Status:', txData.status);
      break;
    }

    if (status === 'error') {
      console.error('\nTransaction entered error state:', JSON.stringify(txData, null, 2));
      break;
    }
  }

  // 6. Verify balances
  console.log('\nStep 6: Verifying final balances…');
  const finalUser = await server.loadAccount(TEST_USER_PUBLIC);
  const finalDist = await server.loadAccount(DIST_PUBLIC);

  const userAnch = finalUser.balances.find(b => b.asset_code === ASSET_CODE);
  const distAnch = finalDist.balances.find(b => b.asset_code === ASSET_CODE);

  console.log(`  User ${ASSET_CODE}: ${userAnch?.balance ?? 'none'}`);
  console.log(`  Distribution ${ASSET_CODE}: ${distAnch?.balance ?? 'none'}`);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
