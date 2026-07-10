// ─── Asset model switch (M1) ─────────────────────────────────────────────────────
// One explicit setting decides HOW an anchor's asset is provisioned, so the two
// operating models can never be confused (no scattered `if (mainnet)` checks):
//
//   self-issued → the anchor issues its OWN test asset: generate an issuer keypair,
//                 Friendbot-fund it, and mint an initial supply. Testnet only.
//   external    → the anchor DISTRIBUTES an externally-issued asset (Circle USDC):
//                 NO issuer, NO Friendbot, NO mint. It only trusts Circle's issuer
//                 and transfers USDC from a pre-funded treasury. Mainnet.
//
// Default is `self-issued` so nothing about the existing testnet path changes unless
// ASSET_MODEL=external is set deliberately.

export type AssetModel = 'self-issued' | 'external';

export const ASSET_MODEL: AssetModel =
  (process.env.ASSET_MODEL ?? 'self-issued').toLowerCase() === 'external' ? 'external' : 'self-issued';

export const IS_EXTERNAL_ASSET = ASSET_MODEL === 'external';

// External-asset config — only meaningful (and only validated) when IS_EXTERNAL_ASSET.
export const EXTERNAL_ASSET_CODE   = process.env.EXTERNAL_ASSET_CODE   ?? 'USDC';
export const EXTERNAL_ASSET_ISSUER = process.env.EXTERNAL_ASSET_ISSUER ?? '';
export const TREASURY_PUBLIC       = process.env.TREASURY_PUBLIC       ?? '';
export const TREASURY_SECRET       = process.env.TREASURY_SECRET       ?? '';
export const MIN_TREASURY_XLM      = Number(process.env.MIN_TREASURY_XLM ?? '5');

// Circle's official mainnet USDC issuer (verified against Circle developer docs).
export const CIRCLE_USDC_MAINNET_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

// Fail-fast validation for the external provisioning path. Throws an actionable error
// (surfaced as the provisioning failure) if any required production value is missing or
// wrong — no defaults, no fallbacks. Called at the top of the external provision branch.
export function assertExternalAssetConfig(): void {
  const problems: string[] = [];

  if (!EXTERNAL_ASSET_ISSUER) {
    problems.push('EXTERNAL_ASSET_ISSUER is required (the external asset issuer)');
  } else if (EXTERNAL_ASSET_CODE === 'USDC' && EXTERNAL_ASSET_ISSUER !== CIRCLE_USDC_MAINNET_ISSUER) {
    problems.push(`EXTERNAL_ASSET_ISSUER must be Circle's mainnet USDC issuer (${CIRCLE_USDC_MAINNET_ISSUER})`);
  }
  if (!TREASURY_PUBLIC) problems.push('TREASURY_PUBLIC is required (a funded treasury account)');
  if (!TREASURY_SECRET) problems.push('TREASURY_SECRET is required (to sign USDC transfers)');

  const net = (process.env.STELLAR_NETWORK ?? 'TESTNET').toUpperCase();
  if (net !== 'PUBLIC') problems.push('STELLAR_NETWORK must be PUBLIC in external-asset mode');

  const horizon = process.env.HORIZON_URL ?? '';
  if (horizon.includes('testnet')) problems.push('HORIZON_URL must be mainnet Horizon in external-asset mode');

  if (problems.length > 0) {
    throw new Error(
      'external-asset provisioning config invalid — refusing to provision:\n' +
        problems.map((p) => '  ✗ ' + p).join('\n'),
    );
  }
}
