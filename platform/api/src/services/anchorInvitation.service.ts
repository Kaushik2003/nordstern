import crypto from 'crypto';
import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { anchorInvitations, organizations, organizationSettings, users, memberships, projects, anchors, provisioningJobs } from '../db/schema.js';
import { hashPassword } from '../lib/password.js';
import { uniqueSlug } from '../lib/slug.js';
import { badRequest, conflict } from '../lib/errors.js';
import { provisionerService } from './provisioner.service.js';

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
  }) {
    const invitation = await this.verify(input.rawToken);
    
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
          environment: 'sandbox'
        }
      }).returning();

      // 8. Mark invitation used
      await tx.update(anchorInvitations)
        .set({ usedAt: new Date() })
        .where(eq(anchorInvitations.id, invitation.id));

      return { user, org, anchor, job };
    });

    // In a real production setup, we trigger the background worker saga here.
    // For local dev, we run it asynchronously or resolve it.
    this.triggerProvisioningJob(result.job.id).catch(err => {
      console.error(`[onboarding-worker] Failed to trigger provisioning job ${result.job.id}:`, err);
    });

    return {
      success: true,
      organizationId: result.org.id,
      anchorId: result.anchor.id,
      jobId: result.job.id
    };
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

        // 1. Kick off the real control-plane lifecycle.
        const handle = await provisionerService.start({
          name: payload.slug,
          adapters: { kyc: 'mock', deposit: 'mock', payout: 'mock', fee: 'mock' }, // testnet-safe defaults
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
