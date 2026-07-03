import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invitations } from '../db/schema.js';
import type { OrgRole } from '../config/constants.js';

export const invitationsRepo = {
  async create(data: {
    organizationId: string; email: string; role: OrgRole; tokenHash: string; invitedByUserId?: string; expiresAt: Date;
  }) {
    const [i] = await db.insert(invitations).values({ ...data, email: data.email.toLowerCase() }).returning();
    return i;
  },
  findByHash(tokenHash: string) {
    return db.query.invitations.findFirst({ where: eq(invitations.tokenHash, tokenHash) });
  },
  listForOrg(organizationId: string) {
    return db.select().from(invitations).where(eq(invitations.organizationId, organizationId));
  },
  async markAccepted(id: string) {
    await db.update(invitations).set({ status: 'accepted', acceptedAt: new Date() }).where(eq(invitations.id, id));
  },
  async markRevoked(id: string) {
    await db.update(invitations).set({ status: 'revoked' }).where(eq(invitations.id, id));
  },
};
