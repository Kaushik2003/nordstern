import crypto from 'crypto';
import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { anchorInvitations, organizations, organizationSettings, users, memberships, projects, anchors, provisioningJobs, applications, secretRefs } from '../db/schema.js';
import { hashPassword } from '../lib/password.js';
import { uniqueSlug } from '../lib/slug.js';
import { badRequest, conflict } from '../lib/errors.js';
import { provisionerService } from './provisioner.service.js';
import { secretStore } from '../lib/secrets/index.js';
import type { Credentials } from '../lib/secrets/index.js';

// Credentials an invitee may bring at redemption (post-approval). Optional — Test
// Mode works entirely on mock rails. Values go straight to the SecretStore; the DB
// only ever sees a reference (DL-010).
export interface RedemptionCredentials {
  razorpay?: Credentials;
  cashfree?: Credentials;
}

// Map the application's launch mode + supplied credentials to concrete adapters.
// Real rails only turn on when their credentials are actually present; identity is
// platform-owned (didit) for production, mock in test (until the Identity Service).
function resolveAdapters(mode: 'test' | 'production', creds: RedemptionCredentials) {
  return {
    kyc: mode === 'production' ? 'didit' : 'mock',
    deposit: creds.razorpay ? 'razorpay' : 'mock',
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
    password: string;
    credentials?: RedemptionCredentials;
  }) {
    const invitation = await this.verify(input.rawToken);

    // Load the vetted application to learn the chosen launch mode + product config.
    const application = invitation.applicationId
      ? await db.query.applications.findFirst({ where: eq(applications.id, invitation.applicationId) })
      : null;
    const product = (application?.product ?? {}) as any;
    const mode: 'test' | 'production' = product.mode === 'production' ? 'production' : 'test';
    const creds = input.credentials ?? {};
    const adapters = resolveAdapters(mode, creds);

    // Check slug collision
    const slug = input.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
    const slugClash = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });
    if (slugClash) throw conflict('Subdomain slug is already taken');

    const passwordHash = await hashPassword(input.password);

    // Run atomic redemption transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create User
      const [user] = await tx.insert(users).values({
        email: invitation.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash,
        emailVerifiedAt: new Date(),
        status: 'active'
      }).returning();

      // 2. Create Organization
      const [org] = await tx.insert(organizations).values({
        name: `${input.fullName}'s Organization`,
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
        name: `${org.name} Anchor`,
        slug,
        status: 'draft',
        network: 'testnet'
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

        // 1. Kick off the real control-plane lifecycle with the adapters resolved at
        // redemption (real rails where creds were supplied; mock otherwise).
        const handle = await provisionerService.start({
          name: payload.slug,
          adapters: payload.adapters ?? { kyc: 'mock', deposit: 'mock', payout: 'mock', fee: 'mock' },
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
