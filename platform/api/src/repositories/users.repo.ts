import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export const usersRepo = {
  async create(data: { email: string; fullName?: string | null }) {
    const [u] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      fullName: data.fullName ?? null,
    }).returning();
    return u;
  },
  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  },
  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },
  async setFullName(id: string, fullName: string) {
    await db.update(users).set({ fullName }).where(eq(users.id, id));
  },
  async updateLastLogin(id: string) {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  },
};
