import 'dotenv/config';
import { z } from 'zod';

const bool = z.string().transform((v) => v === 'true' || v === '1');

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL: z.coerce.number().default(900),              // seconds (15m)
  REFRESH_TOKEN_TTL: z.coerce.number().default(60 * 60 * 24 * 14), // seconds (14d)
  CUSTOMER_TOKEN_TTL: z.coerce.number().default(60 * 60 * 24 * 30), // seconds (30d) — email-OTP session
  SERVICE_SECRET: z.string().optional(), // shared secret for backend→platform calls (KYC propagation)

  // ── NordStern INTERNAL admin (demo password gate) ────────────────────────────
  // A hardcoded username/password that gates the internal application-review panel.
  // Deliberately trivial for the demo; the real replacement is the super-admin ROLE
  // dimension (Product 4 / founder-onboarding M4). Override via env in any shared env.
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin'),
  ADMIN_TOKEN_TTL: z.coerce.number().default(60 * 60 * 12), // seconds (12h)
  // Empty default → host-only cookies (works for the platform console AND per-anchor
  // consoles on different hosts). Set only for a shared parent domain in prod.
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_SECURE: bool.default(false),

  // App / email
  APP_URL: z.string().default('http://localhost:3000'),
  // Public base URL of the console — used to build redeem/login links inside emails.
  CONSOLE_URL: z.string().default('http://localhost:4001'),
  // Suffix each provisioned anchor is served under: dev `anchors.127.0.0.1.sslip.io`
  // (→ <slug>.anchors.127.0.0.1.sslip.io), prod `nordstern.live`. Used to derive the
  // founder's live anchor URLs (customer app + operator console). Matches control-plane.
  ANCHOR_DOMAIN_SUFFIX: z.string().default('anchors.127.0.0.1.sslip.io'),
  ANCHOR_PUBLIC_SCHEME: z.enum(['http', 'https']).default('http'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('NordStern <onboarding@resend.dev>'),

  // Vault (tenant_secrets) — 32-byte base64
  SECRETS_KEK: z.string().optional(),

  // The Stellar network the provisioner runs anchors on (PUBLIC = mainnet). Surfaced
  // to the redeem UI so it can offer the custom self-issued-token option ONLY on
  // testnet (custom tokens are minted, which is forbidden on mainnet). Mirrors the
  // control-plane's own STELLAR_NETWORK; defaults to testnet.
  STELLAR_NETWORK: z.string().default('TESTNET'),

  // ── SecretStore (PSP/banking credentials — NEVER stored in the DB) ──────────
  // One AWS Secrets Manager secret per anchor at `${SECRETS_PREFIX}/${SECRETS_ENV}/anchor/${slug}`
  // — the exact convention the prod Terraform + External Secrets Operator already use.
  // Locally we point the SAME AWS SDK at LocalStack via SECRETS_ENDPOINT, so there is
  // one code path for dev and prod (only the endpoint + creds differ).
  SECRETS_BACKEND: z.enum(['aws', 'memory']).default('aws'),
  SECRETS_PREFIX: z.string().default('nordstern'),
  SECRETS_ENV: z.string().default('testnet'),
  AWS_REGION: z.string().default('us-east-1'),
  // Set to LocalStack (http://localhost:4566) in dev; leave unset in prod to use real AWS.
  SECRETS_ENDPOINT: z.string().optional(),
  // LocalStack accepts any non-empty creds; real AWS uses the IAM role / ambient chain.
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);

// ── Fail-closed in production ────────────────────────────────────────────────
// A hosted deployment must NEVER run with the dev-default secrets baked into the
// compose file: those defaults are public, so they would allow JWT forgery across
// every realm and an admin/admin login. Refuse to boot — loudly — rather than run
// forgeable. (Local/testnet dev uses NODE_ENV=development and is unaffected.)
if (env.NODE_ENV === 'production') {
  const weak: string[] = [];
  if (/dev-access-secret/.test(env.JWT_ACCESS_SECRET) || env.JWT_ACCESS_SECRET.length < 24) weak.push('JWT_ACCESS_SECRET');
  if (/dev-refresh-secret/.test(env.JWT_REFRESH_SECRET) || env.JWT_REFRESH_SECRET.length < 24) weak.push('JWT_REFRESH_SECRET');
  if (!env.SERVICE_SECRET || /dev-service/.test(env.SERVICE_SECRET)) weak.push('SERVICE_SECRET');
  if (env.ADMIN_USERNAME === 'admin' || env.ADMIN_PASSWORD === 'admin' || env.ADMIN_PASSWORD.length < 8) weak.push('ADMIN_USERNAME/ADMIN_PASSWORD');
  if (weak.length) {
    throw new Error(
      `Refusing to start: NODE_ENV=production with weak or default secrets — ${weak.join(', ')}. ` +
      'Set strong, unique values (see the deployment checklist).',
    );
  }
}

export type Env = z.infer<typeof schema>;
