import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessions } from '../db/schema.js';

export const sessionsRepo = {
  async create(data: {
    userId: string;
    organizationId?: string | null;
    refreshTokenHash: string;
    userAgent?: string;
    ip?: string;
    expiresAt: Date;
    rotatedFrom?: string;
  }) {
    const [s] = await db.insert(sessions).values(data).returning();
    return s;
  },
  findByRefreshHash(hash: string) {
    return db.query.sessions.findFirst({ where: eq(sessions.refreshTokenHash, hash) });
  },
  async revoke(id: string) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
  },
  async revokeAllForUser(userId: string) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
  },
  async touch(id: string) {
    await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, id));
  },
};
