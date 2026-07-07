import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerOtps } from '../db/schema.js';

export const customerOtpsRepo = {
  async create(email: string, codeHash: string, expiresAt: Date) {
    const [o] = await db.insert(customerOtps).values({ email: email.toLowerCase(), codeHash, expiresAt }).returning();
    return o;
  },

  // Latest unconsumed, unexpired OTP for this email.
  latestValid: (email: string) =>
    db.query.customerOtps.findFirst({
      where: and(eq(customerOtps.email, email.toLowerCase()), isNull(customerOtps.consumedAt), gt(customerOtps.expiresAt, new Date())),
      orderBy: [desc(customerOtps.createdAt)],
    }),

  async incrementAttempts(id: string) {
    const [o] = await db.update(customerOtps).set({ attempts: (await db.query.customerOtps.findFirst({ where: eq(customerOtps.id, id) }))!.attempts + 1 }).where(eq(customerOtps.id, id)).returning();
    return o;
  },

  async consume(id: string) {
    await db.update(customerOtps).set({ consumedAt: new Date() }).where(eq(customerOtps.id, id));
  },
};
