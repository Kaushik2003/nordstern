import { Networks } from '@stellar/stellar-sdk';

// ─── Environment ─────────────────────────────────────────────────────────────
// Single-anchor: one anchor's keys, asset, and adapter selection injected as env.
// Everything anchor-specific lives here (zero hardcoded values elsewhere) so this
// project stays template-ready — the parked factory can one day stamp it out.

export const PORT             = process.env.PORT             ?? 3000;
export const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? 'http://anchor-platform:8085';

// Treasury = the account that holds the USDC FLOAT. It is the source of USDC on
// deposit and the destination users send USDC back to on withdrawal. Maps to the
// AP asset's `distribution_account`. The anchor does NOT issue USDC — Circle does.
export const TREASURY_PUBLIC  = process.env.TREASURY_PUBLIC  ?? '';
export const TREASURY_SECRET  = process.env.TREASURY_SECRET  ?? '';

export const ASSET_CODE          = process.env.ASSET_CODE          ?? 'USDC';
export const ASSET_ISSUER_PUBLIC = process.env.ASSET_ISSUER_PUBLIC ?? '';
export const HORIZON_URL         = process.env.HORIZON_URL         ?? 'https://horizon-testnet.stellar.org';
export const NET_PASS            = process.env.NETWORK_PASSPHRASE  ?? Networks.TESTNET;
export const IS_MAINNET          = !HORIZON_URL.includes('testnet');

export const assetId = () => `stellar:${ASSET_CODE}:${ASSET_ISSUER_PUBLIC}`;

// ─── Durable store ──────────────────────────────────────────────────────────────
// KYC records persist in the stack's existing Postgres (see db.ts). Compose passes
// this; the default targets the in-network `db` service.
export const DATABASE_URL = process.env.DATABASE_URL
  ?? `postgres://${process.env.DB_USER ?? 'anchor'}:${process.env.DB_PASSWORD ?? 'anchor'}@db:5432/anchordb`;

// ─── DIDIT KYC (real identity verification) ─────────────────────────────────────
// API key + webhook secret are server-side secrets (never shipped to the browser).
// WORKFLOW_ID is per-session config, NOT a secret — the "Free KYC" workflow default.
export const DIDIT_API_KEY        = process.env.DIDIT_API_KEY        ?? '';
export const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET ?? '';
export const DIDIT_WORKFLOW_ID    = process.env.DIDIT_WORKFLOW_ID    ?? '6caaf537-a69b-48db-9141-c6180edaea88';

// Public https base URL of THIS server (ngrok in local dev) — used for the DIDIT
// session `callback` return URL. Defaults to localhost for same-origin web testing.
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

// KYC validity window. Past this a verified account must re-verify. Default ~5 min
// for testing the re-verification path; raise to a real policy window for prod.
export const KYC_REVERIFY_TTL_SECONDS = Number(process.env.KYC_REVERIFY_TTL_SECONDS ?? 300);

// Adapter selection (mock-first). Real vendors land behind these seams in Phase D.
export const PROVIDERS = {
  kyc:     process.env.KYC_PROVIDER     ?? 'mock',   // mock | surepass | didit
  deposit: process.env.DEPOSIT_PROVIDER ?? 'mock',
  payout:  process.env.PAYOUT_PROVIDER  ?? 'mock',
  fee:     process.env.FEE_PROVIDER     ?? 'mock',
};
