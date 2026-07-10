import Docker from 'dockerode';
import { randomBytes } from 'crypto';
import path from 'path';
import { pool } from './db.js';
import { readAnchorSecrets } from './secrets.js';

// ─── Orchestrator (DL-006) ─────────────────────────────────────────────────────
// Spins up an isolated stack per anchor via the Docker Engine API: one Anchor
// Platform container + one business-server container, joined to the shared compose
// network, discovered by Traefik through container labels. Also creates/drops the
// per-anchor Postgres database. Docker-socket access is a privilege surface —
// acceptable for local dev, flagged for production (k8s API + RBAC later).

const docker = new Docker(); // uses /var/run/docker.sock

const AP_IMAGE   = process.env.AP_IMAGE   ?? 'stellar/anchor-platform:latest';
const BIZ_IMAGE  = process.env.BIZ_IMAGE  ?? 'nordstern/business-server:dev';
const CLIENT_IMAGE = process.env.CLIENT_IMAGE ?? 'nordstern/anchor-client:dev';
const CONSOLE_IMAGE = process.env.CONSOLE_IMAGE ?? 'nordstern/operator-console:dev';
const NETWORK    = process.env.DOCKER_NETWORK ?? 'anchor-service_default';
const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? 'http://platform-api:4000';
// Vercel Blob token for the operator console's logo upload (Settings). Sourced from the
// control-plane's own env (host root .env). Optional — if unset, a console renders the
// uploader but uploads fail with a clear "not configured" message; everything else works.
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? '';
const CONFIG_HOST_ROOT = process.env.ANCHOR_CONFIG_HOST_ROOT ?? '';
const HORIZON_URL        = process.env.HORIZON_URL        ?? 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
const DB_USER = process.env.DB_USER ?? 'anchor';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'anchor';
// RDS rejects unencrypted connections (pg_hba "no encryption"). In prod the control-plane
// runs with PGSSLMODE=no-verify; propagate it into each business-server's DATABASE_URL so its
// pg pool + migrate step connect over TLS. Unset locally (plain postgres container) → plaintext.
const DB_SSL_SUFFIX = process.env.PGSSLMODE ? `?sslmode=${process.env.PGSSLMODE}` : '';
// Same secret platform-api signs operator access tokens with — forwarded into each
// business-server so its money-admin API can verify the operator session.
const PLATFORM_JWT_ACCESS_SECRET = process.env.PLATFORM_JWT_ACCESS_SECRET ?? '';
// Shared backend↔platform service secret (KYC propagation to the central customer).
const SERVICE_SECRET = process.env.SERVICE_SECRET ?? '';
// Traefik entrypoint + TLS for the PUBLIC anchor hosts. Local dev routes plain HTTP on
// the 'web' entrypoint; prod sets ANCHOR_TRAEFIK_ENTRYPOINT=websecure and
// ANCHOR_TRAEFIK_CERTRESOLVER=<resolver> so every anchor is served under the
// *.<suffix> wildcard cert with no per-anchor cert work.
const PUBLIC_ENTRYPOINT = process.env.ANCHOR_TRAEFIK_ENTRYPOINT ?? 'web';
const CERT_RESOLVER = process.env.ANCHOR_TRAEFIK_CERTRESOLVER ?? '';
// Public URL scheme for anchor-facing URLs injected into the business-server
// (PUBLIC_BASE_URL). http locally; https in prod (matches config-gen's ANCHOR_PUBLIC_SCHEME).
const PUBLIC_SCHEME = (process.env.ANCHOR_PUBLIC_SCHEME ?? 'http').toLowerCase();

// ── Naming helpers (shared with config-gen / provision) ────────────────────────
export const apName  = (slug: string) => `anchor-platform-${slug}`;
export const bizName = (slug: string) => `business-server-${slug}`;
export const clientName = (slug: string) => `anchor-client-${slug}`;
export const consoleName = (slug: string) => `operator-console-${slug}`;
export const anchorDbName = (slug: string) => `anchordb_${slug.replace(/-/g, '_')}`;

