import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export const usersRepo = {
  async create(data: { email: string; fullName: string; passwordHash: string }) {
    const [u] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      passwordHash: data.passwordHash,
    }).returning();
    return u;
  },
  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  },
  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },
  async markVerified(id: string) {
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id));
  },
  async updateLastLogin(id: string) {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  },
  async updatePassword(id: string, passwordHash: string) {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  },
};
