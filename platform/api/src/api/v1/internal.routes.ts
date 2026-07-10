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
    // Verified identity attributes from the KYC decision — filled into the profile only if the
    // customer hasn't already set their own (their edits win). Optional.
    fullName: z.string().max(255).optional(),
    country: z.string().max(100).optional(),
  }).refine((b) => b.customerId || b.walletAddress, { message: 'customerId or walletAddress required' })),
  ah(async (req, res) => {
    const { customerId, walletAddress, status, diditSessionId, fullName, country } = req.body;

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
    // "Verify once" payoff: seed the profile with the verified name/country (fill-if-empty).
    if (status === 'approved' && (fullName || country)) {
      await customersRepo.fillIdentityIfEmpty(id, { fullName, country });
    }
    logger.info({ customerId: id, status }, 'customer KYC status set via service call');
    res.json({ ok: true, customerId: id, status });
  }),
);

// Read a customer's CENTRAL KYC status by a linked wallet address (or customerId). Lets an
// anchor business-server reuse "verify once" — if the customer who owns this wallet is already
// approved centrally, the anchor need not send them through DIDIT again. Read-only, service-
// gated. 404 when no customer is linked to that wallet (a wallet-only user) → caller falls
// back to its normal (per-account) verification.
internalRouter.get('/customers/kyc', ah(async (req, res) => {
  const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress : undefined;
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
  if (!walletAddress && !customerId) throw badRequest('walletAddress or customerId required');

  let id = customerId;
  if (!id && walletAddress) {
    const w = await customerWalletsRepo.findByAddressAnyCustomer(walletAddress);
    if (!w) throw notFound('No customer linked to that wallet');
    id = w.customerId;
  }
  const c = await customersRepo.findById(id!);
  if (!c) throw notFound('Customer not found');
  res.json({ customerId: c.id, status: c.kycStatus });
}));

// Resolve central customer PROFILES for a set of wallet addresses. Lets an anchor's operator
// console show who its customers are (name / email / country / KYC) for the accounts that have
// transacted with it — the "verify once" identity, surfaced to the operator of the anchor the
// customer actually used. Service-gated; only proven wallets resolve (unproven never stored).
internalRouter.post('/customers/profiles',
  validateBody(z.object({ addresses: z.array(z.string()).max(500) })),
  ah(async (req, res) => {
    const profiles: Record<string, { fullName: string | null; email: string; country: string | null; kycStatus: string }> = {};
    for (const address of new Set(req.body.addresses as string[])) {
      const w = await customerWalletsRepo.findByAddressAnyCustomer(address);
      if (!w) continue;
      const c = await customersRepo.findById(w.customerId);
      if (!c) continue;
      profiles[address] = {
        fullName: c.fullName,
        email: c.email,
        country: (c.preferences as Record<string, unknown> | null)?.country as string ?? null,
        kycStatus: c.kycStatus,
      };
    }
    res.json({ profiles });
  }),
);

// A customer's PROVEN wallet addresses. Lets the anchor business-server scope "my
// transactions" to the authenticated customer without holding the wallet list itself.
// Proven-only is the confidentiality boundary: history is visible only for wallets the
// customer cryptographically proved they own — never a merely-claimed address.
internalRouter.get('/customers/:id/wallets', ah(async (req, res) => {
  const addresses = await customerWalletsRepo.listProvenAddresses(req.params.id as string);
  res.json({ addresses });
}));
