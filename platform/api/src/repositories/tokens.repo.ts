import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { emailVerificationTokens, passwordResetTokens } from '../db/schema.js';

export const verificationRepo = {
  async create(userId: string, tokenHash: string, expiresAt: Date) {
    const [t] = await db.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt }).returning();
    return t;
  },
  findByHash(tokenHash: string) {
    return db.query.emailVerificationTokens.findFirst({ where: eq(emailVerificationTokens.tokenHash, tokenHash) });
  },
  async consume(id: string) {
    await db.update(emailVerificationTokens).set({ consumedAt: new Date() }).where(eq(emailVerificationTokens.id, id));
  },
};

export const resetRepo = {
  async create(userId: string, tokenHash: string, expiresAt: Date) {
    const [t] = await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt }).returning();
    return t;
  },
  findByHash(tokenHash: string) {
    return db.query.passwordResetTokens.findFirst({ where: eq(passwordResetTokens.tokenHash, tokenHash) });
  },
  async consume(id: string) {
    await db.update(passwordResetTokens).set({ consumedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  },
};
