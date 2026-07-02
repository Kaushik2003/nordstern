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

// Adapter selection (mock-first). Real vendors land behind these seams in Phase D.
export const PROVIDERS = {
  kyc:     process.env.KYC_PROVIDER     ?? 'mock',
  deposit: process.env.DEPOSIT_PROVIDER ?? 'mock',
  payout:  process.env.PAYOUT_PROVIDER  ?? 'mock',
  fee:     process.env.FEE_PROVIDER     ?? 'mock',
};
