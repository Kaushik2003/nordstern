import type { Response } from 'express';
import { env } from '../config/env.js';
import { COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_CUSTOMER } from '../config/constants.js';

// Omit `domain` when COOKIE_DOMAIN is empty → HOST-ONLY cookies. This is what lets a
// per-anchor operator console at console.<slug>.<suffix> authenticate: it proxies
// /api/* same-origin to platform-api, and a host-only Set-Cookie binds to whatever
// origin the browser used (the console host) instead of a fixed `localhost`. A pinned
// Domain would be rejected cross-host. Set COOKIE_DOMAIN only for a real shared parent
// domain in production (e.g. `.nordstern.live`).
const base = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(COOKIE_ACCESS, accessToken, { ...base, maxAge: env.ACCESS_TOKEN_TTL * 1000 });
  res.cookie(COOKIE_REFRESH, refreshToken, { ...base, maxAge: env.REFRESH_TOKEN_TTL * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_ACCESS, base);
  res.clearCookie(COOKIE_REFRESH, base);
}

// Customer (email-OTP) session — a single host-only httpOnly cookie, no refresh pair.
export function setCustomerCookie(res: Response, token: string) {
  res.cookie(COOKIE_CUSTOMER, token, { ...base, maxAge: env.CUSTOMER_TOKEN_TTL * 1000 });
}
export function clearCustomerCookie(res: Response) {
  res.clearCookie(COOKIE_CUSTOMER, base);
}
