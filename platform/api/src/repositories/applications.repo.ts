import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { applications } from '../db/schema.js';

export const applicationsRepo = {
  async create(data: {
    profile: any;
    stellarCfg: any;
    paymentRails: any;
    compliance: any;
  }) {
    const [app] = await db.insert(applications).values(data).returning();
    return app;
  },

  findById(id: string) {
    return db.query.applications.findFirst({ where: eq(applications.id, id) });
  },

  list() {
    return db.query.applications.findMany({
      orderBy: (apps, { desc }) => [desc(apps.createdAt)]
    });
  },

  async updateStatus(id: string, status: string) {
    const [updated] = await db.update(applications)
      .set({ status })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }
};
