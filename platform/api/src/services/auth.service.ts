import { usersRepo } from '../repositories/users.repo.js';
import { sessionsRepo } from '../repositories/sessions.repo.js';
import { verificationRepo, resetRepo } from '../repositories/tokens.repo.js';
import { organizationsRepo } from '../repositories/organizations.repo.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken } from '../lib/jwt.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/mailer/index.js';
import { env } from '../config/env.js';
import { VERIFY_TOKEN_TTL_MS, RESET_TOKEN_TTL_MS } from '../config/constants.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

// Email delivery is best-effort at request time (should move to a queue/worker).
// A provider hiccup must not fail account creation — the token is already stored.
async function trySend(fn: Promise<void>, ctx: string) {
  try { await fn; } catch (err) { logger.warn({ err }, `email send failed: ${ctx}`); }
}

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
  async register(input: { fullName: string; email: string; password: string }) {
    if (await usersRepo.findByEmail(input.email)) throw conflict('An account with this email already exists');
    const user = await usersRepo.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
    });
    const t = generateToken();
    await verificationRepo.create(user.id, t.hash, new Date(Date.now() + VERIFY_TOKEN_TTL_MS));
    await trySend(sendVerificationEmail(user.email, `${env.APP_URL}/verify-email?token=${t.raw}`), 'verification');
    return user;
  },

  async verifyEmail(rawToken: string) {
    const row = await verificationRepo.findByHash(hashToken(rawToken));
    if (!row || row.consumedAt || row.expiresAt < new Date()) throw badRequest('Invalid or expired verification token');
    await verificationRepo.consume(row.id);
    await usersRepo.markVerified(row.userId);
    return row.userId;
  },

  async login(input: { email: string; password: string }, meta: SessionMeta) {
    const user = await usersRepo.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw unauthorized('Invalid email or password');
    if (user.status !== 'active') throw unauthorized('Account is suspended');
    await usersRepo.updateLastLogin(user.id);
    const tokens = await issueTokens(user.id, meta);
    return { user, ...tokens };
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

  async requestPasswordReset(email: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) return; // don't leak account existence
    const t = generateToken();
    await resetRepo.create(user.id, t.hash, new Date(Date.now() + RESET_TOKEN_TTL_MS));
    await trySend(sendPasswordResetEmail(user.email, `${env.APP_URL}/reset-password?token=${t.raw}`), 'password-reset');
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const row = await resetRepo.findByHash(hashToken(rawToken));
    if (!row || row.consumedAt || row.expiresAt < new Date()) throw badRequest('Invalid or expired reset token');
    await resetRepo.consume(row.id);
    await usersRepo.updatePassword(row.userId, await hashPassword(newPassword));
    await sessionsRepo.revokeAllForUser(row.userId); // force re-login everywhere
  },

  async getMe(userId: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw unauthorized();
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, emailVerifiedAt: user.emailVerifiedAt },
      organizations: await organizationsRepo.listForUser(userId),
    };
  },
};
