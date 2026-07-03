import { Router } from 'express';
import { z } from 'zod';
import { membershipService } from '../../services/membership.service.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';

// Mounted at /organizations/:orgId/members (mergeParams to read :orgId).
export const membersRouter = Router({ mergeParams: true });

membersRouter.get('/', ah(async (req, res) => {
  res.json(await membershipService.list(req.org!.id));
}));

membersRouter.patch('/:memberId',
  requireRole('owner', 'admin'),
  validateBody(z.object({ role: z.enum(['owner', 'admin', 'member', 'billing']) })),
  ah(async (req, res) => {
    await membershipService.updateRole((req.params.memberId as string), req.body.role);
    res.json({ ok: true });
  }));

membersRouter.delete('/:memberId', requireRole('owner', 'admin'), ah(async (req, res) => {
  await membershipService.remove((req.params.memberId as string));
  res.json({ ok: true });
}));
