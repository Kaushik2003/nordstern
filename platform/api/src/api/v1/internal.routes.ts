import { Router } from 'express';
import { z } from 'zod';
import { customersRepo } from '../../repositories/customers.repo.js';
import { customerWalletsRepo } from '../../repositories/customerWallets.repo.js';
import { validateBody } from '../../middleware/validate.js';
import { ah } from '../../lib/asyncHandler.js';
import { env } from '../../config/env.js';
import { badRequest, notFound, unauthorized } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';

// Service-to-service endpoints. Authenticated by a SHARED SECRET (x-service-secret), NOT a
// user session — only trusted backends (the anchor business-server) may call them. This is
// how a KYC decision reaches the central customer profile: the client can NEVER declare
// itself verified; only a secret-holder can, and only after DIDIT's signed webhook.
export const internalRouter = Router();

function requireService(req: Request, _res: Response, next: NextFunction) {
  const secret = req.header('x-service-secret');
  if (!env.SERVICE_SECRET) return next(badRequest('SERVICE_SECRET not configured'));
  if (!secret || secret !== env.SERVICE_SECRET) return next(unauthorized('bad service secret'));
  next();
}
internalRouter.use(requireService);

// Set a customer's KYC status. Identify by customerId, or by a linked wallet address
// (the account DIDIT verified). Never trusts the client — this route has no user session.
internalRouter.post('/customers/kyc',
  validateBody(z.object({
    customerId: z.string().uuid().optional(),
    walletAddress: z.string().optional(),
    status: z.enum(['unverified', 'pending', 'approved', 'declined']),
    diditSessionId: z.string().optional(),
  }).refine((b) => b.customerId || b.walletAddress, { message: 'customerId or walletAddress required' })),
  ah(async (req, res) => {
    const { customerId, walletAddress, status, diditSessionId } = req.body;

    let id = customerId as string | undefined;
    if (!id && walletAddress) {
      const w = await customerWalletsRepo.findByAddressAnyCustomer(walletAddress);
      if (!w) throw notFound('No customer linked to that wallet');
      id = w.customerId;
    }
    if (!id) throw badRequest('customerId or walletAddress required');

    const c = await customersRepo.findById(id);
    if (!c) throw notFound('Customer not found');

    await customersRepo.setKyc(id, status, diditSessionId);
    logger.info({ customerId: id, status }, 'customer KYC status set via service call');
    res.json({ ok: true, customerId: id, status });
  }),
);
