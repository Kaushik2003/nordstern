import { Router } from 'express';
import { z } from 'zod';
import { applicationService } from '../../services/application.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const applicationsRouter = Router();

// 1. Submit application (Public)
applicationsRouter.post('/',
  validateBody(z.object({
    companyProfile: z.any(),
    product: z.any()
  })),
  ah(async (req, res) => {
    const app = await applicationService.submit({
      profile: req.body.companyProfile,
      product: req.body.product
    });
    res.status(201).json(app);
  })
);

// 2. List applications (Admin authenticated)
applicationsRouter.get('/',
  requireAuth,
  ah(async (_req, res) => {
    const list = await applicationService.list();
    res.json(list);
  })
);

// 3. Approve application (Admin authenticated - public bypass for dev testing)
applicationsRouter.post('/:id/approve',
  ah(async (req, res) => {
    const result = await applicationService.approve(req.params.id as string);
    await recordAudit({
      action: 'application.approved',
      actorType: 'user',
      actorUserId: req.user?.id || null,
      requestId: String(req.id),
      metadata: { applicationId: req.params.id, email: result.email }
    });
    res.json(result);
  })
);
