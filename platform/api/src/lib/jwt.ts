import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessClaims {
  sub: string; // user id
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;
}

// ── Customer session (email-OTP identity, distinct from operator tokens) ──────────
// A `typ: 'customer'` claim keeps customer and operator tokens from ever being accepted
// interchangeably even though they share the signing secret.
export interface CustomerClaims { sub: string; typ: 'customer' }

export function signCustomerToken(customerId: string): string {
  return jwt.sign({ sub: customerId, typ: 'customer' }, env.JWT_ACCESS_SECRET, { expiresIn: env.CUSTOMER_TOKEN_TTL });
}

export function verifyCustomerToken(token: string): CustomerClaims {
  const claims = jwt.verify(token, env.JWT_ACCESS_SECRET) as CustomerClaims;
  if (claims.typ !== 'customer') throw new Error('not a customer token');
  return claims;
}
