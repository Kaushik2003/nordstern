import { Router } from 'express';
import { z } from 'zod';
import { adminService } from '../../services/admin.service.js';
import { applicationService } from '../../services/application.service.js';
import { anchorInvitationService } from '../../services/anchorInvitation.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { signAdminToken } from '../../lib/jwt.js';
import { setAdminCookie, clearAdminCookie } from '../../lib/cookies.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { validateBody } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { ah } from '../../lib/asyncHandler.js';
import { notFound, unauthorized } from '../../lib/errors.js';
import { env } from '../../config/env.js';

// NordStern INTERNAL admin — the staff surface that reviews & approves anchor
// applications. A DISTINCT realm from operator (requireAuth) and customer auth: a
// single demo username/password issues an `ns_admin` cookie that is never
// interchangeable with the others. This is the deliberate stand-in for the real
// super-admin ROLE (Product 4 / founder-onboarding M4) — kept isolated so a
// customer/operator can never cross into admin.
export const adminRouter = Router();

// Reuse the auth throttle so the trivial demo credential can't be brute-forced trivially.
adminRouter.post('/login',
  authLimiter,
  validateBody(z.object({ username: z.string().min(1), password: z.string().min(1) })),
  ah(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
      throw unauthorized('Invalid admin credentials');
    }
    setAdminCookie(res, signAdminToken(username));
    res.json({ ok: true, username });
  }));

adminRouter.post('/logout', ah(async (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
}));

adminRouter.get('/me', requireAdmin, ah(async (_req, res) => {
  res.json({ username: res.locals.admin.username });
}));

// Full application queue (newest first), for the review table.
adminRouter.get('/applications', requireAdmin, ah(async (_req, res) => {
  res.json(await applicationService.list());
}));

// Approve → mint the invitation. Returns the raw token so the panel can render the
// redeem link (the only time it's ever shown). Provisioning still only happens when
// the founder redeems + a Test-mode app (production stays gated) — this just onboards.
adminRouter.post('/applications/:id/approve', requireAdmin, ah(async (req, res) => {
  const id = req.params.id as string;
  const result = await applicationService.approve(id);
  await recordAudit({
    action: 'application.approved', actorType: 'system', actorUserId: null,
    requestId: String(req.id),
    metadata: { applicationId: id, email: result.email, via: 'admin-panel', admin: res.locals.admin.username },
  });
  res.json({ email: result.email, rawToken: result.rawToken, applicationId: id });
}));

// Reject an application (no invitation minted). Service handles validation + the
// "application update" email; we just audit the actor.
adminRouter.post('/applications/:id/reject', requireAdmin, ah(async (req, res) => {
  const id = req.params.id as string;
  const updated = await applicationService.reject(id);
  await recordAudit({
    action: 'application.rejected', actorType: 'system', actorUserId: null,
    requestId: String(req.id),
    metadata: { applicationId: id, via: 'admin-panel', admin: res.locals.admin.username },
  });
  res.json({ ok: true, status: updated.status });
}));

// Operator BYPASS — explicitly launch a gated provisioning job. This is the ONLY path
// that provisions a MAINNET anchor: the public redeem flow always gates on mainnet, so a
// real-money anchor never launches from the user side. Admin-authenticated + audited.
adminRouter.post('/provisioning-jobs/:jobId/launch', requireAdmin, ah(async (req, res) => {
  const jobId = req.params.jobId as string;
  await anchorInvitationService.launchProvisioningJob(jobId);
  await recordAudit({
    action: 'provisioning.launched', actorType: 'system', actorUserId: null,
    requestId: String(req.id),
    metadata: { jobId, network: env.STELLAR_NETWORK, via: 'admin-panel', admin: res.locals.admin.username },
  });
  res.json({ ok: true, jobId });
}));

// ── Oversight (read-only) ───────────────────────────────────────────────────
// Cross-tenant views for the internal console. Every route is a plain read of the
// platform's own database. Anchor container health, asset issuance, and reconciliation
// live in the control-plane/aggregator and are NOT reachable from here — that needs a
// service-token proxy (see docs/project/ADMIN_CONSOLE_ROADMAP.md).

adminRouter.get('/overview', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.overview());
}));

adminRouter.get('/applications/:id', requireAdmin, ah(async (req, res) => {
  const app = await adminService.applicationById(req.params.id as string);
  if (!app) throw notFound('Application not found');
  res.json(app);
}));

adminRouter.get('/invitations', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.invitations());
}));

adminRouter.get('/anchors', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.anchors());
}));

adminRouter.get('/anchors/:id', requireAdmin, ah(async (req, res) => {
  const anchor = await adminService.anchorById(req.params.id as string);
  if (!anchor) throw notFound('Anchor not found');
  res.json(anchor);
}));

adminRouter.get('/organizations', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.organizations());
}));

adminRouter.get('/organizations/:id', requireAdmin, ah(async (req, res) => {
  const org = await adminService.organizationById(req.params.id as string);
  if (!org) throw notFound('Organization not found');
  res.json(org);
}));

adminRouter.get('/provisioning-jobs', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.provisioningJobs());
}));

adminRouter.get('/users', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.users());
}));

adminRouter.get('/sessions', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.activeSessions());
}));

adminRouter.get('/customers', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.customers());
}));

adminRouter.get('/customers/:id', requireAdmin, ah(async (req, res) => {
  const customer = await adminService.customerById(req.params.id as string);
  if (!customer) throw notFound('Customer not found');
  res.json(customer);
}));

// Credential inventory — metadata only. No secret value is ever selected.
adminRouter.get('/credentials', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.credentials());
}));

adminRouter.get('/audit-logs', requireAdmin, ah(async (_req, res) => {
  res.json(await adminService.auditLogs());
}));
