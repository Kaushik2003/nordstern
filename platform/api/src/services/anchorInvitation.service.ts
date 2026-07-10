import crypto from 'crypto';
import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { anchorInvitations, organizations, organizationSettings, users, memberships, projects, anchors, provisioningJobs, applications, secretRefs } from '../db/schema.js';
import { uniqueSlug, isReservedSlug } from '../lib/slug.js';
import { badRequest, conflict } from '../lib/errors.js';
import { provisionerService } from './provisioner.service.js';
import { secretStore } from '../lib/secrets/index.js';
import type { Credentials } from '../lib/secrets/index.js';
import { env } from '../config/env.js';
import { sendAnchorLiveEmail } from '../lib/mailer/index.js';

// Credentials an invitee may bring at redemption (post-approval). Optional — Test
// Mode works entirely on mock rails. Values go straight to the SecretStore; the DB
// only ever sees a reference (DL-010).
export interface RedemptionCredentials {
  razorpay?: Credentials;
  cashfree?: Credentials;
}

// White-label brand identity a business sets at redemption. OPEN shape (jsonb) so we
// can grow it (secondary accent, theme, fonts, hero, copy, emails) without a migration.
export interface Branding {
  displayName?: string;
  accent?: string;      // hex #RRGGBB
  logoUrl?: string;
  supportEmail?: string;
  websiteUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

// Keep only known, well-formed values — never persist junk. Invalid accent/URLs are
// dropped so render-time defaults (NordStern purple, monogram) kick in. Additive: an
// unknown future key can be whitelisted here without touching storage.
function sanitizeBranding(input: Branding | undefined): Record<string, string> {
  const b = input ?? {};
  const out: Record<string, string> = {};
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (str(b.displayName)) out.displayName = str(b.displayName).slice(0, 120);
  if (HEX.test(str(b.accent))) out.accent = str(b.accent);
  if (isHttpUrl(str(b.logoUrl))) out.logoUrl = str(b.logoUrl);
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(b.supportEmail))) out.supportEmail = str(b.supportEmail);
  if (isHttpUrl(str(b.websiteUrl))) out.websiteUrl = str(b.websiteUrl);
  if (isHttpUrl(str(b.privacyUrl))) out.privacyUrl = str(b.privacyUrl);
  if (isHttpUrl(str(b.termsUrl))) out.termsUrl = str(b.termsUrl);
  return out;
}

// Resolve the anchor's asset from the vetted application's product config. The founder either
// picked a preset (USDC/EURC) or named a custom token; either way we produce a valid Stellar
// asset code (1–12 alphanumerics, upper-cased) + a display name. Returns { code: undefined } for
// a legacy application that predates the asset field, so the control-plane can derive as before.
const PRESET_ASSETS: Record<string, { code: string; name: string }> = {
  USDC: { code: 'USDC', name: 'USD Coin' },
  EURC: { code: 'EURC', name: 'Euro Coin' },
};
function resolveChosenAsset(product: any): { code?: string; name?: string } {
  const preset = PRESET_ASSETS[product?.assetType];
  if (preset) return preset;
  const raw = String(product?.assetCode ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12);
  if (!raw) return {}; // legacy application: let the control-plane derive from slug
  return { code: raw, name: String(product?.assetName ?? '').trim() || raw };
}

// Map the application's launch mode + supplied credentials to concrete adapters.
// No-mock-rails rule (2026-07-10): every launched anchor uses REAL identity (DIDIT) and a
// REAL on-ramp — mock KYC / mock fiat-in are not allowed. `mode` still selects the network
// (test → testnet, production → mainnet); "no mock" means real *sandbox* rails on testnet,
// not mainnet. The on-ramp requirement is hard-gated in redeem() (must supply Razorpay creds).
function resolveAdapters(_mode: 'test' | 'production', creds: RedemptionCredentials) {
  return {
    kyc: 'didit',                                     // always real identity — never mock
    deposit: creds.razorpay ? 'razorpay' : 'mock',    // redeem() refuses launch without razorpay
    payout: creds.cashfree ? 'cashfree' : 'mock',
    fee: 'mock',
  };
}

