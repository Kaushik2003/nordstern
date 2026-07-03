import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { COOKIE_ACCESS } from '../config/constants.js';
import { unauthorized } from '../lib/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_ACCESS];
  if (!token) return next(unauthorized('Not authenticated'));
  try {
    req.user = { id: verifyAccessToken(token).sub };
    next();
  } catch {
    next(unauthorized('Invalid or expired session'));
  }
}
