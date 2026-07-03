import { Router } from 'express';
import { z } from 'zod';
import { apiKeyService } from '../../services/apiKey.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';

// Mounted at /organizations/:orgId/api-keys.
export const apiKeysRouter = Router({ mergeParams: true });

apiKeysRouter.get('/', ah(async (req, res) => {
  res.json(await apiKeyService.list(req.org!.id));
}));

apiKeysRouter.post('/',
  requireRole('owner', 'admin'),
  validateBody(z.object({ name: z.string().min(1), scopes: z.array(z.string()).optional(), projectId: z.uuid().optional() })),
  ah(async (req, res) => {
    const { apiKey, secret } = await apiKeyService.create(req.org!.id, req.user!.id, req.body);
    await recordAudit({ organizationId: req.org!.id, action: 'apikey.created', actorType: 'user', actorUserId: req.user!.id, resourceType: 'api_key', resourceId: apiKey.id, requestId: String(req.id) });
    res.status(201).json({ id: apiKey.id, name: apiKey.name, keyPrefix: apiKey.keyPrefix, last4: apiKey.last4, secret }); // secret shown once
  }));

apiKeysRouter.post('/:keyId/revoke', requireRole('owner', 'admin'), ah(async (req, res) => {
  await apiKeyService.revoke(req.org!.id, (req.params.keyId as string));
  await recordAudit({ organizationId: req.org!.id, action: 'apikey.revoked', actorType: 'user', actorUserId: req.user!.id, resourceType: 'api_key', resourceId: (req.params.keyId as string), requestId: String(req.id) });
  res.json({ ok: true });
}));
