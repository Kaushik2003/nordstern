import { Router } from 'express';
import { auditService } from '../../services/audit.service.js';
import { ah } from '../../lib/asyncHandler.js';

// Mounted at /organizations/:orgId/audit-logs.
export const auditLogsRouter = Router({ mergeParams: true });

auditLogsRouter.get('/', ah(async (req, res) => {
  res.json(await auditService.list(req.org!.id));
}));
