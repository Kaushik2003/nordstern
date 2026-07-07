import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { setAuthCookies, clearAuthCookies } from '../../lib/cookies.js';
import { COOKIE_REFRESH } from '../../config/constants.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { ah, meta } from '../../lib/asyncHandler.js';
import { unauthorized } from '../../lib/errors.js';

// Operator/founder auth — email + OTP only. No passwords, no verification/reset.
export const authRouter = Router();
authRouter.use(authLimiter);

// Request a one-time code. Always 200 — never leaks whether an account exists.
authRouter.post('/otp/request',
  validateBody(z.object({ email: z.email() })),
  ah(async (req, res) => {
    await authService.requestOtp(req.body.email);
    res.json({ ok: true });
  }));

// Verify the code → sign in (creating the account on first use). `fullName` is optional,
// used only when the account is first created (founder registration).
authRouter.post('/otp/verify',
  validateBody(z.object({ email: z.email(), code: z.string().min(4).max(8), fullName: z.string().min(1).max(255).optional() })),
  ah(async (req, res) => {
    const { user, isNew, accessToken, refreshToken } = await authService.verifyOtp(req.body.email, req.body.code, req.body.fullName, meta(req));
    setAuthCookies(res, accessToken, refreshToken);
    await recordAudit({ action: isNew ? 'user.registered' : 'user.login', actorType: 'user', actorUserId: user.id, requestId: String(req.id), ip: req.ip });
    res.json({ id: user.id, email: user.email, fullName: user.fullName, isNew });
  }));

authRouter.post('/refresh', ah(async (req, res) => {
  const raw = req.cookies?.[COOKIE_REFRESH];
  if (!raw) throw unauthorized('No session');
  const { accessToken, refreshToken } = await authService.refresh(raw, meta(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ ok: true });
}));

authRouter.post('/logout', ah(async (req, res) => {
  await authService.logout(req.cookies?.[COOKIE_REFRESH]);
  clearAuthCookies(res);
  res.json({ ok: true });
}));

authRouter.get('/me', requireAuth, ah(async (req, res) => {
  res.json(await authService.getMe(req.user!.id));
}));
