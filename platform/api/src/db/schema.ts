import { relations, sql } from 'drizzle-orm';
import {
  pgTable, pgEnum, uuid, varchar, text, integer, jsonb, timestamp, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

// ════════════════════════════════════════════════════════════════════════════
// NordStern Control Plane — schema (Phase 3, refined)
//
// Tenancy: `organizations` is the tenant. Under an org sit `projects`
// (Stripe-style environment containers: sandbox / production / demo / testing).
// Anchors, api_keys, secrets, and provisioning jobs scope to a project (+ org).
// `users` are global identities (join many orgs via `memberships`).
// Every tenant-owned row carries `organization_id` for the central tenant guard.
// ════════════════════════════════════════════════════════════════════════════

// ── Enums ───────────────────────────────────────────────────────────────────
export const membershipRole     = pgEnum('membership_role', ['owner', 'admin', 'member', 'billing']);
export const invitationStatus   = pgEnum('invitation_status', ['pending', 'accepted', 'revoked', 'expired']);
export const organizationStatus = pgEnum('organization_status', ['active', 'suspended']);
export const userStatus         = pgEnum('user_status', ['active', 'suspended']);
export const apiKeyStatus       = pgEnum('api_key_status', ['active', 'revoked']);
export const anchorStatus       = pgEnum('anchor_status', ['draft', 'provisioning', 'active', 'error', 'suspended', 'removed']);
export const network            = pgEnum('network', ['testnet', 'mainnet']);
export const environment        = pgEnum('environment', ['sandbox', 'production', 'demo', 'testing']);
export const provisioningStatus = pgEnum('provisioning_status', ['pending', 'running', 'failed', 'completed', 'cancelled']);

// Reusable timestamp columns.
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
};

// ── Identity (global) ────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),          // stored lower-cased
  fullName: varchar('full_name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  status: userStatus('status').default('active').notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }), // active org context
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
  userAgent: varchar('user_agent', { length: 512 }),
  ip: varchar('ip', { length: 64 }),
  rotatedFrom: uuid('rotated_from'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('sessions_refresh_uq').on(t.refreshTokenHash),
  index('sessions_user_idx').on(t.userId),
]);

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('evt_token_uq').on(t.tokenHash), index('evt_user_idx').on(t.userId)]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('prt_token_uq').on(t.tokenHash), index('prt_user_idx').on(t.userId)]);

// ── Tenancy ──────────────────────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),           // acme → acme.nordstern.dev
  website: varchar('website', { length: 255 }),
  country: varchar('country', { length: 100 }),
  teamSize: varchar('team_size', { length: 50 }),             // onboarding step 2
  primaryGoal: varchar('primary_goal', { length: 50 }),       // onboarding step 3
  status: organizationStatus('status').default('active').notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('organizations_slug_uq').on(t.slug)]);

// Mutable preferences kept out of `organizations` so it doesn't accrue columns.
export const organizationSettings = pgTable('organization_settings', {
  organizationId: uuid('organization_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
  locale: varchar('locale', { length: 16 }).default('en').notNull(),
  currency: varchar('currency', { length: 8 }).default('USD').notNull(),
  theme: varchar('theme', { length: 16 }).default('light').notNull(),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: membershipRole('role').default('member').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('memberships_org_user_uq').on(t.organizationId, t.userId),
  index('memberships_user_idx').on(t.userId),
  index('memberships_org_idx').on(t.organizationId),
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: membershipRole('role').default('member').notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: invitationStatus('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('invitations_token_uq').on(t.tokenHash),
  index('invitations_org_idx').on(t.organizationId),
  index('invitations_email_idx').on(t.email),
]);

// ── Projects (environment containers) ────────────────────────────────────────
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  environment: environment('environment').default('sandbox').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('projects_org_slug_uq').on(t.organizationId, t.slug),
  index('projects_org_idx').on(t.organizationId),
]);

// Anchor stub — belongs to a project; inherits environment from it. Provisioning
// fields land when we wire the Data Plane.
export const anchors = pgTable('anchors', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  status: anchorStatus('status').default('draft').notNull(),
  network: network('network').default('testnet').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('anchors_org_slug_uq').on(t.organizationId, t.slug),
  index('anchors_org_idx').on(t.organizationId),
  index('anchors_project_idx').on(t.projectId),
]);

// ── Credentials & secrets ────────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }), // null = org-level mgmt key
  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 32 }).notNull(),  // shown for identification
  keyHash: varchar('key_hash', { length: 255 }).notNull(),     // hash of the full secret
  last4: varchar('last4', { length: 8 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().default(sql`'[]'::jsonb`).notNull(), // read|write|admin|anchor|payments
  status: apiKeyStatus('status').default('active').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('api_keys_hash_uq').on(t.keyHash),
  index('api_keys_org_idx').on(t.organizationId),
  index('api_keys_project_idx').on(t.projectId),
  index('api_keys_prefix_idx').on(t.keyPrefix),
]);

