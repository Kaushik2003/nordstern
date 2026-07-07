import { randomInt, createHash, timingSafeEqual } from 'crypto';

// 6-digit numeric OTP. Only the hash is stored; the raw code is emailed. No passwords
// anywhere in the customer identity model.
export function generateOtp(): { code: string; hash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return { code, hash: hashOtp(code) };
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function otpMatches(code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
