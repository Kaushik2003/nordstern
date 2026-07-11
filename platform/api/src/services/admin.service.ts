import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  anchorInvitations, anchors, apiKeys, applications, auditLogs, customers, customerWallets,
  memberships, organizations, projects, provisioningJobs, secretRefs, sessions, users,
} from '../db/schema.js';

// Read model for the NordStern INTERNAL admin console — oversight across every tenant.
// Everything here is read-only and sourced from the platform's own database. Data that
// lives in the control-plane (`tenants`: container ids, stack_status, asset issuer) or the
// aggregator (fleet health) is deliberately absent: reaching it needs a service-token proxy
// that does not exist yet. See docs/Admin_Guide/ADMIN_CONSOLE_ROADMAP.md.
//
// Secret VALUES are never selected. `secret_refs` is metadata by design (DL-010) and this
// layer surfaces only which keys are set and when they last rotated.

// Turn a `[{ status, n }]` group-by into `{ status: n }` so callers can index it directly.
function tally<T extends { status: string | null; n: number }>(rows: T[]): Record<string, number> {
  return Object.fromEntries(rows.map((r) => [r.status ?? 'unknown', r.n]));
}

// COUNT() comes back as a bigint string over the wire; cast in SQL so JSON carries a number.
const countOf = (table: string, where: string) =>
  sql<number>`(SELECT COUNT(*)::int FROM ${sql.raw(table)} WHERE ${sql.raw(where)})`;

