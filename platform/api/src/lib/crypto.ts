import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/env.js';

// Envelope encryption for tenant_secrets (AES-256-GCM). KEK from env (SECRETS_KEK,
// 32-byte base64). Production: move to KMS/HSM.
const ALGO = 'aes-256-gcm';

function kek(): Buffer {
  if (!env.SECRETS_KEK) throw new Error('SECRETS_KEK not set — cannot encrypt secrets');
  const k = Buffer.from(env.SECRETS_KEK, 'base64');
  if (k.length !== 32) throw new Error('SECRETS_KEK must decode to 32 bytes');
  return k;
}

export interface Sealed { ciphertext: string; iv: string; tag: string }

export function encryptSecret(plaintext: string): Sealed {
  const iv = randomBytes(12);
  const c = createCipheriv(ALGO, kek(), iv);
  const enc = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  return { ciphertext: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') };
}

export function decryptSecret(s: Sealed): string {
  const d = createDecipheriv(ALGO, kek(), Buffer.from(s.iv, 'base64'));
  d.setAuthTag(Buffer.from(s.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(s.ciphertext, 'base64')), d.final()]).toString('utf8');
}
