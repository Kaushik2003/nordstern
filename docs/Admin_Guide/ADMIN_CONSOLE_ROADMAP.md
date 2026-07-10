# Admin console — what's live, and what it takes to light up the rest

> The NordStern **internal** admin console (`admin.*`, `platform/admin-console`). This is the
> staff god-view across every tenant. It is **not** the per-anchor operator console the founder
> gets (`anchor-template/console`) — configuring an anchor's limits, fees, and treasury belongs
> there, not here. Admin is oversight plus a small set of god-actions.

Last updated: 2026-07-10.

---

## 1. The constraint that shapes everything

The data an admin god-view wants is spread across four places. The admin realm — a distinct
auth realm gated by the `ns_admin` cookie ([`requireAdmin`](../../platform/api/src/middleware/requireAdmin.ts))
— can currently reach exactly one of them cheaply.

| Source | Holds | Reachable from `/admin/*`? |
|---|---|---|
| platform-api database (same process) | applications, orgs, projects, `anchors` stub, customers, wallets, api_keys, secret_refs, audit_logs, provisioning_jobs, sessions | **Yes, directly** |
| control-plane `:3002` (`tenants`) | stack_status, status_detail, container IDs, asset code/issuer, home_domain, tenant_config, reconciliation_alerts | No — needs a service-token proxy |
| aggregator `:3005` | fleet health, capabilities, quotes, routing | No — needs a proxy |
| per-anchor business-server | transactions, compliance cases, per-anchor KYC state | No — needs a per-anchor fan-out |

**Tier 1** = the first row. **Tier 2** = rows two through four: the data exists, we just have no
route to it. **Tier 3** = data that exists nowhere and must be designed and persisted first.

### The rule for unwired pages

An unwired page must **look** unwired. No placeholder numbers, no lorem rows, no synthetic
charts. AGENTS.md §6.6 forbids wiring synthetic data to a surface that reads as live, and a
screenshot of this console must never be mistaken for a working system. Tier 2 and Tier 3 pages
render their intended shape with every value as an em-dash, behind a banner naming where the
data lives and what would reach it. See [`components/scaffold.tsx`](../../platform/admin-console/components/scaffold.tsx).

---

## 2. Tier 1 — shipped and wired

All read-only. Endpoints live under `/api/v1/admin/*` behind `requireAdmin`
([`admin.routes.ts`](../../platform/api/src/api/v1/admin.routes.ts),
[`admin.service.ts`](../../platform/api/src/services/admin.service.ts)).

| Page | Endpoint | Shows |
|---|---|---|
| Overview | `GET /admin/overview` | Counts by status for applications, anchors, provisioning jobs, customer KYC; tenant/user/wallet/key totals; the 8 newest audit entries |
| Applications | `GET /admin/applications`, `/admin/invitations` | Full `profile`/`product` JSONB drill-down, invitation state (redeemed / awaiting / expired), approve + reject |
| Anchors | `GET /admin/anchors` | Every anchor with org, project, environment, network, lifecycle status, latest provisioning outcome |
| Anchor detail | `GET /admin/anchors/:id` | Identity, branding, full provisioning history, credential references (metadata only) |
| Organizations | `GET /admin/organizations`, `/:id` | Tenant list with member/anchor/project counts; detail with members, projects, anchors, API keys |
| Provisioning | `GET /admin/provisioning-jobs` | Every job with attempts, duration, error text, result payload |
| Operators | `GET /admin/users`, `/admin/sessions` | Accounts with org and session counts; active sessions with IP, client, expiry |
| Customers | `GET /admin/customers` | End-users with **real DIDIT KYC status**, wallet counts |
| Credentials | `GET /admin/credentials` | API-key inventory (prefix + last4) and provider secret references (`keyNames`, `lastRotatedAt`) |
| Audit log | `GET /admin/audit-logs` | 200 newest entries, filterable, with metadata and request ID |

### Invariants these pages hold

- **No secret value is ever selected.** `secret_refs` is metadata by design (DL-010): the query
  returns `keyNames` and `lastRotatedAt`, never a credential. `api_keys` exposes only the prefix
  and last four — the secret is stored hashed. Keep it that way.
- **`anchors.status` is not health.** It is the platform's coarse lifecycle enum
  (`draft → provisioning → active → error → suspended → removed`) and it can lag the real
  container state, which only the control-plane knows. Never label that column "health."
- **KYC status is real.** DIDIT is integrated; those numbers mean something.
- **Reconciliation alerts are demo-injected.** If they ever surface here, say so.

### Deliberately not built

Write actions beyond the existing approve/reject. Suspending an anchor, revoking a key, and
revoking a session are all reasonable god-actions with real backing, but each moves state and
none was requested. They belong in the Tier 2 work below, where suspend can be made to actually
stop containers rather than only flip a metadata flag.

---

## 3. Tier 2 — the data exists; build the proxy

The pattern to copy already exists:
[`provisioner.service.ts`](../../platform/api/src/services/provisioner.service.ts) authenticates
to the control-plane as a service operator (`CP_SERVICE_EMAIL` / `CP_SERVICE_PASSWORD`), holds
the JWT, and drives the real lifecycle over HTTP. A read proxy is the same thing with fewer
verbs.

### 3.1 Foundation: `controlPlaneClient` (do this first)

Everything else in Tier 2 depends on it.

- Extract the service-token bootstrap out of `provisioner.service.ts` into a shared client so
  both provisioning and admin reads use one token cache.
- The control-plane's service operator must hold the `admin` role for `GET /admin/anchors`
  (see [`control-plane/src/admin.ts`](../../anchor-service/control-plane/src/admin.ts)) —
  confirm the bootstrapped operator has it, or add a role grant.