// Encrypted-at-rest secrets (envelope encryption; ciphertext/iv/tag). Never store
// Stellar seeds, webhook secrets, OAuth tokens, or provider creds in plaintext.
export const tenantSecrets = pgTable('tenant_secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 64 }).notNull(),   // stellar_secret_key | webhook_secret | oauth_token | provider_credential | ...
  name: varchar('name', { length: 255 }).notNull(),
  ciphertext: text('ciphertext').notNull(),
  iv: varchar('iv', { length: 64 }).notNull(),
  tag: varchar('tag', { length: 64 }).notNull(),
  metadata: jsonb('metadata'),                        // non-secret context (e.g. provider name)
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('tenant_secrets_org_idx').on(t.organizationId),
  index('tenant_secrets_project_idx').on(t.projectId),
  index('tenant_secrets_kind_idx').on(t.kind),
]);

// ── Async provisioning ───────────────────────────────────────────────────────
export const provisioningJobs = pgTable('provisioning_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  anchorId: uuid('anchor_id').references(() => anchors.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 64 }).notNull(),   // anchor.provision | anchor.teardown | ...
  status: provisioningStatus('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  payload: jsonb('payload'),                          // request spec
  result: jsonb('result'),                            // output
  error: text('error'),
  requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('prov_jobs_org_idx').on(t.organizationId),
  index('prov_jobs_project_idx').on(t.projectId),
  index('prov_jobs_anchor_idx').on(t.anchorId),
  index('prov_jobs_status_idx').on(t.status),
]);

// ── Audit (append-only) ──────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  actorType: varchar('actor_type', { length: 32 }),  // user | system | api_key
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),        // e.g. 'user.login', 'org.member.invited'
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: varchar('resource_id', { length: 255 }),
  metadata: jsonb('metadata'),
  requestId: varchar('request_id', { length: 64 }),
  ip: varchar('ip', { length: 64 }),
  userAgent: varchar('user_agent', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('audit_logs_org_created_idx').on(t.organizationId, t.createdAt),
  index('audit_logs_actor_idx').on(t.actorUserId),
  index('audit_logs_request_idx').on(t.requestId),
]);

// ── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sessions: many(sessions),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  settings: one(organizationSettings),
  memberships: many(memberships),
  invitations: many(invitations),
  projects: many(projects),
  anchors: many(anchors),
  apiKeys: many(apiKeys),
  secrets: many(tenantSecrets),
  provisioningJobs: many(provisioningJobs),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organizations, { fields: [organizationSettings.organizationId], references: [organizations.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, { fields: [invitations.organizationId], references: [organizations.id] }),
  invitedBy: one(users, { fields: [invitations.invitedByUserId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  organization: one(organizations, { fields: [sessions.organizationId], references: [organizations.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  anchors: many(anchors),
  apiKeys: many(apiKeys),
  secrets: many(tenantSecrets),
  provisioningJobs: many(provisioningJobs),
}));

export const anchorsRelations = relations(anchors, ({ one, many }) => ({
  organization: one(organizations, { fields: [anchors.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [anchors.projectId], references: [projects.id] }),
  provisioningJobs: many(provisioningJobs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, { fields: [apiKeys.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [apiKeys.projectId], references: [projects.id] }),
  createdBy: one(users, { fields: [apiKeys.createdByUserId], references: [users.id] }),
}));

export const tenantSecretsRelations = relations(tenantSecrets, ({ one }) => ({
  organization: one(organizations, { fields: [tenantSecrets.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [tenantSecrets.projectId], references: [projects.id] }),
}));

export const provisioningJobsRelations = relations(provisioningJobs, ({ one }) => ({
  organization: one(organizations, { fields: [provisioningJobs.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [provisioningJobs.projectId], references: [projects.id] }),
  anchor: one(anchors, { fields: [provisioningJobs.anchorId], references: [anchors.id] }),
}));

// ── Applications (onboarding wizard submission data) ─────────────────────────
// `profile` = business identity (name, contact, email, country, fiat, markets,
// optional registration). `product` = launch mode (test|production), rails, limits,
// fees. No Stellar internals and no BYO-KYC vendor — NordStern owns both. Secret
// payment-provider credentials are captured later, at invitation redemption.
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile: jsonb('profile').notNull(),
  product: jsonb('product').notNull(),
  status: varchar('status', { length: 30 }).default('applied').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── One-Time Cryptographic Invitations ───────────────────────────────────────
export const anchorInvitations = pgTable('anchor_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('anchor_invites_email_uq').on(t.email),
  uniqueIndex('anchor_invites_token_uq').on(t.tokenHash),
]);

