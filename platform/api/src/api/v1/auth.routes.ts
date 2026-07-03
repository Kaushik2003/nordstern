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

export const authRouter = Router();
authRouter.use(authLimiter);

authRouter.post('/register',
  validateBody(z.object({ fullName: z.string().min(1), email: z.email(), password: z.string().min(8) })),
  ah(async (req, res) => {
    const user = await authService.register(req.body);
    await recordAudit({ action: 'user.registered', actorType: 'user', actorUserId: user.id, requestId: String(req.id), ip: req.ip });
    res.status(201).json({ id: user.id, email: user.email });
  }));

authRouter.post('/verify-email',
  validateBody(z.object({ token: z.string().min(1) })),
  ah(async (req, res) => {
    const userId = await authService.verifyEmail(req.body.token);
    await recordAudit({ action: 'user.email_verified', actorType: 'user', actorUserId: userId, requestId: String(req.id) });
    res.json({ ok: true });
  }));

authRouter.post('/login',
  validateBody(z.object({ email: z.email(), password: z.string().min(1) })),
  ah(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body, meta(req));
    setAuthCookies(res, accessToken, refreshToken);
    await recordAudit({ action: 'user.login', actorType: 'user', actorUserId: user.id, requestId: String(req.id), ip: req.ip });
    res.json({ id: user.id, email: user.email, fullName: user.fullName });
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

authRouter.post('/forgot-password',
  validateBody(z.object({ email: z.email() })),
  ah(async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    res.json({ ok: true }); // always ok — no account enumeration
  }));

authRouter.post('/reset-password',
  validateBody(z.object({ token: z.string().min(1), password: z.string().min(8) })),
  ah(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true });
  }));

authRouter.get('/me', requireAuth, ah(async (req, res) => {
  res.json(await authService.getMe(req.user!.id));
}));