const rand = () => randomBytes(24).toString('base64');
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// White-label brand → runtime env, injected into BOTH the customer app and the operator
// console (they share getBrand). Only present keys are emitted; the frontends fall back
// to defaults (NordStern purple, generated monogram) for anything missing. Open by design
// — a new branding key just needs a line here, no schema/redesign.
function brandEnv(p: StackParams): string[] {
  const b = p.branding ?? {};
  const map: Record<string, string | undefined> = {
    ANCHOR_DISPLAY_NAME: b.displayName || p.name,
    ANCHOR_ACCENT: b.accent,
    ANCHOR_LOGO_URL: b.logoUrl,
    ANCHOR_SUPPORT_EMAIL: b.supportEmail,
    ANCHOR_WEBSITE_URL: b.websiteUrl,
    ANCHOR_PRIVACY_URL: b.privacyUrl,
    ANCHOR_TERMS_URL: b.termsUrl,
  };
  return Object.entries(map).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
}

export interface AdapterSelection {
  kyc: string;
  deposit: string;
  payout: string;
  fee: string;
}

export interface StackParams {
  slug: string;
  name: string;                 // display name for per-anchor console branding
  branding?: Record<string, string>; // open brand map (accent, logoUrl, support/legal URLs)
  homeDomain: string;
  database: string;
  assetCode: string;
  assetIssuer: string;
  distributionPublic: string;
  distributionSecret: string;   // decrypted at inject time
  signingSecret: string;        // decrypted at inject time
  adapters: AdapterSelection;
  surepass?: { baseUrl: string; token: string };
}

// ── Per-anchor database ────────────────────────────────────────────────────────
export async function createAnchorDb(slug: string): Promise<void> {
  const name = anchorDbName(slug);
  // CREATE DATABASE cannot run in a transaction block; pool.query autocommits.
  const { rows } = await pool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [name]);
  if (rows.length === 0) {
    await pool.query(`CREATE DATABASE "${name}" OWNER "${DB_USER}"`);
  }
}

export async function dropAnchorDb(slug: string): Promise<void> {
  const name = anchorDbName(slug);
  // Terminate stray connections, then drop.
  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [name],
  ).catch(() => {});
  await pool.query(`DROP DATABASE IF EXISTS "${name}"`).catch(() => {});
}

// ── Container lifecycle ────────────────────────────────────────────────────────
// Anchor Platform SEP endpoints (SEP-1 toml, SEP-10 auth, SEP-6/12/24/31/38).
// /sep45 = SEP-45 contract-account web auth (passkey smart wallets). Must route to the AP,
// else Traefik falls through to the anchor-client (Next.js) and /sep45/auth 404s.
const AP_PATHS = ['/.well-known', '/auth', '/sep6', '/sep10', '/sep12', '/sep24', '/sep31', '/sep38', '/sep45']
  .map((p) => `PathPrefix(\`${p}\`)`).join(' || ');
// Surfaces that live UNDER /sep24 but belong to the business-server, not the AP: the
// SEP-24 interactive webview, its KYC/PSP callbacks, and the more-info page. The
// business-server router runs at a HIGHER priority so these specific subpaths win; the
// AP keeps the rest of /sep24. (Path(`/sep24/transaction`) is exact so it never steals
// the AP's /sep24/transactions.)
const BIZ_PATHS = [
  'PathPrefix(`/sep24/interactive`)', 'PathPrefix(`/sep24/kyc`)',
  'PathPrefix(`/sep24/razorpay`)', 'Path(`/sep24/transaction`)',
].join(' || ');

// Common Traefik router+service labels for one container, with TLS attached when a cert
// resolver is configured (prod) so it's served under the *.<suffix> wildcard cert.
function router(svc: string, rule: string, priority: string, port: string): Record<string, string> {
  const out: Record<string, string> = {
    'traefik.enable': 'true',
    [`traefik.http.routers.${svc}.rule`]: rule,
    [`traefik.http.routers.${svc}.priority`]: priority,
    [`traefik.http.routers.${svc}.entrypoints`]: PUBLIC_ENTRYPOINT,
    [`traefik.http.routers.${svc}.service`]: svc,
    [`traefik.http.services.${svc}.loadbalancer.server.port`]: port,
  };
  if (CERT_RESOLVER) {
    out[`traefik.http.routers.${svc}.tls`] = 'true';
    out[`traefik.http.routers.${svc}.tls.certresolver`] = CERT_RESOLVER;
  }
  return out;
}

