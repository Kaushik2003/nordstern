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
const CONFIG_HOST_ROOT = process.env.ANCHOR_CONFIG_HOST_ROOT ?? '';
const HORIZON_URL        = process.env.HORIZON_URL        ?? 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
const DB_USER = process.env.DB_USER ?? 'anchor';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'anchor';

// ── Naming helpers (shared with config-gen / provision) ────────────────────────
export const apName  = (slug: string) => `anchor-platform-${slug}`;
export const bizName = (slug: string) => `business-server-${slug}`;
export const clientName = (slug: string) => `anchor-client-${slug}`;
export const consoleName = (slug: string) => `operator-console-${slug}`;
export const anchorDbName = (slug: string) => `anchordb_${slug.replace(/-/g, '_')}`;

const rand = () => randomBytes(24).toString('base64');
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface AdapterSelection {
  kyc: string;
  deposit: string;
  payout: string;
  fee: string;
}

export interface StackParams {
  slug: string;
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
function labels(role: 'ap' | 'biz' | 'client' | 'console', slug: string, homeDomain: string): Record<string, string> {
  const router = `${role}-${slug}`;
  if (role === 'client') {
    return {
      'traefik.enable': 'true',
      [`traefik.http.routers.${router}.rule`]: `Host(\`${homeDomain}\`)`,
      [`traefik.http.routers.${router}.entrypoints`]: 'web',
      [`traefik.http.routers.${router}.priority`]: '1',
      [`traefik.http.routers.${router}.service`]: router,
      [`traefik.http.services.${router}.loadbalancer.server.port`]: '3001',
      'nordstern.anchor': slug,
    };
  }
  if (role === 'console') {
    return {
      'traefik.enable': 'true',
      [`traefik.http.routers.${router}.rule`]: `Host(\`console.${homeDomain}\`)`,
      [`traefik.http.routers.${router}.entrypoints`]: 'web',
      [`traefik.http.routers.${router}.priority`]: '1',
      [`traefik.http.routers.${router}.service`]: router,
      [`traefik.http.services.${router}.loadbalancer.server.port`]: '3001',
      'nordstern.anchor': slug,
    };
  }
  if (role === 'ap') {
    return {
      'traefik.enable': 'true',
      [`traefik.http.routers.${router}.rule`]: `Host(\`sep.${homeDomain}\`)`,
      [`traefik.http.routers.${router}.entrypoints`]: 'web',
      [`traefik.http.routers.${router}.priority`]: '5',
      [`traefik.http.routers.${router}.service`]: router,
      [`traefik.http.services.${router}.loadbalancer.server.port`]: '8080',
      'nordstern.anchor': slug,
    };
  }
  // business-server (api.)
  return {
    'traefik.enable': 'true',
    [`traefik.http.routers.${router}.rule`]: `Host(\`api.${homeDomain}\`)`,
    [`traefik.http.routers.${router}.entrypoints`]: 'web',
    [`traefik.http.routers.${router}.priority`]: '10',
    [`traefik.http.routers.${router}.service`]: router,
    [`traefik.http.services.${router}.loadbalancer.server.port`]: '3000',
    'nordstern.anchor': slug,
  };
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

export async function createAnchorStack(p: StackParams): Promise<{ apId: string; bizId: string; clientId: string; consoleId: string }> {
  if (!CONFIG_HOST_ROOT) throw new Error('ANCHOR_CONFIG_HOST_ROOT not set — cannot bind AP config.');
  const hostConfigDir = path.join(CONFIG_HOST_ROOT, p.slug);

  await ensureImage(AP_IMAGE);
  await ensureImage(BIZ_IMAGE);
  await ensureImage(CLIENT_IMAGE);
  await ensureImage(CONSOLE_IMAGE);

  const apEnv = [
    'STELLAR_ANCHOR_CONFIG=/config/anchor-platform.yaml',
    `SECRET_SEP10_SIGNING_SEED=${p.signingSecret}`,
    `SECRET_SEP10_JWT_SECRET=${rand()}`,
    `SECRET_DATA_USERNAME=${DB_USER}`,
    `SECRET_DATA_PASSWORD=${DB_PASSWORD}`,
    `SECRET_SEP24_INTERACTIVE_URL_JWT_SECRET=${rand()}`,
    `SECRET_SEP24_MORE_INFO_URL_JWT_SECRET=${rand()}`,
    `SECRET_SEP6_MORE_INFO_URL_JWT_SECRET=${rand()}`,
  ];

  const bizEnv = [
    'PORT=3000',
    `PLATFORM_API_URL=http://${apName(p.slug)}:8085`,
    `ASSET_CODE=${p.assetCode}`,
    `ASSET_ISSUER_PUBLIC=${p.assetIssuer}`,
    `DISTRIBUTION_PUBLIC=${p.distributionPublic}`,
    `DISTRIBUTION_SECRET=${p.distributionSecret}`,
    `HORIZON_URL=${HORIZON_URL}`,
    `NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,
    `KYC_PROVIDER=${p.adapters.kyc}`,
    `DEPOSIT_PROVIDER=${p.adapters.deposit}`,
    `PAYOUT_PROVIDER=${p.adapters.payout}`,
    `FEE_PROVIDER=${p.adapters.fee}`,
    'ALLOW_MOCK_KYC=true',
  ];
  if (p.surepass) {
    bizEnv.push(`SUREPASS_BASE_URL=${p.surepass.baseUrl}`, `SUREPASS_TOKEN=${p.surepass.token}`);
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
    },
  });

  const bizId = await runContainer({
    name: bizName(p.slug),
    Image: BIZ_IMAGE,
    Env: bizEnv,
    Labels: labels('biz', p.slug, p.homeDomain),
    HostConfig: {
      NetworkMode: NETWORK,
    },
  });

  const clientEnv = [
    'PORT=3001',
    `BIZ_URL=http://${bizName(p.slug)}:3000`,
    `NEXT_PUBLIC_ASSET_CODE=${p.assetCode}`,
  ];

  const clientId = await runContainer({
    name: clientName(p.slug),
    Image: CLIENT_IMAGE,
    Env: clientEnv,
    Labels: labels('client', p.slug, p.homeDomain),
    HostConfig: {
      NetworkMode: NETWORK,
    },
  });

  const consoleEnv = [
    'PORT=3001',
    `BIZ_URL=http://${bizName(p.slug)}:3000`,
    'CP_URL=http://control-plane:3002',
  ];

  const consoleId = await runContainer({
    name: consoleName(p.slug),
    Image: CONSOLE_IMAGE,
    Env: consoleEnv,
    Labels: labels('console', p.slug, p.homeDomain),
    HostConfig: {
      NetworkMode: NETWORK,
    },
  });

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
