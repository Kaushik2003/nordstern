import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { customerAuthService } from '../../services/customerAuth.service.js';
import { customerService } from '../../services/customer.service.js';
import { requireCustomer } from '../../middleware/requireCustomer.js';
import { validateBody } from '../../middleware/validate.js';
import { setCustomerCookie, clearCustomerCookie } from '../../lib/cookies.js';
import { ah } from '../../lib/asyncHandler.js';

// Customer identity (email-OTP). Mounted at /api/v1/customer. Distinct from operator auth.
export const customerRouter = Router();

// Throttle OTP requests to blunt email-bombing / enumeration.
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

// ── Auth (no passwords) ──────────────────────────────────────────────────────
customerRouter.post('/auth/request-otp',
  otpLimiter,
  validateBody(z.object({ email: z.string().email() })),
  ah(async (req, res) => {
    await customerAuthService.requestOtp(req.body.email);
    // Always 200 — never reveal whether an account exists.
    res.json({ ok: true });
  }),
);

customerRouter.post('/auth/verify-otp',
  validateBody(z.object({ email: z.string().email(), code: z.string().min(4).max(8) })),
  ah(async (req, res) => {
    const { customer, token, isNew } = await customerAuthService.verifyOtp(req.body.email, req.body.code);
    setCustomerCookie(res, token);
    res.json({ customer, isNew });
  }),
);

customerRouter.post('/auth/logout', (_req, res) => { clearCustomerCookie(res); res.json({ ok: true }); });

// ── Profile ──────────────────────────────────────────────────────────────────
customerRouter.get('/me', requireCustomer, ah(async (req, res) => {
  res.json(await customerService.me(req.customer!.id));
}));

customerRouter.patch('/me',
  requireCustomer,
  validateBody(z.object({ fullName: z.string().min(1).max(255).optional(), preferences: z.record(z.string(), z.unknown()).optional() })),
  ah(async (req, res) => {
    res.json(await customerService.updateProfile(req.customer!.id, req.body));
  }),
);

// ── Linked wallets (secondary identities) ────────────────────────────────────
customerRouter.get('/wallets', requireCustomer, ah(async (req, res) => {
  res.json(await customerService.listWallets(req.customer!.id));
}));

customerRouter.post('/wallets',
  requireCustomer,
  validateBody(z.object({ address: z.string(), label: z.string().max(100).optional(), network: z.enum(['testnet', 'mainnet']).default('testnet') })),
  ah(async (req, res) => {
    const w = await customerService.addWallet(req.customer!.id, req.body.address, req.body.label ?? null, req.body.network);
    res.status(201).json(w);
  }),
);

customerRouter.delete('/wallets/:id', requireCustomer, ah(async (req, res) => {
  await customerService.removeWallet(req.customer!.id, req.params.id as string);
  res.json({ ok: true });
}));

// ── KYC status (DIDIT linkage; stored centrally for cross-anchor reuse) ───────
customerRouter.get('/kyc/status', requireCustomer, ah(async (req, res) => {
  res.json(await customerService.kyc(req.customer!.id));
}));