// One clean host per anchor: <slug>.<suffix> serves the customer app (catch-all), with the
// Anchor Platform's SEP endpoints and our SEP-24 webview path-routed on the SAME host. The
// operator console gets its own single-label host, console-<slug>.<suffix>. Both fall under
// a single *.<suffix> wildcard. AP↔business-server callbacks are internal (container name),
// so no api./sep. hosts are needed.
function labels(role: 'ap' | 'biz' | 'client' | 'console', slug: string, homeDomain: string): Record<string, string> {
  const svc = `${role}-${slug}`;
  const tag = { 'nordstern.anchor': slug };
  switch (role) {
    case 'client':
      return { ...router(svc, `Host(\`${homeDomain}\`)`, '1', '3001'), ...tag };
    case 'console':
      return { ...router(svc, `Host(\`console-${homeDomain}\`)`, '1', '3001'), ...tag };
    case 'ap':
      return { ...router(svc, `Host(\`${homeDomain}\`) && (${AP_PATHS})`, '10', '8080'), ...tag };
    case 'biz':
      return { ...router(svc, `Host(\`${homeDomain}\`) && (${BIZ_PATHS})`, '20', '3000'), ...tag };
  }
  throw new Error(`unknown role ${role}`); // unreachable — satisfies noImplicitReturns
}

async function ensureImage(image: string): Promise<void> {
  const imgs = await docker.listImages({ filters: { reference: [image] } });
  if (imgs.length) return;
  // Not present locally — pull it (works for the AP image; a locally-built image
  // like nordstern/business-server:dev should already exist via dev.sh).
  await new Promise<void>((resolve, reject) => {
    docker.pull(image, (err: any, stream: NodeJS.ReadableStream) => {
      if (err) return reject(new Error(`Image ${image} missing and pull failed: ${err.message}. Did you run scripts/dev.sh?`));
      docker.modem.followProgress(stream, (e: any) => (e ? reject(e) : resolve()));
    });
  });
}

// For OPTIONAL images (customer client, operator console): present locally? We do NOT
// pull these — they're locally-built dev images. A missing one is not fatal; the anchor
// core (AP + business-server) still provisions and we skip the optional surface. This
// keeps a stack launchable before those images exist (the console has no source yet — R3).
async function imageAvailableLocally(image: string): Promise<boolean> {
  const imgs = await docker.listImages({ filters: { reference: [image] } });
  return imgs.length > 0;
}

async function runContainer(opts: Docker.ContainerCreateOptions): Promise<string> {
  // Remove any stale container with the same name (idempotent re-provision).
  try {
    const existing = docker.getContainer(opts.name!);
    await existing.remove({ force: true });
  } catch { /* not present */ }
  const container = await docker.createContainer(opts);
  await container.start();
  return container.id;
}

