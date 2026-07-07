import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { otps } from '../db/schema.js';

// Shared OTP challenge store for both customers and operators. `audience` keeps the two
// identity domains separate (a code minted for one can never be redeemed by the other).
export type OtpAudience = 'customer' | 'operator';

export const otpsRepo = {
  async create(email: string, audience: OtpAudience, codeHash: string, expiresAt: Date) {
    const [o] = await db.insert(otps).values({ email: email.toLowerCase(), audience, codeHash, expiresAt }).returning();
    return o;
  },

  latestValid: (email: string, audience: OtpAudience) =>
    db.query.otps.findFirst({
      where: and(
        eq(otps.email, email.toLowerCase()),
        eq(otps.audience, audience),
        isNull(otps.consumedAt),
        gt(otps.expiresAt, new Date()),
      ),
      orderBy: [desc(otps.createdAt)],
    }),

  async incrementAttempts(id: string) {
    const cur = await db.query.otps.findFirst({ where: eq(otps.id, id) });
    const [o] = await db.update(otps).set({ attempts: (cur?.attempts ?? 0) + 1 }).where(eq(otps.id, id)).returning();
    return o;
  },

  async consume(id: string) {
    await db.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, id));
  },
};
