/**
 * Fund the treasury USDC float (testnet) via a DEX path payment: swap the
 * treasury's XLM (from Friendbot) for USDC on the Stellar testnet order book.
 * This is the scriptable alternative to Circle's captcha-gated web faucet.
 *
 *   node scripts/fund-treasury.mjs [xlmAmount=500]
 */

import { Keypair, Horizon, TransactionBuilder, BASE_FEE, Operation, Asset } from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the project root (Node's --env-file not assumed).
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const XLM_AMOUNT = process.argv[2] ?? '500';
const HORIZON = process.env.HORIZON_URL;
const ISSUER  = process.env.ASSET_ISSUER_PUBLIC;
const PASS    = process.env.NETWORK_PASSPHRASE;
const treasury = Keypair.fromSecret(process.env.TREASURY_SECRET);
const usdc = new Asset('USDC', ISSUER);
const server = new Horizon.Server(HORIZON);

console.log(`=== Fund treasury float: ${XLM_AMOUNT} XLM -> USDC ===\n`);
console.log(`  Treasury: ${treasury.publicKey()}`);

// Quote the path so we can set a sane destMin (slippage floor).
const url = `${HORIZON}/paths/strict-send?source_asset_type=native&source_amount=${XLM_AMOUNT}&destination_assets=USDC%3A${ISSUER}`;
const rec = (await fetch(url).then(r => r.json()))._embedded?.records?.[0];
if (!rec) { console.error('No XLM->USDC path on testnet right now. Try Circle faucet: https://faucet.circle.com'); process.exit(1); }
const expected = rec.destination_amount;
const destMin = (Number(expected) * 0.95).toFixed(7);
console.log(`  Quote: ~${expected} USDC (destMin ${destMin}, 5% slippage)`);

const account = await server.loadAccount(treasury.publicKey());
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASS })
  .addOperation(Operation.pathPaymentStrictSend({
    sendAsset: Asset.native(),
    sendAmount: XLM_AMOUNT,
    destination: treasury.publicKey(),  // swap into our own account
    destAsset: usdc,
    destMin,
    path: rec.path.map((p) => (p.asset_type === 'native' ? Asset.native() : new Asset(p.asset_code, p.asset_issuer))),
  }))
  .setTimeout(60)
  .build();
tx.sign(treasury);
await server.submitTransaction(tx);

const after = (await server.loadAccount(treasury.publicKey())).balances
  .find((b) => b.asset_code === 'USDC' && b.asset_issuer === ISSUER);
console.log(`\n  ✓ Treasury USDC float: ${after?.balance ?? '0'}`);
console.log('\n=== Done ===');
