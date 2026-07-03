import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';

type Environment = 'sandbox' | 'production' | 'demo' | 'testing';

export const projectsRepo = {
  async create(data: { organizationId: string; name: string; slug: string; environment?: Environment }) {
    const [p] = await db.insert(projects).values(data).returning();
    return p;
  },
  listForOrg(organizationId: string) {
    return db.select().from(projects).where(eq(projects.organizationId, organizationId));
  },
};