export const anchorInvitationService = {
  async verify(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invitation = await db.query.anchorInvitations.findFirst({
      where: eq(anchorInvitations.tokenHash, tokenHash)
    });

    if (!invitation) throw badRequest('Invalid invitation token');
    if (invitation.usedAt) throw badRequest('Invitation has already been redeemed');
    if (new Date(invitation.expiresAt).getTime() < Date.now()) throw badRequest('Invitation has expired');

    return invitation;
  },

  async redeem(input: {
    rawToken: string;
    subdomain: string;
    fullName: string;
    credentials?: RedemptionCredentials;
    branding?: Branding;
  }) {
    const invitation = await this.verify(input.rawToken);
    const branding = sanitizeBranding(input.branding);

    // Load the vetted application to learn the chosen launch mode + product config.
    const application = invitation.applicationId
      ? await db.query.applications.findFirst({ where: eq(applications.id, invitation.applicationId) })
      : null;
    const product = (application?.product ?? {}) as any;
    const mode: 'test' | 'production' = product.mode === 'production' ? 'production' : 'test';
    // The founder's chosen asset (preset USDC/EURC or a custom code+name). Falls back only if a
    // legacy application predates the asset field. Code is normalised to a valid Stellar code.
    const asset = resolveChosenAsset(product);
    const creds = input.credentials ?? {};
    // No-mock-rails hard gate (2026-07-10): an anchor may not launch on a mock on-ramp.
    // Require a real fiat-in PSP (Razorpay Key ID + Secret) at redeem. Identity is already
    // forced to real DIDIT in resolveAdapters.
    if (!creds.razorpay?.RAZORPAY_KEY_ID?.trim() || !creds.razorpay?.RAZORPAY_KEY_SECRET?.trim()) {
      throw badRequest(
        'A real on-ramp is required to launch: provide your Razorpay Key ID and Secret in the payment section.',
      );
    }
    const adapters = resolveAdapters(mode, creds);

    // Normalise + validate the chosen subdomain.
    const slug = input.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!slug) throw badRequest('Subdomain must contain letters or digits');
    // Reserved: an anchor is served at <slug>.nordstern.live (and console-<slug>.…), so a
    // slug matching a platform host (admin/register/api/…) would hijack it.
    if (isReservedSlug(slug)) throw badRequest(`Subdomain "${slug}" is reserved — please choose another`);
    const slugClash = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });
    if (slugClash) throw conflict('Subdomain slug is already taken');

    // The org IS the business — name it after the vetted legal entity (from the
    // application), so the operator console and every surface brand as the real
    // business, not a generated placeholder. Fall back if the profile lacks a name.
    const profile = (application?.profile ?? {}) as any;
    const businessName: string = profile.legalEntityName?.trim() || `${input.fullName}'s Organization`;

    // Run atomic redemption transaction
    const result = await db.transaction(async (tx) => {
      // 1. Get or Create User
      let user = await tx.select().from(users).where(eq(users.email, invitation.email.toLowerCase())).limit(1).then(r => r[0]);
      if (!user) {
        [user] = await tx.insert(users).values({
          email: invitation.email.toLowerCase(),
          fullName: input.fullName,
          status: 'active'
        }).returning();
      }

      // 2. Create Organization
      const [org] = await tx.insert(organizations).values({
        name: businessName,
        slug,
        website: `https://${slug}.nordstern.live`,
        status: 'active'
      }).returning();

      // 3. Create Org Settings
      await tx.insert(organizationSettings).values({
        organizationId: org.id
      });

      // 4. Create Membership as Owner
      await tx.insert(memberships).values({
        organizationId: org.id,
        userId: user.id,
        role: 'owner'
      });

      // 5. Create Sandbox and Production Projects
      const [sandboxProj] = await tx.insert(projects).values({
        organizationId: org.id,
        name: 'Sandbox',
        slug: 'sandbox',
        environment: 'sandbox'
      }).returning();

      const [productionProj] = await tx.insert(projects).values({
        organizationId: org.id,
        name: 'Production',
        slug: 'production',
        environment: 'production'
      }).returning();

      // 6. Create Anchor stub (initially draft)
      const [anchor] = await tx.insert(anchors).values({
        organizationId: org.id,
        projectId: sandboxProj.id,
        name: businessName,
        slug,
        status: 'draft',
        network: 'testnet',
        branding,
      }).returning();

      // 7. Create Provisioning Job
      const [job] = await tx.insert(provisioningJobs).values({
        organizationId: org.id,
        projectId: sandboxProj.id,
        anchorId: anchor.id,
        type: 'anchor.provision',
        status: 'pending',
        attempts: 0,
        payload: {
          slug,
          orgName: org.name,
          email: invitation.email,
          environment: mode === 'production' ? 'production' : 'sandbox',
          mode,
          adapters,
          branding,
          assetCode: asset.code,
          assetName: asset.name,
        }
      }).returning();

      // 8. Mark invitation used
      await tx.update(anchorInvitations)
        .set({ usedAt: new Date() })
        .where(eq(anchorInvitations.id, invitation.id));

      return { user, org, anchor, job };
    });

    // Persist any supplied PSP credentials to the SecretStore BEFORE provisioning —
    // the control-plane reads them by the anchor's path when it launches the
    // business-server. Only a reference is written to the DB (DL-010).
    await this.storeCredentials(result.org.id, result.anchor.id, slug, creds);

    // Trigger provisioning ONLY for Test Mode. Production is a deliberate,
    // counsel-gated act (§7): the records + secret refs are created, but the job
    // stays pending for manual go-live review rather than auto-provisioning mainnet.
    if (mode === 'test') {
      this.triggerProvisioningJob(result.job.id).catch(err => {
        console.error(`[onboarding-worker] Failed to trigger provisioning job ${result.job.id}:`, err);
      });
    } else {
      await db.update(provisioningJobs)
        .set({ result: { stage: 'Awaiting production go-live review' }, updatedAt: new Date() })
        .where(eq(provisioningJobs.id, result.job.id));
    }

    return {
      success: true,
      organizationId: result.org.id,
      anchorId: result.anchor.id,
      jobId: result.job.id,
      mode,
      provisioning: mode === 'test' ? 'started' : 'gated',
    };
  },

  // Write each supplied provider's credentials to the SecretStore and record only a
  // reference row. Shared by redemption; operators later add/rotate via credentials.service.
  async storeCredentials(orgId: string, anchorId: string, slug: string, creds: RedemptionCredentials) {
    for (const provider of ['razorpay', 'cashfree'] as const) {
      const values = creds[provider];
      if (!values || Object.keys(values).length === 0) continue;
      const ref = await secretStore.put(slug, provider, values);
      await db.insert(secretRefs).values({
        organizationId: orgId,
        anchorId,
        slug,
        provider: ref.provider,
        secretProvider: ref.secretProvider,
        secretPath: ref.secretPath,
        keyNames: ref.keyNames,
        lastRotatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [secretRefs.slug, secretRefs.provider],
        set: { keyNames: ref.keyNames, secretPath: ref.secretPath, secretProvider: ref.secretProvider, lastRotatedAt: new Date(), updatedAt: new Date() },
      });
    }
  },

  // Drives the REAL provisioner (anchor-service/control-plane) end-to-end. No more
  // simulated stages: every progress update below reflects genuine execution reported
  // by the control-plane (keygen → Friendbot + asset issuance → config → dockerode
  // container stack → health), and on success the live anchor is registered with the
  // Aggregator. Progress is persisted to `provisioning_jobs.result.stage` (Phase 6).
  async triggerProvisioningJob(jobId: string) {
    const jobRes = await db.query.provisioningJobs.findFirst({
      where: eq(provisioningJobs.id, jobId)
    });
    if (!jobRes) return;

    const payload = jobRes.payload as any;

    const setJob = async (fields: Record<string, unknown>) => {
      await db.update(provisioningJobs).set({ ...fields, updatedAt: new Date() }).where(eq(provisioningJobs.id, jobId));
    };

    (async () => {
      try {
        await setJob({ status: 'running', startedAt: new Date(), attempts: (jobRes.attempts ?? 0) + 1 });

        // 1. Kick off the real control-plane lifecycle. On RETRY (a prior attempt
        // already created the control-plane anchor), RESUME that same anchor so the
        // slug — and therefore the secret path — stays stable and no orphan is left.
        const prior = (jobRes.result ?? {}) as any;
        const handle = prior.cpAnchorId
          ? await provisionerService.resume(prior.cpAnchorId)
          : await provisionerService.start({
              name: payload.slug,
              displayName: payload.orgName, // business name → per-anchor branding
              adapters: payload.adapters ?? { kyc: 'mock', deposit: 'mock', payout: 'mock', fee: 'mock' },
              branding: payload.branding ?? {},
              assetCode: payload.assetCode, // founder's chosen token (undefined → control-plane derives)
              assetName: payload.assetName,
            });
        const base = { cpAnchorId: handle.cpAnchorId, slug: handle.slug, homeDomain: handle.homeDomain };
        await setJob({ result: { ...base, stage: 'Provisioning started' } });

        // 2. Poll real status; surface the control-plane's genuine progress strings.
        const outcome = await provisionerService.waitUntilDone(handle, async (detail) => {
          await setJob({ result: { ...base, stage: detail } });
          console.log(`[provisioner] Job ${jobId}: ${detail}`);
        });
        if (outcome.status === 'error') throw new Error(`control-plane provisioning failed: ${outcome.detail}`);

        // 3. Register the LIVE anchor with the Aggregator (real endpoint + asset).
        await setJob({ result: { ...base, stage: 'Registering with Aggregator' } });
        await provisionerService.registerWithAggregator(outcome, payload.orgName);

        // 4. Mark the platform anchor active + the job completed.
        if (jobRes.anchorId) {
          await db.update(anchors).set({ status: 'active' }).where(eq(anchors.id, jobRes.anchorId));
        }
        await setJob({
          status: 'completed',
          finishedAt: new Date(),
          result: { ...base, assetCode: outcome.assetCode, assetIssuer: outcome.assetIssuer, stage: 'Completed' },
        });
        console.log(`[provisioner] Job ${jobId} → anchor '${outcome.slug}' live at ${outcome.homeDomain}, registered with aggregator`);

        // Tell the founder their anchor is live — with its real coordinates, the console link,
        // and the operating terms (fire-and-forget; never blocks provisioning completion).
        void sendAnchorLiveEmail(payload.email, payload.orgName ?? '', {
          slug: outcome.slug,
          homeDomain: outcome.homeDomain,
          assetCode: outcome.assetCode,
          assetIssuer: outcome.assetIssuer,
          network: payload.mode === 'production' ? 'mainnet' : 'testnet',
        });

      } catch (err: any) {
        await setJob({ status: 'failed', error: err.message, finishedAt: new Date() });
        console.error(`[provisioner] Job ${jobId} failed:`, err.message);
      }
    })();
  },

  // Retry a failed job (Phase 2 — "support retries"). Re-runs the real lifecycle;
  // `attempts` is incremented by triggerProvisioningJob.
  async retryProvisioningJob(jobId: string) {
    const job = await db.query.provisioningJobs.findFirst({ where: eq(provisioningJobs.id, jobId) });
    if (!job) throw badRequest('Provisioning job not found');
    if (job.status === 'running') throw badRequest('Job is already running');
    await db.update(provisioningJobs).set({ status: 'pending', error: null, updatedAt: new Date() }).where(eq(provisioningJobs.id, jobId));
    return this.triggerProvisioningJob(jobId);
  }
};
