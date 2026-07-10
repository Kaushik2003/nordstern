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
  validateBody(z.object({ email: z.string().email(), anchorName: z.string().max(80).optional() })),
  ah(async (req, res) => {
    await customerAuthService.requestOtp(req.body.email, req.body.anchorName);
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

// ── Linked wallets (proven signing capabilities) ─────────────────────────────
// A wallet is attached only after cryptographic proof of ownership (Identity Phase 1):
//   1. POST /wallets/challenge  → server returns a challenge tx to sign
//   2. POST /wallets/verify     → client returns the signed tx; server proves + records it
// The old unproven POST /wallets is gone: it let a logged-in user link any address they knew
// and read that anchor's transaction history for it (confidentiality breach).
customerRouter.get('/wallets', requireCustomer, ah(async (req, res) => {
  res.json(await customerService.listWallets(req.customer!.id));
}));

customerRouter.post('/wallets/challenge',
  requireCustomer,
  validateBody(z.object({ address: z.string(), network: z.enum(['testnet', 'mainnet']).default('testnet') })),
  ah(async (req, res) => {
    res.json(await customerService.createWalletChallenge(req.customer!.id, req.body.address, req.body.network));
  }),
);

customerRouter.post('/wallets/verify',
  requireCustomer,
  validateBody(z.object({ address: z.string(), signedXdr: z.string(), label: z.string().max(100).optional() })),
  ah(async (req, res) => {
    const w = await customerService.verifyWalletChallenge(req.customer!.id, req.body.address, req.body.signedXdr, req.body.label ?? null);
    res.status(201).json(w);
  }),
);

// Deprecated: linking without ownership proof is no longer accepted.
customerRouter.post('/wallets', requireCustomer, (_req, res) => {
  res.status(400).json({ error: { code: 'proof_required', message: 'Linking a wallet now requires ownership proof. Use /wallets/challenge then /wallets/verify.' } });
});

customerRouter.delete('/wallets/:id', requireCustomer, ah(async (req, res) => {
  await customerService.removeWallet(req.customer!.id, req.params.id as string);
  res.json({ ok: true });
}));

// ── KYC status (DIDIT linkage; stored centrally for cross-anchor reuse) ───────
customerRouter.get('/kyc/status', requireCustomer, ah(async (req, res) => {
  res.json(await customerService.kyc(req.customer!.id));
}));
