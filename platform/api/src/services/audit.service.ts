import { auditLogsRepo, type AuditEntry } from '../repositories/auditLogs.repo.js';
import { logger } from '../lib/logger.js';

// Fire-and-forget audit; never break the caller's request on an audit failure.
export async function recordAudit(entry: AuditEntry) {
  try {
    await auditLogsRepo.create(entry);
  } catch (err) {
    logger.error({ err }, 'audit write failed');
  }
}

export const auditService = {
  list: (orgId: string) => auditLogsRepo.listForOrg(orgId),
};
