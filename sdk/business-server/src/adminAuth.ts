import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { PLATFORM_JWT_ACCESS_SECRET, NORDSTERN_API_URL, ANCHOR_SLUG } from './config.js';

// ─── Operator authentication for the money-admin API ────────────────────────────
// The /admin router exposes money-moving operations (treasury sweep/pause, refund,
// retry, API-key management, compliance resolution). The operator console proxies to
// it same-origin, forwarding the platform session cookie (`ns_access`, an HS256 JWT
// signed by platform-api with JWT_ACCESS_SECRET). We verify that token here so an
// unauthenticated caller — including anyone hitting the public Traefik `api.<slug>`
// host directly — cannot invoke financial operations.
//
// FAIL CLOSED: if the shared secret is not configured we reject every /admin request
// rather than silently allowing them. The provisioner always injects the secret; a
// misconfigured stack loses the dashboard, never its treasury.
//
// Scope note: this proves "a signed-in platform operator", not yet "an operator of
// THIS anchor's org" — cross-org scoping is a follow-up refinement, tracked separately.

const b64urlDecode = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verifyPlatformToken(token: string): { sub: string } | null {
  if (!PLATFORM_JWT_ACCESS_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  // 1. Signature (HS256 over `header.payload`), constant-time compared.
  const expected = crypto
    .createHmac('sha256', PLATFORM_JWT_ACCESS_SECRET)
    .update(`${header}.${payload}`)
    .digest();
  let given: Buffer;
  try { given = b64urlDecode(signature); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  // 2. Alg + expiry + subject.
  let head: { alg?: string }; let claims: { sub?: string; exp?: number };
  try {
    head = JSON.parse(b64urlDecode(header).toString('utf8'));
    claims = JSON.parse(b64urlDecode(payload).toString('utf8'));
  } catch { return null; }
  if (head.alg !== 'HS256') return null;
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null;
  if (!claims.sub) return null;
  return { sub: claims.sub };
}

// Pull `ns_access` from the forwarded Cookie header, or a Bearer token.
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'ns_access') return decodeURIComponent(v.join('='));
  }
  return null;
}

// Confirm the token holder actually operates THIS anchor's org by delegating to
// platform-api's existing membership check (GET /anchors/resolve?slug=). Reuses the
// same session cookie; no new endpoint, no platform DB access from the money server.
// Returns the operator's org role, or null if they don't operate this anchor.
async function resolveOrgRole(token: string): Promise<string | null> {
  if (!NORDSTERN_API_URL || !ANCHOR_SLUG) return null; // signal: scoping unavailable
  try {
    const res = await fetch(
      `${NORDSTERN_API_URL}/api/v1/anchors/resolve?slug=${encodeURIComponent(ANCHOR_SLUG)}`,
      { headers: { Cookie: `ns_access=${token}` } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { role?: string };
    return body.role ?? null;
  } catch {
    return null;
  }
}

export function requireOperator(req: Request, res: Response, next: NextFunction): void {
  (async () => {
    const token = extractToken(req);
    const claims = token ? verifyPlatformToken(token) : null;
    if (!token || !claims) {
      res.status(401).json({ error: 'unauthenticated: operator session required' });
      return;
    }

    // Org-scope when platform-api is reachable: the caller must operate THIS anchor's org.
    // Degrades to the authenticated-operator check only when scoping is unconfigured
    // (standalone dev with no platform), never to anonymous access.
    if (NORDSTERN_API_URL && ANCHOR_SLUG) {
      const role = await resolveOrgRole(token);
      if (!role) {
        res.status(403).json({ error: 'forbidden: not an operator of this anchor' });
        return;
      }
      (req as Request & { operator?: { sub: string; role: string } }).operator = { sub: claims.sub, role };
    } else {
      (req as Request & { operator?: { sub: string } }).operator = claims;
    }
    next();
  })().catch(() => {
    res.status(401).json({ error: 'unauthenticated' });
  });
}
