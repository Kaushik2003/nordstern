/**
 * Initialises mainnet accounts after they have been funded with XLM.
 *
 * What this does:
 *   1. Distribution account creates a trustline to the Issuer for ANCH
 *   2. Issuer mints 1,000,000 ANCH → Distribution (initial supply)
 *
 * Run from project root (after funding):
 *   node scripts/init-mainnet-accounts.mjs
 */

import {
  Keypair, Networks, Horizon, Asset,
  TransactionBuilder, BASE_FEE, Operation,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';

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

const env = loadEnv('.env.mainnet');

const ISSUER_PUBLIC      = env.ASSET_ISSUER_PUBLIC;
const ISSUER_SECRET      = env.ASSET_ISSUER_SECRET;
const DIST_PUBLIC        = env.DISTRIBUTION_PUBLIC;
const DIST_SECRET        = env.DISTRIBUTION_SECRET;
const ASSET_CODE         = env.ASSET_CODE ?? 'ANCH';
const INITIAL_SUPPLY     = '1000000';

const server = new Horizon.Server('https://horizon.stellar.org');
const asset  = new Asset(ASSET_CODE, ISSUER_PUBLIC);

async function submit(account, keypair, ops, label) {
  const acc = await server.loadAccount(account);
  const tx  = new TransactionBuilder(acc, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  });
  ops.forEach(op => tx.addOperation(op));
  const built = tx.setTimeout(30).build();
  built.sign(keypair);
  console.log(`  Submitting: ${label}…`);
  const result = await server.submitTransaction(built);
  console.log(`  ✓ ${label} — hash: ${result.hash}`);
  return result.hash;
}

async function main() {
  console.log('=== ANCH Mainnet Account Initialisation ===\n');

  // Verify accounts are funded
  for (const [label, pk] of [
    ['Issuer', ISSUER_PUBLIC],
    ['Distribution', DIST_PUBLIC],
  ]) {
    try {
      const acc = await server.loadAccount(pk);
      const xlm = acc.balances.find(b => b.asset_type === 'native');
      console.log(`✓ ${label} (${pk.slice(0,8)}…): ${xlm?.balance ?? '0'} XLM`);
    } catch {
      console.error(`✗ ${label} (${pk.slice(0,8)}…): account not found on mainnet — fund it first`);
      process.exit(1);
    }
  }

  console.log();

  // Step 1: Distribution creates trustline to Issuer
  console.log('Step 1: Distribution → trustline for', ASSET_CODE);
  await submit(
    DIST_PUBLIC,
    Keypair.fromSecret(DIST_SECRET),
    [Operation.changeTrust({ asset, limit: INITIAL_SUPPLY })],
    'changeTrust ANCH',
  );

  // Step 2: Issuer mints ANCH → Distribution
  console.log('\nStep 2: Issuer mints', INITIAL_SUPPLY, ASSET_CODE, '→ Distribution');
  await submit(
    ISSUER_PUBLIC,
    Keypair.fromSecret(ISSUER_SECRET),
    [Operation.payment({ destination: DIST_PUBLIC, asset, amount: INITIAL_SUPPLY })],
    `mint ${INITIAL_SUPPLY} ANCH`,
  );

  console.log(`
╔══════════════════════════════════════════════════════╗
║  Accounts initialised!                               ║
║                                                      ║
║  Copy the mainnet stellar.toml:                      ║
║    cp config/stellar.toml.mainnet config/stellar.toml║
║    (edit HOME_DOMAIN and ORG_URL first)              ║
║                                                      ║
║  Start the mainnet stack:                            ║
║    docker compose -f docker-compose.mainnet.yml up   ║
║                  --build                             ║
╚══════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
