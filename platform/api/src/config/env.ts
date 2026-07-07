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
  // Empty default → host-only cookies (works for the platform console AND per-anchor
  // consoles on different hosts). Set only for a shared parent domain in prod.
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_SECURE: bool.default(false),

  // App / email
  APP_URL: z.string().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('NordStern <onboarding@resend.dev>'),

  // Vault (tenant_secrets) — 32-byte base64
  SECRETS_KEK: z.string().optional(),

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
export type Env = z.infer<typeof schema>;