export const adminService = {
  // Fleet-wide counters + the newest audit entries. Powers the overview page.
  async overview() {
    const [
      appsByStatus, anchorsByStatus, jobsByStatus, kycByStatus,
      [orgTotal], [userTotal], [customerTotal], [walletTotal], [activeKeys], recentActivity,
    ] = await Promise.all([
      db.select({ status: applications.status, n: count() }).from(applications).groupBy(applications.status),
      db.select({ status: anchors.status, n: count() }).from(anchors).groupBy(anchors.status),
      db.select({ status: provisioningJobs.status, n: count() }).from(provisioningJobs).groupBy(provisioningJobs.status),
      db.select({ status: customers.kycStatus, n: count() }).from(customers).groupBy(customers.kycStatus),
      db.select({ n: count() }).from(organizations),
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(customers),
      db.select({ n: count() }).from(customerWallets),
      db.select({ n: count() }).from(apiKeys).where(eq(apiKeys.status, 'active')),
      db.select({
        id: auditLogs.id, action: auditLogs.action, actorType: auditLogs.actorType,
        resourceType: auditLogs.resourceType, createdAt: auditLogs.createdAt,
        metadata: auditLogs.metadata, actorEmail: users.email,
      })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(8),
    ]);

    return {
      applications: tally(appsByStatus),
      anchors: tally(anchorsByStatus),
      provisioningJobs: tally(jobsByStatus),
      customerKyc: tally(kycByStatus),
      totals: {
        organizations: orgTotal.n, users: userTotal.n, customers: customerTotal.n,
        wallets: walletTotal.n, activeApiKeys: activeKeys.n,
      },
      recentActivity,
    };
  },

  applicationById: (id: string) => db.query.applications.findFirst({ where: eq(applications.id, id) }),

  // Invitations minted on approve — shows which approvals were never redeemed.
  invitations: () =>
    db.select({
      id: anchorInvitations.id, email: anchorInvitations.email,
      applicationId: anchorInvitations.applicationId,
      expiresAt: anchorInvitations.expiresAt, usedAt: anchorInvitations.usedAt,
      createdAt: anchorInvitations.createdAt,
    }).from(anchorInvitations).orderBy(desc(anchorInvitations.createdAt)),

  // Every anchor across every tenant. `status` is the platform's coarse lifecycle value
  // (draft → provisioning → active …); it is NOT container health, which lives in the
  // control-plane. `latestJob*` is the most recent provisioning attempt per anchor.
  async anchors() {
    const rows = await db.select({
      id: anchors.id, name: anchors.name, slug: anchors.slug, status: anchors.status,
      network: anchors.network, branding: anchors.branding, createdAt: anchors.createdAt,
      organizationId: anchors.organizationId, organizationName: organizations.name,
      projectName: projects.name, environment: projects.environment,
    })
      .from(anchors)
      .leftJoin(organizations, eq(anchors.organizationId, organizations.id))
      .leftJoin(projects, eq(anchors.projectId, projects.id))
      .orderBy(desc(anchors.createdAt));

    // Newest job per anchor, in one round trip.
    const { rows: jobs } = await db.execute<{
      anchor_id: string; status: string; error: string | null; finished_at: Date | null;
    }>(sql`
      SELECT DISTINCT ON (anchor_id) anchor_id, status, error, finished_at
      FROM provisioning_jobs
      WHERE anchor_id IS NOT NULL
      ORDER BY anchor_id, created_at DESC
    `);
    const byAnchor = new Map(jobs.map((j) => [j.anchor_id, j]));

    return rows.map((a) => {
      const j = byAnchor.get(a.id);
      return {
        ...a,
        latestJobStatus: j?.status ?? null,
        latestJobError: j?.error ?? null,
        latestJobFinishedAt: j?.finished_at ?? null,
      };
    });
  },

  async anchorById(id: string) {
    const [anchor] = await db.select({
      id: anchors.id, name: anchors.name, slug: anchors.slug, status: anchors.status,
      network: anchors.network, branding: anchors.branding,
      createdAt: anchors.createdAt, updatedAt: anchors.updatedAt,
      organizationId: anchors.organizationId, organizationName: organizations.name,
      organizationSlug: organizations.slug,
      projectName: projects.name, environment: projects.environment,
    })
      .from(anchors)
      .leftJoin(organizations, eq(anchors.organizationId, organizations.id))
      .leftJoin(projects, eq(anchors.projectId, projects.id))
      .where(eq(anchors.id, id));

    if (!anchor) return null;

    const [jobs, secrets] = await Promise.all([
      db.select({
        id: provisioningJobs.id, type: provisioningJobs.type, status: provisioningJobs.status,
        attempts: provisioningJobs.attempts, error: provisioningJobs.error,
        payload: provisioningJobs.payload, result: provisioningJobs.result,
        startedAt: provisioningJobs.startedAt, finishedAt: provisioningJobs.finishedAt,
        createdAt: provisioningJobs.createdAt,
      }).from(provisioningJobs).where(eq(provisioningJobs.anchorId, id)).orderBy(desc(provisioningJobs.createdAt)),
      // Metadata only — `keyNames` says which keys exist, never their values.
      db.select({
        id: secretRefs.id, provider: secretRefs.provider, secretProvider: secretRefs.secretProvider,
        secretPath: secretRefs.secretPath, keyNames: secretRefs.keyNames,
        lastRotatedAt: secretRefs.lastRotatedAt, createdAt: secretRefs.createdAt,
      }).from(secretRefs).where(eq(secretRefs.anchorId, id)),
    ]);

    return { ...anchor, jobs, secrets };
  },

  organizations: () =>
    db.select({
      id: organizations.id, name: organizations.name, slug: organizations.slug,
      website: organizations.website, country: organizations.country,
      teamSize: organizations.teamSize, primaryGoal: organizations.primaryGoal,
      status: organizations.status, createdAt: organizations.createdAt,
      memberCount: countOf('memberships m', `m.organization_id = "organizations"."id"`),
      anchorCount: countOf('anchors a', `a.organization_id = "organizations"."id"`),
      projectCount: countOf('projects p', `p.organization_id = "organizations"."id"`),
    }).from(organizations).orderBy(desc(organizations.createdAt)),

  async organizationById(id: string) {
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, id) });
    if (!org) return null;

    const [members, orgProjects, orgAnchors, keys] = await Promise.all([
      db.select({
        id: memberships.id, role: memberships.role, createdAt: memberships.createdAt,
        userId: users.id, email: users.email, fullName: users.fullName,
        lastLoginAt: users.lastLoginAt, userStatus: users.status,
      }).from(memberships).innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.organizationId, id)),
      db.select().from(projects).where(eq(projects.organizationId, id)),
      db.select({
        id: anchors.id, name: anchors.name, slug: anchors.slug,
        status: anchors.status, network: anchors.network,
      }).from(anchors).where(eq(anchors.organizationId, id)),
      db.select({
        id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, last4: apiKeys.last4,
        scopes: apiKeys.scopes, status: apiKeys.status, lastUsedAt: apiKeys.lastUsedAt,
      }).from(apiKeys).where(eq(apiKeys.organizationId, id)),
    ]);

    return { ...org, members, projects: orgProjects, anchors: orgAnchors, apiKeys: keys };
  },

  provisioningJobs: () =>
    db.select({
      id: provisioningJobs.id, type: provisioningJobs.type, status: provisioningJobs.status,
      attempts: provisioningJobs.attempts, error: provisioningJobs.error,
      result: provisioningJobs.result,
      startedAt: provisioningJobs.startedAt, finishedAt: provisioningJobs.finishedAt,
      createdAt: provisioningJobs.createdAt,
      anchorId: provisioningJobs.anchorId, anchorName: anchors.name, anchorSlug: anchors.slug,
      organizationName: organizations.name,
    })
      .from(provisioningJobs)
      .leftJoin(anchors, eq(provisioningJobs.anchorId, anchors.id))
      .leftJoin(organizations, eq(provisioningJobs.organizationId, organizations.id))
      .orderBy(desc(provisioningJobs.createdAt))
      .limit(200),

  // Operators/founders. `activeSessions` counts un-revoked, unexpired sessions.
  users: () =>
    db.select({
      id: users.id, email: users.email, fullName: users.fullName, status: users.status,
      lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
      orgCount: countOf('memberships m', `m.user_id = "users"."id"`),
      activeSessions: countOf('sessions s', `s.user_id = "users"."id" AND s.revoked_at IS NULL AND s.expires_at > NOW()`),
    }).from(users).orderBy(desc(users.createdAt)),

  // Active operator sessions, newest use first — the "who is signed in" view.
  activeSessions: () =>
    db.select({
      id: sessions.id, userAgent: sessions.userAgent, ip: sessions.ip,
      lastUsedAt: sessions.lastUsedAt, expiresAt: sessions.expiresAt, createdAt: sessions.createdAt,
      email: users.email, organizationName: organizations.name,
    })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(organizations, eq(sessions.organizationId, organizations.id))
      .where(sql`${sessions.revokedAt} IS NULL AND ${sessions.expiresAt} > NOW()`)
      .orderBy(desc(sessions.lastUsedAt))
      .limit(100),

  // End-users of anchors. KYC status here is REAL DIDIT data.
  customers: () =>
    db.select({
      id: customers.id, email: customers.email, fullName: customers.fullName,
      kycStatus: customers.kycStatus, diditVerifiedAt: customers.diditVerifiedAt,
      lastLoginAt: customers.lastLoginAt, createdAt: customers.createdAt,
      walletCount: countOf('customer_wallets w', `w.customer_id = "customers"."id"`),
    }).from(customers).orderBy(desc(customers.createdAt)),

  async customerById(id: string) {
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
    if (!customer) return null;
    const wallets = await db.select({
      id: customerWallets.id, address: customerWallets.address, label: customerWallets.label,
      network: customerWallets.network, provenAt: customerWallets.provenAt,
      proofType: customerWallets.proofType, createdAt: customerWallets.createdAt,
    }).from(customerWallets).where(eq(customerWallets.customerId, id));
    // `diditSessionId` is an external reference, not a credential — safe to surface.
    return { ...customer, wallets };
  },

  // Credential INVENTORY. api_keys exposes prefix/last4 (already non-secret by design);
  // secret_refs exposes which keys are set and when. No values, ever.
  async credentials() {
    const [keys, refs] = await Promise.all([
      db.select({
        id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, last4: apiKeys.last4,
        scopes: apiKeys.scopes, status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt, revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
        organizationName: organizations.name, projectName: projects.name,
        createdByEmail: users.email,
      })
        .from(apiKeys)
        .leftJoin(organizations, eq(apiKeys.organizationId, organizations.id))
        .leftJoin(projects, eq(apiKeys.projectId, projects.id))
        .leftJoin(users, eq(apiKeys.createdByUserId, users.id))
        .orderBy(desc(apiKeys.createdAt)),
      db.select({
        id: secretRefs.id, slug: secretRefs.slug, provider: secretRefs.provider,
        secretProvider: secretRefs.secretProvider, secretPath: secretRefs.secretPath,
        keyNames: secretRefs.keyNames, lastRotatedAt: secretRefs.lastRotatedAt,
        createdAt: secretRefs.createdAt,
        organizationName: organizations.name, anchorName: anchors.name,
      })
        .from(secretRefs)
        .leftJoin(organizations, eq(secretRefs.organizationId, organizations.id))
        .leftJoin(anchors, eq(secretRefs.anchorId, anchors.id))
        .orderBy(desc(secretRefs.createdAt)),
    ]);
    return { apiKeys: keys, secretRefs: refs };
  },

  auditLogs: (limit = 200) =>
    db.select({
      id: auditLogs.id, action: auditLogs.action, actorType: auditLogs.actorType,
      resourceType: auditLogs.resourceType, resourceId: auditLogs.resourceId,
      metadata: auditLogs.metadata, requestId: auditLogs.requestId,
      ip: auditLogs.ip, userAgent: auditLogs.userAgent, createdAt: auditLogs.createdAt,
      actorEmail: users.email, organizationName: organizations.name,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit),
};
