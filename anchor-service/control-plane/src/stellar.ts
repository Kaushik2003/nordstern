import {
  Keypair, Networks, Horizon, Asset, TransactionBuilder, BASE_FEE, Operation,
} from '@stellar/stellar-sdk';
import {
  IS_EXTERNAL_ASSET, EXTERNAL_ASSET_CODE, EXTERNAL_ASSET_ISSUER, MIN_TREASURY_XLM
} from './assetModel.js';

// ─── Stellar provisioning ──────────────────────────────────────────────────────
// Extracted from the old tenants.ts and scripts/setup-testnet.mjs so the factory
// and the CLI share one implementation. Testnet-only (Friendbot); mainnet is a
// deliberate later config swap (AGENTS.md §7).

const HORIZON_URL        = process.env.HORIZON_URL        ?? 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL      = process.env.FRIENDBOT_URL      ?? 'https://friendbot.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
const INITIAL_SUPPLY     = process.env.INITIAL_SUPPLY     ?? '1000000';
const TRUST_LIMIT        = '10000000';

const horizon = new Horizon.Server(HORIZON_URL);

export interface AnchorKeypairs {
  signing: Keypair;
  distribution: Keypair;
  issuer: Keypair;
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function generateKeypairs(): AnchorKeypairs {
  return {
    signing:      Keypair.random(),
    distribution: Keypair.random(),
    issuer:       Keypair.random(),
  };
}

/** Derive a valid Stellar asset code (1–12 alphanumerics) from an anchor slug. */
export function assetCodeFromSlug(slug: string): string {
  const cleaned = slug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12);
  return cleaned || 'ANCH';
}

async function fund(kp: Keypair): Promise<void> {
  if (IS_EXTERNAL_ASSET) {
    throw new Error('Friendbot funding is forbidden in external-asset mode');
  }
  const res = await fetch(`${FRIENDBOT_URL}?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${kp.publicKey()}: ${await res.text()}`);
}

/**
 * Fund all three accounts, create the distribution→issuer trustline, and mint the
 * initial supply to the distribution account. Idempotency is the caller's job
 * (provisioning runs once per anchor).
 */
export async function provisionAssetOnChain(kps: AnchorKeypairs, assetCode: string): Promise<void> {
  if (IS_EXTERNAL_ASSET) {
    throw new Error('On-chain asset provisioning is forbidden in external-asset mode');
  }
  await fund(kps.signing);
  await fund(kps.distribution);
  await fund(kps.issuer);
  await wait(5000); // let the ledger confirm account creation

  const asset = new Asset(assetCode, kps.issuer.publicKey());

  const distAcc = await horizon.loadAccount(kps.distribution.publicKey());
  const trustTx = new TransactionBuilder(distAcc, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.changeTrust({ asset, limit: TRUST_LIMIT }))
    .setTimeout(30).build();
  trustTx.sign(kps.distribution);
  await horizon.submitTransaction(trustTx);
  await wait(3000);

  const issuerAcc = await horizon.loadAccount(kps.issuer.publicKey());
  const mintTx = new TransactionBuilder(issuerAcc, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.payment({ destination: kps.distribution.publicKey(), asset, amount: INITIAL_SUPPLY }))
    .setTimeout(30).build();
  mintTx.sign(kps.issuer);
  await horizon.submitTransaction(mintTx);
}

/**
 * Verify that the external treasury is fully funded and ready.
 * Asserts:
 *  1. Account exists on-chain.
 *  2. Trustline exists to the specified external issuer for external asset code.
 *  3. XLM balance >= MIN_TREASURY_XLM.
 *  4. USDC balance > 0.
 */
export async function verifyExternalTreasury(treasuryPublic: string): Promise<void> {
  if (!IS_EXTERNAL_ASSET) {
    return;
  }

  try {
    const account = await horizon.loadAccount(treasuryPublic);

    // 1. Assert has USDC trustline to Circle issuer
    const usdcBal = account.balances.find(
      (b: any) =>
        b.asset_code === EXTERNAL_ASSET_CODE &&
        b.asset_issuer === EXTERNAL_ASSET_ISSUER,
    );
    if (!usdcBal) {
      throw new Error(
        `treasury account ${treasuryPublic} has no trustline for external asset ${EXTERNAL_ASSET_CODE}:${EXTERNAL_ASSET_ISSUER}. ` +
        `Please create the trustline first.`
      );
    }

    // 2. Assert XLM >= MIN_TREASURY_XLM
    const nativeBal = account.balances.find((b) => b.asset_type === 'native');
    const xlmAmount = Number(nativeBal?.balance ?? '0');
    if (xlmAmount < MIN_TREASURY_XLM) {
      throw new Error(
        `treasury account ${treasuryPublic} has insufficient XLM balance (found ${xlmAmount} XLM, need at least ${MIN_TREASURY_XLM} XLM). ` +
        `Please fund the account with more XLM.`
      );
    }

    // 3. Assert USDC balance > 0
    const usdcAmount = Number(usdcBal.balance ?? '0');
    if (usdcAmount <= 0) {
      throw new Error(
        `treasury account ${treasuryPublic} has no USDC balance (found ${usdcAmount}). ` +
        `Please fund the treasury with USDC first.`
      );
    }
  } catch (err: any) {
    // A missing account surfaces as the SDK's NotFoundError, whose HTTP status lives at
    // err.response.status (NOT err.status). Match both so the actionable "not funded yet"
    // message — the most likely operator mistake — actually fires instead of a raw 404.
    if (err?.name === 'NotFoundError' || err?.response?.status === 404) {
      throw new Error(`treasury account ${treasuryPublic} does not exist on-chain. Please create and fund it with XLM first.`);
    }
    throw err;
  }
}
