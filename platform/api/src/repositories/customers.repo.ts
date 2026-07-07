import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers } from '../db/schema.js';

type NewProfile = { fullName?: string | null; preferences?: Record<string, unknown> };

export const customersRepo = {
  findByEmail: (email: string) =>
    db.query.customers.findFirst({ where: eq(customers.email, email.toLowerCase()) }),

  findById: (id: string) =>
    db.query.customers.findFirst({ where: eq(customers.id, id) }),

  async create(email: string) {
    const [c] = await db.insert(customers).values({ email: email.toLowerCase() }).returning();
    return c;
  },

  async updateProfile(id: string, patch: NewProfile) {
    const [c] = await db.update(customers).set(patch).where(eq(customers.id, id)).returning();
    return c;
  },

  async setKyc(id: string, kycStatus: 'unverified' | 'pending' | 'approved' | 'declined', diditSessionId?: string) {
    const [c] = await db.update(customers)
      .set({ kycStatus, ...(diditSessionId ? { diditSessionId } : {}), ...(kycStatus === 'approved' ? { diditVerifiedAt: new Date() } : {}) })
      .where(eq(customers.id, id)).returning();
    return c;
  },

  async touchLogin(id: string) {
    await db.update(customers).set({ lastLoginAt: new Date() }).where(eq(customers.id, id));
  },
};
