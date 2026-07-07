# R6 M2-c — Database Validation & Migration Readiness

> Validation + planning only. No migrations introduced, no runtime/boot/deploy
> changes. Grounded in the code at the M2-c branch state. Prepares M4.

## Phase 1 — Database ownership matrix

| Service | DB owned | Tooling | Schema management | Init flow (boot) | Versioned? | Boot SQL ≠ migration files? |
|---|---|---|---|---|:--:|:--:|
| **platform/api** | `nordstern_platform` (controlplane/SaaS) | **Drizzle ORM + drizzle-kit** | `src/db/schema.ts` + `drizzle/*.sql` (0000, 0001) + meta journal/snapshots | **None at boot** — `db/index.ts` only builds the query client; schema applied via `npm run db:migrate` (deploy-time) | ✅ Yes | n/a (migration files are the source; no boot DDL) |
| **anchor-service/control-plane** | `controldb` | raw `pg` | Imperative `initDb()` — `CREATE TABLE IF NOT EXISTS` ×6 + accreting `ALTER TABLE … ADD COLUMN IF NOT EXISTS` | **Runs `initDb()` on boot** | ❌ No | Boot SQL **is** the schema (no migration files) |
| **anchor-template/business-server** | per-anchor `nordstern` schema (money/KYC) | raw `pg` | Imperative `initSchema()` — `CREATE SCHEMA` + `CREATE TABLE IF NOT EXISTS` ×12 + `CREATE INDEX IF NOT EXISTS` + seed `INSERT`s | **Runs `initSchema()` on boot (per anchor)** | ❌ No | Boot SQL is the schema (no migration files) |
| **anchor-template/aggregator-service** | `aggregator` schema | raw `pg` | Imperative `initSchema()` — `CREATE SCHEMA` + `CREATE TABLE IF NOT EXISTS` ×6 + seed `INSERT`s | **Runs `initSchema()` on boot** | ❌ No | Boot SQL is the schema (no migration files) |
| _Anchor Platform_ (`anchordb`) | external | AP Java image (Flyway internal) | Managed by the `stellar/anchor-platform` container | Container-managed | ✅ (upstream) | Not ours — excluded |
| _anchor-service/business-server_ | **none** | — | Talks to AP Platform API + Stellar; no `pg` dependency | — | n/a | n/a |

Tables owned:
- **control-plane**: `users, tenants, anchor_secrets, anchor_adapters, tenant_config, reconciliation_alerts` (+ ~20 `ALTER ADD COLUMN` patches on `tenants`).
- **business-server**: `nordstern.{kyc_verifications, kyc_webhook_events, interactive_amounts, razorpay_payments, razorpay_webhook_events, deposit_releases, withdrawal_payouts, audit_logs, api_keys, webhook_deliveries, compliance_cases, strategy_config}`.
- **aggregator-service**: `aggregator.{anchors, routing_policies, quotes, health_metrics, routing_decisions, audit_logs}`.
- **platform/api**: 17 tables incl. `organizations, users, memberships, anchors, applications, provisioning_jobs, secret_refs, tenant_secrets, sessions, …`.

## Phase 2 — Drift analysis (explicit)

| Question | Answer |
|---|---|
| Already uses migrations | **platform/api** (Drizzle). |
| Creates tables at runtime | **control-plane, business-server, aggregator-service** (all `CREATE TABLE IF NOT EXISTS` on boot). |
| Relies on raw SQL | Same three. |
| Recreates schema on startup | All three run their init on every boot — **idempotent** (`IF NOT EXISTS`), so they don't *recreate*, but they are the sole schema authority. |
| Vulnerable to schema drift | **All three raw-SQL services: HIGH.** platform/api: **currently drifted** (see below). |

