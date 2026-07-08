import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// ─── Per-anchor config generation (DL-008) ─────────────────────────────────────
// Each anchor gets its own generated Anchor Platform config, stellar.toml (SEP-1),
// and assets.yaml, written into a per-slug directory. Templates are kept inline
// (rather than files) so they survive the tsc → dist Docker build without extra
// COPY steps.
//
// Host-path note (see plan "Host-path gotcha"): control-plane WRITES into
// ANCHOR_CONFIG_DIR (a path inside this container). The orchestrator BIND-MOUNTS
// the corresponding HOST path (ANCHOR_CONFIG_HOST_ROOT/<slug>) into the AP
// container at /config. The two roots point at the same host directory.

const ANCHOR_CONFIG_DIR   = process.env.ANCHOR_CONFIG_DIR   ?? '/anchor-configs';
const NETWORK             = (process.env.STELLAR_NETWORK    ?? 'TESTNET').toUpperCase();
const HORIZON_URL         = process.env.HORIZON_URL         ?? 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE  = process.env.NETWORK_PASSPHRASE  ?? 'Test SDF Network ; September 2015';
// Public URL scheme for the anchor's SEP endpoints in stellar.toml / AP config. Local
// dev is plain http; prod sets ANCHOR_PUBLIC_SCHEME=https so wallets get valid TLS URLs
// (real wallets reject non-HTTPS SEP endpoints).
const PUBLIC_SCHEME       = (process.env.ANCHOR_PUBLIC_SCHEME ?? 'http').toLowerCase();

export interface AnchorConfigInput {
  slug: string;
  homeDomain: string;         // e.g. acme.anchors.localhost
  database: string;           // e.g. anchordb_acme (DNS/identifier-safe)
  assetCode: string;
  assetIssuer: string;        // issuer public key
  distributionPublic: string; // distribution public key
  signingPublic: string;      // SEP-10 signing public key
  orgName: string;
}

function anchorPlatformYaml(a: AnchorConfigInput): string {
  return `# Generated per-anchor Anchor Platform config for "${a.slug}" (DL-008).
version: 1

stellar_network:
  network: ${NETWORK}
  horizon_url: ${HORIZON_URL}
  type: horizon

callback_api:
  base_url: http://business-server-${a.slug}:3000
  auth:
    type: none

platform_api:
  auth:
    type: none

app_logging:
  level: INFO
  stellar_level: INFO

sep1:
  enabled: true
  toml:
    type: file
    value: /config/stellar.toml

sep10:
  enabled: true
  home_domains:
    - ${a.homeDomain}

sep12:
  enabled: true

sep24:
  enabled: true
  interactive_url:
    base_url: ${PUBLIC_SCHEME}://${a.homeDomain}/sep24/interactive
    jwt_expiration: 3600
  more_info_url:
    base_url: ${PUBLIC_SCHEME}://${a.homeDomain}/sep24/transaction
    jwt_expiration: 3600

# SEP-6/31/38 enabled only to satisfy the AP bean requirements alongside SEP-24.
sep6:
  enabled: true
  features:
    account_creation: false
    claimable_balances: false
  more_info_url:
    base_url: ${PUBLIC_SCHEME}://${a.homeDomain}/sep6/transaction
    jwt_expiration: 3600

sep31:
  enabled: true
  payment_type: STRICT_SEND

sep38:
  enabled: true
  sep10_enforced: false
  auth_enforced: false

data:
  type: postgres
  server: db:5432
  database: ${a.database}
  flyway_enabled: true
  ddl_auto: update

events:
  enabled: false

assets:
  type: file
  value: /config/assets.yaml
`;
}

function stellarToml(a: AnchorConfigInput): string {
  return `NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"
TRANSFER_SERVER_SEP0024="${PUBLIC_SCHEME}://${a.homeDomain}/sep24"
WEB_AUTH_ENDPOINT="${PUBLIC_SCHEME}://${a.homeDomain}/auth"
SIGNING_KEY="${a.signingPublic}"

[DOCUMENTATION]
ORG_NAME="${a.orgName}"
ORG_URL="${PUBLIC_SCHEME}://${a.homeDomain}"
ORG_DESCRIPTION="NordStern-managed Stellar anchor (${a.slug})"

[[CURRENCIES]]
code="${a.assetCode}"
issuer="${a.assetIssuer}"
status="test"
name="${a.assetCode} (NordStern anchor)"
desc="Test asset issued by the ${a.slug} anchor"
is_asset_anchored=false
anchor_asset_type="fiat"
display_decimals=2
`;
}

function assetsYaml(a: AnchorConfigInput): string {
  return `items:
  - id: "stellar:${a.assetCode}:${a.assetIssuer}"
    distribution_account: "${a.distributionPublic}"
    significant_decimals: 2
    sep24:
      enabled: true
      deposit:
        enabled: true
        min_amount: 1
        max_amount: 1000000
        methods:
          - WIRE
      withdraw:
        enabled: true
        min_amount: 1
        max_amount: 1000000
        methods:
          - WIRE
`;
}

/**
 * Render the three config files into ANCHOR_CONFIG_DIR/<slug>/ and return the
 * container-side directory path. The orchestrator maps this to the host path.
 */
export async function generateAnchorConfig(a: AnchorConfigInput): Promise<string> {
  const dir = path.join(ANCHOR_CONFIG_DIR, a.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'anchor-platform.yaml'), anchorPlatformYaml(a));
  await writeFile(path.join(dir, 'stellar.toml'), stellarToml(a));
  await writeFile(path.join(dir, 'assets.yaml'), assetsYaml(a));
  return dir;
}
