import { Router } from 'express';
import { z } from 'zod';
import { invitationService } from '../../services/invitation.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';

// Mounted at /organizations/:orgId/invitations.
export const invitationsRouter = Router({ mergeParams: true });

invitationsRouter.get('/', ah(async (req, res) => {
  res.json(await invitationService.list(req.org!.id));
}));

invitationsRouter.post('/',
  requireRole('owner', 'admin'),
  validateBody(z.object({ email: z.email(), role: z.enum(['owner', 'admin', 'member', 'billing']).default('member') })),
  ah(async (req, res) => {
    const inv = await invitationService.invite(req.org!.id, req.user!.id, req.body);
    await recordAudit({ organizationId: req.org!.id, action: 'org.invitation.created', actorType: 'user', actorUserId: req.user!.id, requestId: String(req.id), metadata: { email: req.body.email } });
    res.status(201).json({ id: inv.id, email: inv.email, role: inv.role, status: inv.status });
  }));

invitationsRouter.post('/:invitationId/revoke', requireRole('owner', 'admin'), ah(async (req, res) => {
  await invitationService.revoke((req.params.invitationId as string));
  res.json({ ok: true });
}));
