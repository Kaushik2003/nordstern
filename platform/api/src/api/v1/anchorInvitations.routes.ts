import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { provisioningJobs } from '../../db/schema.js';
import { anchorInvitationService } from '../../services/anchorInvitation.service.js';
import { ah } from '../../lib/asyncHandler.js';

// Public onboarding routes: an invitee (not yet a user) verifies + redeems their
// anchor invitation, which triggers the REAL provisioning lifecycle, then polls
// genuine status. Wires the existing anchorInvitationService to HTTP — no new logic.
export const anchorInvitationsRouter = Router();

// GET /anchor-invitations/verify?token=... — redeem-page pre-check
anchorInvitationsRouter.get('/verify', ah(async (req, res) => {
  const inv = await anchorInvitationService.verify(String(req.query.token ?? ''));
  res.json({ email: inv.email, valid: true });
}));

// POST /anchor-invitations/redeem — create org/anchor + start real provisioning.
// `credentials` (optional) carries the business's PSP keys; they go straight to the
// SecretStore and are never echoed back.
anchorInvitationsRouter.post('/redeem', ah(async (req, res) => {
  const { token, subdomain, fullName, credentials, branding } = (req.body ?? {}) as any;
  const result = await anchorInvitationService.redeem({ rawToken: token, subdomain, fullName, credentials, branding });
  res.status(201).json(result);
}));

// GET /anchor-invitations/status/:jobId — REAL provisioning status (Phase 6).
// `stage` is the control-plane's genuine progress string, not a simulated bar.
anchorInvitationsRouter.get('/status/:jobId', ah(async (req, res) => {
  const job = await db.query.provisioningJobs.findFirst({
    where: eq(provisioningJobs.id, req.params.jobId as string),
  });
  if (!job) { res.status(404).json({ error: 'Provisioning job not found' }); return; }
  const result = (job.result ?? {}) as Record<string, unknown>;
  res.json({
    jobId: job.id,
    status: job.status,                       // pending | running | completed | failed
    stage: result.stage ?? null,              // e.g. "Funding accounts & issuing asset on Stellar"
    homeDomain: result.homeDomain ?? null,
    assetCode: result.assetCode ?? null,
    error: job.error ?? null,
    attempts: job.attempts,
  });
}));

// POST /anchor-invitations/status/:jobId/retry — re-drive a failed job (Phase 2).
anchorInvitationsRouter.post('/status/:jobId/retry', ah(async (req, res) => {
  await anchorInvitationService.retryProvisioningJob(req.params.jobId as string);
  res.json({ ok: true });
}));
