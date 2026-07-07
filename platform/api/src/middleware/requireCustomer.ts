import type { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken } from '../lib/jwt.js';
import { COOKIE_CUSTOMER } from '../config/constants.js';
import { unauthorized } from '../lib/errors.js';

// Gates customer-facing routes on the `ns_customer` email-OTP session. Distinct from the
// operator `requireAuth` (different cookie + `typ: 'customer'` claim), so operator and
// customer sessions never cross.
export function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_CUSTOMER];
  if (!token) return next(unauthorized('Not signed in'));
  try {
    req.customer = { id: verifyCustomerToken(token).sub };
    next();
  } catch {
    next(unauthorized('Session expired — please sign in again'));
  }
}
