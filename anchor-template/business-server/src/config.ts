import { Networks } from '@stellar/stellar-sdk';

// ─── Environment ─────────────────────────────────────────────────────────────
// Single-anchor: one anchor's keys, asset, and adapter selection injected as env.
// Everything anchor-specific lives here (zero hardcoded values elsewhere) so this
// project stays template-ready — the parked factory can one day stamp it out.

export const PORT             = process.env.PORT             ?? 3000;
export const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? 'http://anchor-platform:8085';
export const SEP_SERVER_URL   = process.env.SEP_SERVER_URL   ?? PLATFORM_API_URL.replace('8085', '8080');

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

// Mock KYC auto-approves EVERY user — it must never be the operating mode of a real
// anchor. It is disabled unless explicitly acknowledged for local dev, and is
// forbidden outright on mainnet (see makeKyc() in adapters/index.ts).
export const ALLOW_MOCK_KYC = process.env.ALLOW_MOCK_KYC === 'true';

// ─── Razorpay (fiat-in / deposit collection) ────────────────────────────────────
// DEPOSIT_PROVIDER=razorpay collects the INR via Razorpay Checkout before USDC is
// released. KEY_ID is public (shipped to the browser to open Checkout); KEY_SECRET
// and WEBHOOK_SECRET are server-side only. Test (rzp_test_…) vs live (rzp_live_…)
// is purely the key prefix — swapping keys is the only thing separating sandbox
// from real money. The webhook is delivered to `${PUBLIC_BASE_URL}/webhooks/razorpay`.
export const RAZORPAY_KEY_ID         = process.env.RAZORPAY_KEY_ID         ?? '';
export const RAZORPAY_KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET     ?? '';
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
export const RAZORPAY_BUSINESS_NAME  = process.env.RAZORPAY_BUSINESS_NAME  ?? 'NordStern';

// Adapter selection. KYC defaults to REAL (didit) and fails closed — a money anchor
// must never silently run on mock identity checks (see makeKyc()). The other seams
// remain mock-first sandbox defaults until their credentials are provided.
export const PROVIDERS = {
  // `||` (not `??`) so an empty KYC_PROVIDER= still resolves to the real default
  // rather than falling through to the fail-closed "unknown provider" error.
  kyc:     process.env.KYC_PROVIDER     || 'didit',  // didit | surepass (real) · mock (dev-only, gated)
  deposit: process.env.DEPOSIT_PROVIDER ?? 'mock',
  payout:  process.env.PAYOUT_PROVIDER  ?? 'mock',
  fee:     process.env.FEE_PROVIDER     ?? 'mock',
};
