import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { provisioningJobs, applications, organizations } from '../../db/schema.js';
import { anchorInvitationService } from '../../services/anchorInvitation.service.js';
import { provisionLimiter, pollLimiter, applicationLimiter } from '../../middleware/rateLimit.js';
import { ah } from '../../lib/asyncHandler.js';
import { env } from '../../config/env.js';
import { isReservedSlug } from '../../lib/slug.js';

// Public onboarding routes: an invitee (not yet a user) verifies + redeems their
// anchor invitation, which triggers the REAL provisioning lifecycle, then polls
// genuine status. Wires the existing anchorInvitationService to HTTP — no new logic.
export const anchorInvitationsRouter = Router();

// GET /anchor-invitations/verify?token=... — redeem-page pre-check
// Returns the platform's Stellar network so the redeem UI can gate the custom
// self-issued-token option to testnet only (minting is forbidden on mainnet).
anchorInvitationsRouter.get('/verify', applicationLimiter, ah(async (req, res) => {
  const inv = await anchorInvitationService.verify(String(req.query.token ?? ''));
  const network = env.STELLAR_NETWORK.toUpperCase() === 'PUBLIC' ? 'mainnet' : 'testnet';
  // Pull the applicant's name + business from the vetted application so the redeem
  // form can pre-fill them (the founder already told us at apply time).
  let name = '';
  let businessName = '';
  if (inv.applicationId) {
    const app = await db.query.applications.findFirst({ where: eq(applications.id, inv.applicationId) });
    const profile = (app?.profile ?? {}) as any;
    name = String(profile.contactPerson ?? '').trim();
    businessName = String(profile.legalEntityName ?? '').trim();
  }
  res.json({ email: inv.email, valid: true, network, name, businessName });
}));

// GET /anchor-invitations/subdomain-available?slug=... — live availability check for the
// redeem address step (PUBLIC, rate-limited). Mirrors the reserved + slug-clash rules the
// redeem flow enforces, so the founder gets instant feedback instead of failing at launch.
// Returns { available: true|false, reason? } — available:null when the slug is malformed.
anchorInvitationsRouter.get('/subdomain-available', applicationLimiter, ah(async (req, res) => {
  const raw = String(req.query.slug ?? '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(raw)) { res.json({ available: null }); return; }
  if (isReservedSlug(raw)) { res.json({ available: false, reason: 'reserved' }); return; }
  const clash = await db.query.organizations.findFirst({ where: eq(organizations.slug, raw) });
  res.json({ available: !clash, ...(clash ? { reason: 'taken' } : {}) });
}));

// POST /anchor-invitations/redeem — create org/anchor + start real provisioning.
// `credentials` (optional) carries the business's PSP keys; they go straight to the
// SecretStore and are never echoed back.
anchorInvitationsRouter.post('/redeem', provisionLimiter, ah(async (req, res) => {
  const { token, subdomain, fullName, credentials, branding, asset, settlementCurrency, limits } = (req.body ?? {}) as any;
  const result = await anchorInvitationService.redeem({ rawToken: token, subdomain, fullName, credentials, branding, asset, settlementCurrency, limits });
  res.status(201).json(result);
}));

// GET /anchor-invitations/status/:jobId — REAL provisioning status (Phase 6).
// `stage` is the control-plane's genuine progress string, not a simulated bar.
anchorInvitationsRouter.get('/status/:jobId', pollLimiter, ah(async (req, res) => {
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
// Disabled on a MAINNET platform: retry re-triggers provisioning, which would be a public
// bypass of the mainnet launch gate. On mainnet, an operator re-launches via the admin route.
anchorInvitationsRouter.post('/status/:jobId/retry', provisionLimiter, ah(async (req, res) => {
  if (env.STELLAR_NETWORK.toUpperCase() === 'PUBLIC') {
    res.status(403).json({ error: { code: 'mainnet_gated', message: 'Retry is disabled on mainnet — an operator launches anchors via the admin console.' } });
    return;
  }
  await anchorInvitationService.retryProvisioningJob(req.params.jobId as string);
  res.json({ ok: true });
}));
