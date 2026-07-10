import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { PLATFORM_JWT_ACCESS_SECRET, NORDSTERN_API_URL, SERVICE_SECRET } from './config.js';

// ─── Customer session (the app's email-OTP identity) ────────────────────────────
// The customer app forwards the `ns_customer` cookie through the /biz proxy. It's an
// HS256 JWT signed by platform-api with the SAME secret operator tokens use, but tagged
// `typ:'customer'` — so this verifies it locally without a round-trip, and can never
// accept an operator token. Used to scope "my transactions" and start "my KYC".

const b64urlDecode = (s: string): Buffer => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function verifyCustomerToken(token: string): { sub: string } | null {
  if (!PLATFORM_JWT_ACCESS_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', PLATFORM_JWT_ACCESS_SECRET).update(`${header}.${payload}`).digest();
  let given: Buffer;
  try { given = b64urlDecode(signature); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let head: { alg?: string }; let claims: { sub?: string; typ?: string; exp?: number };
  try {
    head = JSON.parse(b64urlDecode(header).toString('utf8'));
    claims = JSON.parse(b64urlDecode(payload).toString('utf8'));
  } catch { return null; }
  if (head.alg !== 'HS256' || claims.typ !== 'customer' || !claims.sub) return null;
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null;
  return { sub: claims.sub };
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'ns_customer') return decodeURIComponent(v.join('='));
  }
  return null;
}

export function requireCustomerSession(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const claims = token ? verifyCustomerToken(token) : null;
  if (!claims) { res.status(401).json({ error: 'not signed in' }); return; }
  (req as Request & { customerId?: string }).customerId = claims.sub;
  next();
}

// Resolve the customer's linked wallet addresses from platform-api (service-secret). The
// anchor never stores the customer's wallet list — it asks the identity plane per request.
export async function fetchCustomerWallets(customerId: string): Promise<string[]> {
  if (!NORDSTERN_API_URL || !SERVICE_SECRET) return [];
  try {
    const res = await fetch(`${NORDSTERN_API_URL}/api/v1/internal/customers/${customerId}/wallets`, {
      headers: { 'x-service-secret': SERVICE_SECRET },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { addresses?: string[] };
    return body.addresses ?? [];
  } catch {
    return [];
  }
}
