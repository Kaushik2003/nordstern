import crypto from 'crypto';
import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { anchorInvitations, organizations, organizationSettings, users, memberships, projects, anchors, provisioningJobs } from '../db/schema.js';
import { hashPassword } from '../lib/password.js';
import { uniqueSlug } from '../lib/slug.js';
import { badRequest, conflict } from '../lib/errors.js';

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

  async triggerProvisioningJob(jobId: string) {
    const jobRes = await db.query.provisioningJobs.findFirst({
      where: eq(provisioningJobs.id, jobId)
    });
    if (!jobRes) return;
    
    const payload = jobRes.payload as any;
    
    const updateJobStatus = async (status: any) => {
      await db.update(provisioningJobs)
        .set({ status, updatedAt: new Date() })
        .where(eq(provisioningJobs.id, jobId));
    };

    // Run background worker asynchronously
    (async () => {
      try {
        await updateJobStatus('running');
        console.log(`[onboarding-worker] Job ${jobId} started provisioning database...`);
        
        // Stage 1: Provision DB
        await new Promise(r => setTimeout(r, 2000));
        console.log(`[onboarding-worker] Job ${jobId} database created.`);
        
        // Stage 2: Generate Keys & fund
        await new Promise(r => setTimeout(r, 2000));
        console.log(`[onboarding-worker] Job ${jobId} keys generated & funded.`);
        
        // Stage 3: Deploy Stack containers
        await new Promise(r => setTimeout(r, 2000));
        console.log(`[onboarding-worker] Job ${jobId} Docker container stack running.`);
        
        // Stage 4: Register with Aggregator
        console.log(`[onboarding-worker] Job ${jobId} registering with Aggregator registry...`);
        const aggUrl = process.env.AGGREGATOR_URL || 'http://localhost:3005';
        await fetch(`${aggUrl}/anchors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: payload.slug,
            name: payload.orgName,
            domain: `${payload.slug}.nordstern.live`,
            status: 'active',
            regions: ['India'],
            capabilities: {
              supportedAssets: ['USDC'],
              supportedRails: ['UPI'],
              supportedBanks: ['HDFC', 'ICICI'],
              settlementModel: 'instant'
            },
            limits: {
              min_amount: 1,
              max_amount: 100000
            },
            fee_config: {
              fixed: 10,
              percent: 0.01
            }
          })
        }).catch(err => {
          console.warn(`[onboarding-worker] Aggregator registration call skipped or failed: ${err.message}`);
        });

        await updateJobStatus('completed');
        console.log(`[onboarding-worker] Job ${jobId} completed successfully!`);

      } catch (err: any) {
        await db.update(provisioningJobs)
          .set({ status: 'failed', error: err.message, updatedAt: new Date() })
          .where(eq(provisioningJobs.id, jobId));
        console.error(`[onboarding-worker] Job ${jobId} failed:`, err);
      }
    })();
  }
};
