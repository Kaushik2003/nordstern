import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { memberships, users } from '../db/schema.js';
import type { OrgRole } from '../config/constants.js';

export const membershipsRepo = {
  async create(organizationId: string, userId: string, role: OrgRole) {
    const [m] = await db.insert(memberships).values({ organizationId, userId, role }).returning();
    return m;
  },
  find(organizationId: string, userId: string) {
    return db.query.memberships.findFirst({
      where: and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)),
    });
  },
  listForOrg(organizationId: string) {
    return db.select({
      id: memberships.id,
      role: memberships.role,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      createdAt: memberships.createdAt,
    }).from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, organizationId));
  },
  async updateRole(id: string, role: OrgRole) {
    await db.update(memberships).set({ role }).where(eq(memberships.id, id));
  },
  async remove(id: string) {
    await db.delete(memberships).where(eq(memberships.id, id));
  },
};