export async function createAnchorStack(p: StackParams): Promise<{ apId: string; bizId: string; clientId: string | null; consoleId: string | null }> {
  if (!CONFIG_HOST_ROOT) throw new Error('ANCHOR_CONFIG_HOST_ROOT not set — cannot bind AP config.');
  const hostConfigDir = path.join(CONFIG_HOST_ROOT, p.slug);

  await ensureImage(AP_IMAGE);
  await ensureImage(BIZ_IMAGE);
  // Optional surfaces — launched only if their images are built locally.
  const haveClient  = await imageAvailableLocally(CLIENT_IMAGE);
  const haveConsole = await imageAvailableLocally(CONSOLE_IMAGE);
  if (!haveClient)  console.warn(`[orchestrator] ${CLIENT_IMAGE} not built — skipping customer client for ${p.slug} (build it to enable the customer URL).`);
  if (!haveConsole) console.warn(`[orchestrator] ${CONSOLE_IMAGE} not built — skipping operator console for ${p.slug} (R3: no source yet).`);

  const apEnv = [
    'STELLAR_ANCHOR_CONFIG=/config/anchor-platform.yaml',
    `SECRET_SEP10_SIGNING_SEED=${p.signingSecret}`,
    `SECRET_SEP10_JWT_SECRET=${rand()}`,
    // SEP-45 (contract-account / passkey web auth) JWT signing key. The AP requires this
    // whenever sep45 is enabled in the generated config (config-gen gates that on
    // SEP45_WEB_AUTH_CONTRACT_ID). Harmless when SEP-45 is off.
    `SECRET_SEP45_JWT_SECRET=${rand()}`,
    `SECRET_DATA_USERNAME=${DB_USER}`,
    `SECRET_DATA_PASSWORD=${DB_PASSWORD}`,
    `SECRET_SEP24_INTERACTIVE_URL_JWT_SECRET=${rand()}`,
    `SECRET_SEP24_MORE_INFO_URL_JWT_SECRET=${rand()}`,
    `SECRET_SEP6_MORE_INFO_URL_JWT_SECRET=${rand()}`,
  ];

  const bizEnv = [
    'PORT=3000',
    `ANCHOR_SLUG=${p.slug}`,   // tags this anchor's structured logs (logger.ts svc field)
    `PLATFORM_API_URL=http://${apName(p.slug)}:8085`,
    // The hardened business-server owns a per-anchor `nordstern.*` money schema and
    // migrates-on-start into THIS anchor's already-created database (createAnchorDb →
    // anchordb_<slug>). Without this the server falls back to the shared `anchordb`
    // default and co-mingles every anchor's money tables. p.database == anchorDbName(slug).
    `DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${p.database}${DB_SSL_SUFFIX}`,
    `ASSET_CODE=${p.assetCode}`,
    `ASSET_ISSUER_PUBLIC=${p.assetIssuer}`,
    // Treasury = the asset's distribution account (holds the float, sends tokens on
    // deposit). The business-server reads TREASURY_PUBLIC/TREASURY_SECRET — inject under
    // THOSE names. Previously mis-named DISTRIBUTION_*, so every release failed with
    // "treasury has no trustline". Aliases kept for any external reference.
    `TREASURY_PUBLIC=${p.distributionPublic}`,
    `TREASURY_SECRET=${p.distributionSecret}`,
    `DISTRIBUTION_PUBLIC=${p.distributionPublic}`,
    `DISTRIBUTION_SECRET=${p.distributionSecret}`,
    // Public base URL = this anchor's bare host (DIDIT return URLs, PSP webhooks) —
    // was defaulting to localhost:3000. SEP_SERVER_URL = the AP, container-to-container.
    `PUBLIC_BASE_URL=${PUBLIC_SCHEME}://${p.homeDomain}`,
    `SEP_SERVER_URL=http://${apName(p.slug)}:8080`,
    `HORIZON_URL=${HORIZON_URL}`,
    `NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,
    `KYC_PROVIDER=${p.adapters.kyc}`,
    `DEPOSIT_PROVIDER=${p.adapters.deposit}`,
    `PAYOUT_PROVIDER=${p.adapters.payout}`,
    `FEE_PROVIDER=${p.adapters.fee}`,
    'ALLOW_MOCK_KYC=true',
    // Shared secret the money-admin API uses to verify the operator's platform session
    // (`ns_access`). Same value platform-api signs with, so a console-authenticated
    // operator — and only such an operator — can invoke financial operations.
    `PLATFORM_JWT_ACCESS_SECRET=${PLATFORM_JWT_ACCESS_SECRET}`,
    // NordStern platform-api base (:4000) so the money-admin API can org-scope the
    // operator: it delegates to GET /api/v1/anchors/resolve?slug=<slug>, which confirms
    // the caller is a member of THIS anchor's organization (not just any platform user).
    `NORDSTERN_API_URL=${PLATFORM_API_URL}`,
    // Shared secret to propagate DIDIT KYC decisions into the central customer profile.
    `SERVICE_SECRET=${SERVICE_SECRET}`,
  ];
  if (p.surepass) {
    bizEnv.push(`SUREPASS_BASE_URL=${p.surepass.baseUrl}`, `SUREPASS_TOKEN=${p.surepass.token}`);
  }

  // Universal DIDIT KYC: one NordStern-level DIDIT account serves EVERY launched anchor
  // (verify once, reuse across anchors). The creds live in the control-plane's own env
  // (from the git-ignored .env.base), never per-anchor and never in the DB — injected into
  // each business-server so real identity verification is the default. If absent, the
  // business-server's didit adapter fails closed rather than silently accepting mock KYC.
  for (const k of ['DIDIT_API_KEY', 'DIDIT_WORKFLOW_ID', 'DIDIT_WEBHOOK_SECRET'] as const) {
    if (process.env[k]) bizEnv.push(`${k}=${process.env[k]}`);
  }

  // Pull this anchor's PSP/banking credentials from the SecretStore and inject them
  // wholesale (DL-010). In prod this is what External Secrets Operator does via
  // envFrom; here the provisioner does it directly. Values never touch our DB and
  // never transit the platform→control-plane HTTP call — the provisioner reads them
  // straight from the store by the anchor's path. Empty for a mock/testnet anchor.
  const injected = await readAnchorSecrets(p.slug);
  for (const [k, v] of Object.entries(injected)) bizEnv.push(`${k}=${v}`);

  const apId = await runContainer({
    name: apName(p.slug),
    Image: AP_IMAGE,
    Cmd: ['-s', '-p', '-o'],
    Env: apEnv,
    Labels: labels('ap', p.slug, p.homeDomain),
    HostConfig: {
      NetworkMode: NETWORK,
      Binds: [`${hostConfigDir}:/config:ro`],
      // Auto-resume after a host reboot / EC2 stop-start (cost control: the box can be
      // stopped when idle and every anchor comes back with Docker on boot — no re-provision).
      RestartPolicy: { Name: 'unless-stopped' },
    },
  });

  const bizId = await runContainer({
    name: bizName(p.slug),
    Image: BIZ_IMAGE,
    Env: bizEnv,
    Labels: labels('biz', p.slug, p.homeDomain),
    HostConfig: {
      NetworkMode: NETWORK,
      RestartPolicy: { Name: 'unless-stopped' },
    },
  });

  let clientId: string | null = null;
  if (haveClient) {
    clientId = await runContainer({
      name: clientName(p.slug),
      Image: CLIENT_IMAGE,
      Env: [
        'PORT=3001',
        // Runtime BFF targets (read by the route-handler proxy, not baked).
        `BIZ_URL=http://${bizName(p.slug)}:3000`,
        // Customer identity backend (email-OTP auth, profile, wallets) lives centrally.
        `PLATFORM_API_URL=${PLATFORM_API_URL}`,
        'CP_URL=http://control-plane:3002',
        `NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,
        // Per-anchor branding (runtime — read server-side by getBrand). ANCHOR_ACCENT
        // + ANCHOR_LOGO_URL are optional overrides; default is the NordStern purple.
        `ANCHOR_NAME=${p.name}`,
        `ANCHOR_SLUG=${p.slug}`,
        `ASSET_CODE=${p.assetCode}`,
        ...brandEnv(p),
      ],
      Labels: labels('client', p.slug, p.homeDomain),
      HostConfig: { NetworkMode: NETWORK, RestartPolicy: { Name: 'unless-stopped' } },
    });
  }

  let consoleId: string | null = null;
  if (haveConsole) {
    consoleId = await runContainer({
      name: consoleName(p.slug),
      Image: CONSOLE_IMAGE,
      Env: [
        'PORT=3001',
        // BFF targets: platform-api (auth + R2a credentials) and this anchor's biz-server.
        `BIZ_URL=http://${bizName(p.slug)}:3000`,
        `PLATFORM_API_URL=${PLATFORM_API_URL}`,
        'CP_URL=http://control-plane:3002',
        // Per-anchor branding (read server-side at request time — one image, N anchors).
        `ANCHOR_NAME=${p.name}`,
        `ANCHOR_SLUG=${p.slug}`,
        `ASSET_CODE=${p.assetCode}`,
        `NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,   // console derives testnet/mainnet badge
        // Logo upload → Vercel Blob (only injected when the token is configured).
        ...(BLOB_READ_WRITE_TOKEN ? [`BLOB_READ_WRITE_TOKEN=${BLOB_READ_WRITE_TOKEN}`] : []),
        ...brandEnv(p),
      ],
      Labels: labels('console', p.slug, p.homeDomain),
      HostConfig: { NetworkMode: NETWORK, RestartPolicy: { Name: 'unless-stopped' } },
    });
  }

  return { apId, bizId, clientId, consoleId };
}

/** Poll until the AP serves its SEP-1 toml and the business-server is healthy. */
export async function waitHealthy(slug: string, timeoutMs = 150_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const apUrl  = `http://${apName(slug)}:8080/.well-known/stellar.toml`;
  const bizUrl = `http://${bizName(slug)}:3000/health`;
  let apOk = false, bizOk = false;
  while (Date.now() < deadline) {
    if (!bizOk) bizOk = await fetch(bizUrl).then(r => r.ok).catch(() => false);
    if (!apOk)  apOk  = await fetch(apUrl).then(r => r.ok).catch(() => false);
    if (apOk && bizOk) return;
    await wait(3000);
  }
  throw new Error(`Stack for ${slug} not healthy in ${timeoutMs}ms (ap=${apOk}, biz=${bizOk})`);
}

async function removeByName(name: string): Promise<void> {
  try {
    await docker.getContainer(name).remove({ force: true });
  } catch { /* already gone */ }
}

export async function removeStack(slug: string): Promise<void> {
  await removeByName(apName(slug));
  await removeByName(bizName(slug));
  await removeByName(clientName(slug));
  await removeByName(consoleName(slug));
}
