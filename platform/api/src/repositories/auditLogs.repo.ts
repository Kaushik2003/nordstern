import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export interface AuditEntry {
  organizationId?: string | null;
  projectId?: string | null;
  actorType?: string;
  actorUserId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export const auditLogsRepo = {
  async create(entry: AuditEntry) {
    await db.insert(auditLogs).values(entry);
  },
  listForOrg(organizationId: string, limit = 100) {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  },
};
