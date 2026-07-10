import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers } from '../db/schema.js';

type NewProfile = { fullName?: string | null; preferences?: Record<string, unknown> };

// Shallow-merge a partial preferences object into the existing JSONB (so setting `avatar`
// never wipes `country`, and vice-versa).
const mergePrefs = (patch: Record<string, unknown>) =>
  sql`coalesce(${customers.preferences}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`;

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
    const set: Record<string, unknown> = {};
    if (patch.fullName !== undefined) set.fullName = patch.fullName;
    if (patch.preferences !== undefined) set.preferences = mergePrefs(patch.preferences);
    const [c] = await db.update(customers).set(set).where(eq(customers.id, id)).returning();
    return c;
  },

  // Fill verified identity from KYC WITHOUT clobbering anything the customer already set
  // (their chosen display name / country wins). Name is a column; country lives in preferences.
  async fillIdentityIfEmpty(id: string, data: { fullName?: string; country?: string }) {
    const c = await db.query.customers.findFirst({ where: eq(customers.id, id) });
    if (!c) return;
    const set: Record<string, unknown> = {};
    if (data.fullName && !c.fullName) set.fullName = data.fullName;
    const hasCountry = c.preferences && typeof (c.preferences as Record<string, unknown>).country === 'string';
    if (data.country && !hasCountry) set.preferences = mergePrefs({ country: data.country });
    if (Object.keys(set).length) await db.update(customers).set(set).where(eq(customers.id, id));
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
