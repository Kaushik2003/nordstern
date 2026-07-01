/**
 * Simulates a wallet doing a SEP-24 deposit.
 *
 * What this script does:
 *   1. Generates a fresh "test user" Stellar keypair
 *   2. Funds it via Friendbot (free XLM on Testnet)
 *   3. Creates a trustline so the user can receive ANCH
 *   4. Authenticates via SEP-10 (proves ownership of keypair)
 *   5. Initiates a SEP-24 deposit
 *   6. Prints the interactive URL + transaction structure from Platform API
 *
 * Run from project root:
 *   node scripts/test-deposit.mjs
 */

import {
  Keypair, Networks, Horizon,
  TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

// ─── Load .env.testnet ────────────────────────────────────────────────────────

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => {
        const eq = l.indexOf('=');
        const key = l.slice(0, eq).trim();
        const val = l.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
        return [key, val];
      })
  );
}

const env = loadEnv('.env.testnet');
const ASSET_CODE    = env.ASSET_CODE;
const ASSET_ISSUER  = env.ASSET_ISSUER_PUBLIC;

const HORIZON_URL   = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const SEP_SERVER    = 'http://localhost:8080';
const PLATFORM_API  = 'http://localhost:8085';

const server = new Horizon.Server(HORIZON_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function friendbot(publicKey) {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) throw new Error(`Friendbot failed: ${await res.text()}`);
}

async function sep10Auth(publicKey, secretKey) {
  // 1. Get challenge
  const challengeRes = await fetch(`${SEP_SERVER}/auth?account=${publicKey}`);
  if (!challengeRes.ok) throw new Error(`Challenge failed: ${await challengeRes.text()}`);
  const { transaction: xdr } = await challengeRes.json();

  // 2. Sign
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(Keypair.fromSecret(secretKey));

  // 3. Submit and get JWT
  const authRes = await fetch(`${SEP_SERVER}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx.toEnvelope().toXDR('base64') }),
  });
  if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
  const { token } = await authRes.json();
  return token;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SEP-24 Deposit Simulation ===\n');

  // Step 1: fresh user keypair
  console.log('Step 1: Generating test user keypair...');
  const testUser = Keypair.random();
  console.log('  Public key:', testUser.publicKey());
  console.log('  Secret key:', testUser.secret(), '  ← keep this for later\n');

  // Step 2: fund via Friendbot
  console.log('Step 2: Funding via Friendbot (10,000 XLM)...');
  await friendbot(testUser.publicKey());
  console.log('  Waiting 4 s for ledger to close...');
  await new Promise(r => setTimeout(r, 4000));
  console.log('  Funded.\n');

  // Step 3: create ANCH trustline on the test user account
  // Without this, the Platform cannot send ANCH tokens to the user.
  console.log(`Step 3: Creating ${ASSET_CODE} trustline on test user account...`);
  const asset = new Asset(ASSET_CODE, ASSET_ISSUER);
  const userAccount = await server.loadAccount(testUser.publicKey());

  const trustTx = new TransactionBuilder(userAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset, limit: '1000000' }))
    .setTimeout(30)
    .build();

  trustTx.sign(testUser);
  await server.submitTransaction(trustTx);
  console.log('  Trustline created.\n');

  // Step 4: SEP-10 authentication — proves user owns this keypair
  console.log('Step 4: SEP-10 authentication...');
  const jwt = await sep10Auth(testUser.publicKey(), testUser.secret());
  console.log('  JWT obtained.\n');

  // Step 5: initiate SEP-24 deposit
  // The Platform will call our /callbacks/unique_address and create a transaction.
  console.log('Step 5: Initiating SEP-24 deposit (100 ANCH)...');
  const depositRes = await fetch(`${SEP_SERVER}/sep24/transactions/deposit/interactive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      asset_code: ASSET_CODE,
      asset_issuer: ASSET_ISSUER,
      amount: '100',
    }),
  });

  const depositBody = await depositRes.json();
  if (!depositRes.ok) {
    console.error('Deposit initiation failed:', JSON.stringify(depositBody, null, 2));
    process.exit(1);
  }

  console.log('  Transaction ID:', depositBody.id);
  console.log('  Status:        ', depositBody.transaction?.status ?? depositBody.status ?? 'see response');
  console.log();

  // Step 6: inspect the transaction record from the Platform API
  console.log('Step 6: Fetching transaction from Platform API...');
  await new Promise(r => setTimeout(r, 500));
  const txRes = await fetch(`${PLATFORM_API}/transactions/${depositBody.id}`);
  const txData = await txRes.json();

  console.log('\n--- Transaction record (Platform API schema) ---');
  console.log(JSON.stringify(txData, null, 2));

  // Step 7: the interactive URL
  console.log('\n=== Open this URL in your browser to complete the deposit ===');
  console.log(depositBody.url ?? '(no url in response — check above)');
  console.log();
  console.log('Test user public key (save this):');
  console.log(testUser.publicKey());
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
