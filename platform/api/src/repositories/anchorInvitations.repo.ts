import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { anchorInvitations } from '../db/schema.js';

export const anchorInvitationsRepo = {
  async create(data: {
    applicationId?: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const [inv] = await db.insert(anchorInvitations).values(data).returning();
    return inv;
  },

  findByTokenHash(tokenHash: string) {
    return db.query.anchorInvitations.findFirst({
      where: eq(anchorInvitations.tokenHash, tokenHash)
    });
  },

  findByEmail(email: string) {
    return db.query.anchorInvitations.findFirst({
      where: eq(anchorInvitations.email, email)
    });
  },

  async markUsed(id: string) {
    const [updated] = await db.update(anchorInvitations)
      .set({ usedAt: new Date() })
      .where(eq(anchorInvitations.id, id))
      .returning();
    return updated;
  }
};
