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
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: bool.default(false),

  // App / email
  APP_URL: z.string().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('NordStern <onboarding@resend.dev>'),

  // Vault (tenant_secrets) — 32-byte base64
  SECRETS_KEK: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