- Mount new routes as `GET /admin/fleet/*` on platform-api. Keep the `/admin/*` prefix: the
  shared-auth client special-cases it to skip the operator refresh flow, and there is already a
  *different* `GET /anchors` (founder portfolio, `requireAuth`) plus a *different*
  `GET /admin/anchors` on the control-plane. Three distinct things; don't let them collide.

**Acceptance:** `GET /admin/fleet/anchors` returns every control-plane `tenants` row joined with
owner email and unresolved-alert count — the shape `control-plane GET /admin/anchors` already
returns today.

### 3.2 Anchor health (`/health`)

- **Backing:** control-plane `GET /admin/anchors` for `stack_status`, `status_detail`,
  `ap_container_id`, `biz_container_id`, `home_domain`, `asset_code`, `asset_issuer`.
  Aggregator `GET /anchors` + its health checks for endpoint liveness.
- **Build:** `GET /admin/fleet/health` → merge control-plane rows with aggregator health by slug.
- **Then:** enrich the Tier 1 anchors list and anchor-detail page with `status_detail` and
  container state, and give the anchor-detail "Runtime detail" section real values.
- **Caveat to keep:** the aggregator's `api_url` is container-internal
  (`http://business-server-<slug>:3000`), so this call only works from inside `nordstern-net`.

### 3.3 Reconciliation (`/alerts`)

- **Backing:** control-plane `reconciliation_alerts` and `tenant_config`. The per-anchor routes
  in [`control-plane/src/config.ts`](../../anchor-service/control-plane/src/config.ts) are
  ownership-scoped (`assertOwns`), so a fleet-wide admin read needs either a new admin route on
  the control-plane or a loop over anchors as the service operator.
- **Build:** `GET /admin/fleet/alerts`, plus a resolve action mapping to the existing
  `POST /config/:anchorId/alerts/:alertId/resolve`.
- **Blocker worth naming:** alerts are populated by `POST /config/:anchorId/alerts/inject`, a
  demo helper. A real reconciler comparing fiat balance to on-chain balance does not exist. The
  page is not trustworthy until it does — ship the reconciler before the UI stops carrying a
  warning.

### 3.4 Compliance (`/compliance`)

- **Backing:** each anchor's business server (`/compliance/cases`, `/compliance/audit`,
  transaction counts), one hop beyond the control-plane. Recorded registration fields
  (`fiu_registration_status`, `legal_entity_name`, `company_type`) come from control-plane `tenants`.
- **Build:** a fan-out proxy that resolves each active anchor's business-server URL from the
  aggregator and aggregates responses. Needs a per-anchor auth story — the business servers do
  not currently accept a platform admin token.
- **Hard constraint:** nothing on this page may render a legal conclusion. `fiu_registration_status`
  is a value a founder supplied about their own entity, not a determination NordStern reached.
  Whether NordStern or the anchor is the registering entity is open — see
  [COMPLIANCE_OPEN_QUESTIONS.md](./COMPLIANCE_OPEN_QUESTIONS.md).

### 3.5 God-actions (after the client exists)

| Action | Backing today | Gap |
|---|---|---|
| Suspend / unsuspend anchor | control-plane `PATCH /admin/anchors/:id` | **Metadata only — it does not stop containers.** Either make it stop them or label the button honestly. |
| Retry failed provisioning | `POST /anchors/:id/provision` (idempotent) | Needs the platform's `provisioningJobs` row updated in step |
| Teardown anchor | `DELETE /anchors/:id` | Destructive; needs a confirmation flow and an audit entry |
| Revoke API key / session | platform DB, trivial | Not built — read-only by choice |

Every god-action must write an `audit_logs` row with the acting admin username, the way
approve/reject already do.

---

## 4. Tier 3 — nothing persists this; design it first

These are **not** wiring tasks. The data was never recorded, so there is nothing to connect.

### 4.1 Billing (`/billing`)

- **Missing:** every table. No plan, invoice, revenue, or metering model exists in any service.
- **Needs, in order:** (1) a revenue-model decision — per-anchor subscription, basis points on
  volume, or both; (2) schema; (3) a metering pipeline reading transaction volume off the
  per-anchor business servers, which itself depends on the Tier 2 fan-out; (4) a processor for
  collection.
- **Blocked on:** the business model, not engineering.

### 4.2 Infrastructure (`/infrastructure`)

- **Missing:** any time series. The control-plane stores the *current* `stack_status` and nothing
  writes history. No metrics collector runs against the per-anchor containers.
- **Needs:** a metrics pipeline (Prometheus, or the Docker stats API via dockerode) writing to a
  time-series store, plus a health-history table. Uptime, MTTR, and SLA figures are all derived
  values — none can be computed until history is kept.
- **Note:** production infra hardening is deliberately out of MVP scope (DL-002). Don't build
  this before Phase 4.

### 4.3 Notifications (`/notifications`)

- **Missing:** `notification_rules` and `notification_deliveries`. Transactional founder email
  (application received / approved / rejected) does work via the platform mailer, but there is no
  rule engine, no channel abstraction, and no delivery log.
- **Needs:** the two tables, a `NotificationChannel` adapter interface with a mock default
  (per AGENTS.md §6.2 — email, Slack, webhook as implementations behind it), and an event source
  the rules can subscribe to. `audit_logs` is the obvious candidate event stream.

---

## 5. Suggested order

1. `controlPlaneClient` + `GET /admin/fleet/anchors` — unblocks everything in Tier 2, and
   immediately enriches the shipped anchors page with `status_detail`.
2. `/health` — highest operational value per unit of work.
3. God-actions (retry provisioning, honest suspend) — small, real, audited.
4. A genuine reconciler, *then* `/alerts`.
5. `/compliance` fan-out — largest surface, needs a per-anchor auth decision.
6. Tier 3, only when the business questions behind each are answered.
