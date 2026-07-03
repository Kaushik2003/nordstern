import type { Response } from 'express';
import { env } from '../config/env.js';
import { COOKIE_ACCESS, COOKIE_REFRESH } from '../config/constants.js';

const base = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  domain: env.COOKIE_DOMAIN,
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