**Why the raw-SQL services drift (mechanism):** `CREATE TABLE IF NOT EXISTS` **does not alter an existing table**. If a column is added to a `CREATE TABLE` block in code, existing databases silently keep the old shape — only *fresh* databases get the new column. control-plane already shows the tell: ~20 hand-added `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements bolted on to patch existing DBs. business-server and aggregator have **no** such patch layer, so any past change to their `CREATE TABLE` blocks never reached already-provisioned anchor databases. A fresh anchor and a long-lived anchor can therefore have **different schemas** with no record of the difference. This is most dangerous in **business-server**, which owns the money tables (`deposit_releases`, `withdrawal_payouts`).

**platform/api is currently drifted (a real finding, surfaced by this milestone):**
`src/db/schema.ts` is **ahead of** the committed migrations (`0001`):
- `secret_refs` table — in `schema.ts`, **absent** from the `0001` snapshot.
- `anchors.branding` column — in `schema.ts`, **absent** from the `0001` snapshot.
- The `applications` table was restructured; `drizzle-kit generate` hits a rename/column **conflict** requiring a human decision.

The dev database was kept current via `drizzle-kit push` (schema.ts → DB directly), so the app worked — but the **migration files lag**, meaning a clean `db:migrate` (production path) would be **missing `secret_refs` + `branding`**. Latent production bug. **Deferred to M4** (needs rename-vs-drop decisions with data implications; not resolved in M2-c per scope).

## Phase 3 — CI validation implemented (this milestone)

New **`db.yml`** (path-filtered to `platform/api/**`; offline; no DB needed; `ci.yml` untouched):
- **`drizzle-kit check` — BLOCKING.** Validates committed migration consistency (journal + snapshots). Currently **passes** ("Everything's fine 🐶🔥").
- **schema-drift detection — ADVISORY (soft).** Runs `drizzle-kit generate` and classifies its output (its exit code is unreliable — it exits 0 even when bailing on a conflict). Reports drift to the job summary + a `::warning::`. **Non-blocking until M4** clears the pre-existing drift, then promoted to blocking.

No drift check is added for the raw-SQL services — they have no migration system to validate yet (that's what M4 builds).

## Phase 4 — M4 roadmap (execution-ready)

Goal of M4: bring the three raw-SQL services under versioned migrations **without a new ORM** (use `node-pg-migrate`, which fits raw `pg`, or Drizzle in `introspect` mode — decide per service in M4). For each:

### A. control-plane (`controldb`) — do FIRST (simplest, already semi-patched)
- **Strategy:** snapshot the *current* live schema (`CREATE TABLE` + all `ALTER ADD COLUMN`) as baseline migration `0000_baseline` via `pg_dump --schema-only` from a running DB; thereafter every change is a numbered migration.
- **Rollout:** keep `initDb()` for one release running migrations instead of inline DDL (call the migrator), then delete the inline DDL.
- **Compatibility:** baseline must be generated from a real DB dump (not from memory) so existing rows are untouched.
- **Deployment order:** control-plane is provisioning's backbone — migrate before touching per-anchor services.
- **Rollback:** each migration ships a `down`; baseline is non-destructive (no drops).

### B. business-server (per-anchor `nordstern`) — do SECOND (highest value: money tables)
- **Strategy:** baseline from a provisioned anchor's live `nordstern` schema; version thereafter. Migrations must run **per anchor** at stack start (replace `initSchema()` with a migrate step in the container entrypoint).
- **Rollout:** because each anchor has its own DB, the migrator must be idempotent and safe to run on N existing anchors; test against both a fresh and a long-lived anchor DB (they may already differ — reconcile in the baseline).
- **Compatibility:** money tables (`deposit_releases`, `withdrawal_payouts`) must never be dropped/recreated; additive only. Preserve the seed `INSERT`s as data migrations or idempotent seeds.
- **Deployment order:** after control-plane; roll out to one canary anchor before fleet-wide.
- **Rollback:** additive migrations + `down` scripts; snapshot each anchor DB (M5 backup) before applying.

### C. aggregator-service (`aggregator`) — do THIRD (lowest risk)
- **Strategy:** baseline from live `aggregator` schema; version thereafter. Single instance (not per-anchor) → simplest rollout.
- **Rollout:** replace `initSchema()` with migrate-on-start; preserve the initial-anchors seed as an idempotent seed migration.
- **Compatibility:** `health_metrics`/`quotes` are high-churn but structurally simple; additive changes only.
- **Deployment order:** last; independent of the money path.
- **Rollback:** `down` scripts; low blast radius.

### Cross-cutting M4 tasks
- **platform/api drift**: generate the overdue migration (`secret_refs`, `branding`, resolve the `applications` rename/drop), then flip `db.yml` drift check to **blocking**. This is M4 task #0.
- Add a `db:migrate` step to each service's container entrypoint/compose; **stop creating tables at boot**.
- CI: extend `db.yml` with a drift/consistency check per service once each has a migration dir.
- Depends on **M5 backups** for safe production application (snapshot before migrate).

**Recommended migration order:** platform/api drift → control-plane → business-server → aggregator-service.

## Deliverables checklist
- ✅ Database ownership matrix (Phase 1)
- ✅ Current schema-management strategy (Phase 1)
- ✅ Drift-risk assessment (Phase 2) — incl. a real pre-existing platform/api drift finding
- ✅ CI validation implemented (Phase 3 — `db.yml`: blocking consistency + advisory drift)
- ✅ Remaining work deferred to M4 (Phase 4)
- ✅ Recommended migration order (Phase 4)

## Verification (expected)
- `drizzle-kit check` passes → **existing migration validation passes**.
- drift step **detects** the schema.ts/migration mismatch and reports it (advisory) → **CI detects schema inconsistencies**.
- No runtime/boot/deploy/ORM changes; raw-SQL services untouched.

## Success criteria mapping
- Existing migration systems continuously validated → ✅ (`drizzle-kit check`, blocking).
- Schema drift detectable in CI → ✅ (advisory drift job).
- Every remaining DB has a documented migration path → ✅ (Phase 4).
- M4 is execution, not discovery → ✅ (ordered, per-service plan above).
