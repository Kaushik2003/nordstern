import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organizations, organizationSettings, memberships } from '../db/schema.js';

export const organizationsRepo = {
  async create(data: {
    name: string; slug: string; website?: string; country?: string; teamSize?: string; primaryGoal?: string;
  }) {
    const [o] = await db.insert(organizations).values(data).returning();
    return o;
  },
  findById(id: string) {
    return db.query.organizations.findFirst({ where: eq(organizations.id, id) });
  },
  async slugExists(slug: string) {
    const row = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug), columns: { id: true } });
    return !!row;
  },
  async createSettings(organizationId: string) {
    await db.insert(organizationSettings).values({ organizationId }).onConflictDoNothing();
  },
  /** Organizations the user belongs to, with their role. */
  listForUser(userId: string) {
    return db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      role: memberships.role,
      createdAt: organizations.createdAt,
    }).from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, userId));
  },
};
