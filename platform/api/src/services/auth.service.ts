import { usersRepo } from '../repositories/users.repo.js';
import { sessionsRepo } from '../repositories/sessions.repo.js';
import { otpsRepo } from '../repositories/otps.repo.js';
import { organizationsRepo } from '../repositories/organizations.repo.js';
import { generateOtp, otpMatches } from '../lib/otp.js';
import { signAccessToken } from '../lib/jwt.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { sendOtpEmail } from '../lib/mailer/index.js';
import { env } from '../config/env.js';
import { OTP_TTL_MS, OTP_MAX_ATTEMPTS } from '../config/constants.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// Operator/founder authentication — email + OTP only. No passwords, no verification/reset.
// Session handling (access + rotating refresh, sessions table, cookies) is unchanged.

export interface SessionMeta { userAgent?: string; ip?: string }

async function issueTokens(userId: string, meta: SessionMeta, organizationId?: string | null, rotatedFrom?: string) {
  const refresh = generateToken();
  await sessionsRepo.create({
    userId,
    organizationId: organizationId ?? null,
    refreshTokenHash: refresh.hash,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000),
    rotatedFrom,
  });
  return { accessToken: signAccessToken(userId), refreshToken: refresh.raw };
}

export const authService = {
  // Email a one-time code. Always succeeds (never leaks whether an account exists).
  async requestOtp(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Enter a valid email address');
    const { code, hash } = generateOtp();
    await otpsRepo.create(email, 'operator', hash, new Date(Date.now() + OTP_TTL_MS));
    try { await sendOtpEmail(email, code); }
    catch (err) { logger.warn({ err }, 'operator OTP email send failed'); }
  },

  // Verify the code → find-or-create the operator → issue a session. `fullName` is used
  // only when the account is first created (founder registration).
  async verifyOtp(rawEmail: string, code: string, fullName: string | undefined, meta: SessionMeta) {
    const email = rawEmail.trim().toLowerCase();
    const otp = await otpsRepo.latestValid(email, 'operator');
    if (!otp) throw unauthorized('Code expired or not found — request a new one');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw unauthorized('Too many attempts — request a new code');
    if (!otpMatches(code.trim(), otp.codeHash)) {
      await otpsRepo.incrementAttempts(otp.id);
      throw unauthorized('Incorrect code');
    }
    await otpsRepo.consume(otp.id);

    let user = await usersRepo.findByEmail(email);
    const isNew = !user;
    if (!user) user = await usersRepo.create({ email, fullName: fullName?.trim() || null });
    else if (fullName?.trim() && !user.fullName) await usersRepo.setFullName(user.id, fullName.trim());
    if (user.status !== 'active') throw unauthorized('Account is suspended');
    await usersRepo.updateLastLogin(user.id);

    const tokens = await issueTokens(user.id, meta);
    return { user, isNew, ...tokens };
  },

  async refresh(rawRefresh: string, meta: SessionMeta) {
    const current = await sessionsRepo.findByRefreshHash(hashToken(rawRefresh));
    if (!current || current.revokedAt || current.expiresAt < new Date()) throw unauthorized('Invalid session');
    await sessionsRepo.revoke(current.id); // rotation
    const tokens = await issueTokens(current.userId, meta, current.organizationId, current.id);
    return { userId: current.userId, ...tokens };
  },

  async logout(rawRefresh?: string) {
    if (!rawRefresh) return;
    const current = await sessionsRepo.findByRefreshHash(hashToken(rawRefresh));
    if (current && !current.revokedAt) await sessionsRepo.revoke(current.id);
  },

  async getMe(userId: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw unauthorized();
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      organizations: await organizationsRepo.listForUser(userId),
    };
  },
};
