import { Router } from 'express';
import { z } from 'zod';
import { organizationService } from '../../services/organization.service.js';
import { invitationService } from '../../services/invitation.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { tenant } from '../../middleware/tenant.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';
import { notFound } from '../../lib/errors.js';
import { membersRouter } from './members.routes.js';
import { invitationsRouter } from './invitations.routes.js';
import { apiKeysRouter } from './apiKeys.routes.js';
import { auditLogsRouter } from './auditLogs.routes.js';

export const organizationsRouter = Router();
organizationsRouter.use(requireAuth);

// Accept an invitation (token-based, not org-scoped) — declared before /:orgId.
organizationsRouter.post('/invitations/accept',
  validateBody(z.object({ token: z.string().min(1) })),
  ah(async (req, res) => {
    const orgId = await invitationService.accept(req.body.token, req.user!.id);
    await recordAudit({ organizationId: orgId, action: 'org.invitation.accepted', actorType: 'user', actorUserId: req.user!.id, requestId: String(req.id) });
    res.json({ organizationId: orgId });
  }));

// Create an organization (onboarding).
organizationsRouter.post('/',
  validateBody(z.object({
    name: z.string().min(1),
    website: z.string().optional(),
    country: z.string().optional(),
    teamSize: z.string().optional(),
    primaryGoal: z.string().optional(),
  })),
  ah(async (req, res) => {
    const org = await organizationService.create(req.user!.id, req.body);
    await recordAudit({ organizationId: org.id, action: 'org.created', actorType: 'user', actorUserId: req.user!.id, requestId: String(req.id) });
    res.status(201).json(org);
  }));

// My organizations.
organizationsRouter.get('/', ah(async (req, res) => {
  res.json(await organizationService.list(req.user!.id));
}));

// Single org (tenant-guarded).
organizationsRouter.get('/:orgId', tenant, ah(async (req, res) => {
  const org = await organizationService.get(req.org!.id);
  if (!org) throw notFound();
  res.json({ ...org, role: req.org!.role });
}));

organizationsRouter.get('/:orgId/projects', tenant, ah(async (req, res) => {
  res.json(await organizationService.listProjects(req.org!.id));
}));

// Nested org-scoped resources (tenant guard applied before each sub-router).
organizationsRouter.use('/:orgId/members', tenant, membersRouter);
organizationsRouter.use('/:orgId/invitations', tenant, invitationsRouter);
organizationsRouter.use('/:orgId/api-keys', tenant, apiKeysRouter);
organizationsRouter.use('/:orgId/audit-logs', tenant, auditLogsRouter);
