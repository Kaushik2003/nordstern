import { randomBytes, createHash } from 'crypto';
import { API_KEY_PREFIX } from '../config/constants.js';

/** Opaque token: return the raw value (sent to the user) + its sha256 hash (stored). */
export function generateToken(bytes = 32): { raw: string; hash: string } {
  const raw = randomBytes(bytes).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** API key: `nsk_<secret>`. Only the hash is stored; prefix + last4 are for display. */
export function generateApiKey(): { raw: string; keyPrefix: string; last4: string; keyHash: string } {
  const secret = randomBytes(24).toString('base64url');
  const raw = `${API_KEY_PREFIX}_${secret}`;
  return {
    raw,
    keyPrefix: `${API_KEY_PREFIX}_${secret.slice(0, 6)}`,
    last4: secret.slice(-4),
    keyHash: hashToken(raw),
  };
}
