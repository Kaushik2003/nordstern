import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';

export const apiKeysRepo = {
  async create(data: {
    organizationId: string; projectId?: string | null; name: string;
    keyPrefix: string; keyHash: string; last4: string; scopes: string[]; createdByUserId?: string;
  }) {
    const [k] = await db.insert(apiKeys).values(data).returning();
    return k;
  },
  listForOrg(organizationId: string) {
    return db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      last4: apiKeys.last4,
      scopes: apiKeys.scopes,
      status: apiKeys.status,
      projectId: apiKeys.projectId,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.organizationId, organizationId));
  },
  async revoke(id: string, organizationId: string) {
    await db.update(apiKeys)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)));
  },
};
