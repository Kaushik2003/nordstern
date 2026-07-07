# R6 M4 — Versioned Migrations

> Bring every service's schema evolution under versioned, reviewable, CI-validated
> migrations. Execution roadmap from `R6_M2c_DB_VALIDATION.md`. No new ORM.

## M4.0 — platform/api drift resolved ✅ (this increment)

The drift M2-c surfaced (schema.ts ahead of migrations) is now captured as versioned
Drizzle migrations — the highest immediate risk, because a fresh `db:migrate`
(production path) was previously missing `secret_refs` + `anchors.branding`.

- **`0002_drop_legacy_app_cols_add_secret_refs`** — creates `secret_refs` (+ FKs, indexes),
  adds `anchors.branding`, drops the legacy `applications.{stellar_cfg, payment_rails, compliance}` columns.
- **`0003_add_application_product`** — adds `applications.product`.

The `applications` restructure carried a rename-vs-drop ambiguity (`product` vs the
three dropped columns). Resolved deterministically as **drop + add** — `product` is a
genuinely new column from the R2 onboarding redesign, not a rename — by generating in
two unambiguous steps (no fragile interactive prompts). `schema.ts` was **not** edited;
the drift was fixed by generating the missing migrations.

**Verified:**
- `drizzle-kit check` → consistent.
- Full chain `0000→0003` **applies cleanly to a fresh Postgres**; resulting schema
  matches `schema.ts` (applications = id/profile/product/status/created_at/updated_at;
  `secret_refs` present; `anchors.branding` present).
- `drizzle-kit generate` → "No schema changes" (drift gone).

**CI hardened (`db.yml`):** the drift check is now **blocking** (was advisory in M2-c),
and a new step **applies the migrations to a real Postgres service** on every
platform/api PR. So from now on any `schema.ts` change without a matching migration
**fails CI**.

> Note: `0003` adds `product` as `NOT NULL` with no default — safe on fresh deploys
> (table empty). If `applications` ever needs migrating with existing rows, add a
> backfill/default first.

## Remaining increments (raw-SQL services — same pattern each)

Order and rationale unchanged from the M2-c roadmap. Each is its own reviewable PR:

### M4.1 — control-plane (`controldb`) ✅ (done)
- Introduced **node-pg-migrate** (raw `pg`; no new ORM).
- **Baseline** (`migrations/1719800000000_baseline.cjs`) = the exact `initDb()` DDL kept
  **fully idempotent** (`IF NOT EXISTS`), so existing control-plane DBs adopt migrations
  as a harmless no-op and fresh DBs are created. `initDb()` runtime DDL removed;
  `src/migrate.ts` runs **migrate-on-start** from `index.ts`.
- Dockerfile now ships `migrations/` into the runtime image.
- **Verified against real Postgres:** migrations reproduce the `initDb()` schema
  **byte-for-byte**; re-run is a no-op (idempotent); running against an existing
  initDb-built DB leaves all tenant/provisioning tables intact (backwards compatible);
  the built image boots, migrates on start, serves `/health`.
- **CI (`db.yml` `control-plane-migrations` job):** apply-on-fresh-DB (blocking),
  idempotency (blocking), and a **no-un-versioned-runtime-DDL guard** (blocking) — the
  raw-SQL analog of drift detection (all schema changes must be migrations).
- `db.yml` restructured into per-service jobs + a deadlock-safe **`db-required`**
  aggregation (also fixes a latent required-check/path-filter deadlock).
- Rollback: baseline ships a `down`; future migrations additive with `down`s.

### M4.2 — business-server (per-anchor `nordstern`, money DB) ✅ (done)
- **Baseline** (`migrations/1719800000000_baseline.cjs`) reproduces the exact `initSchema()`
  schema **and** its conditional seeds (compliance cases, hash-chained audit logs, mock
  API keys, default strategy config), idempotent (`IF NOT EXISTS` + `WHERE NOT EXISTS` seed
  guards). Runs **per anchor** at stack start via `runMigrations()`; `initSchema()` removed.
- The M3 money-flow harness now sets up via `runMigrations()` — tests exercise the real path.
- **Verified against real Postgres:** schema byte-for-byte identical + seed content identical
  (rows 4/5/2/1); **existing anchor with real money data** → `deposit_releases`/
  `withdrawal_payouts` rows **byte-identical** after adoption, seeds not duplicated, idempotent;
  **fresh anchor** image builds + migrate-on-start (12 tables + seeds) + `/health` ok;
  money-flow suite **green (14)** on the migrated schema.
- **CI (`db.yml` `business-server-migrations`):** apply + idempotency + no-runtime-DDL guard
  (blocking, under `db-required`). Additive-only; no destructive change/data rewrite/behaviour change.

### M4.3 — aggregator-service (`aggregator`) ✅ (done — M4 CLOSED)
- **Baseline** (`migrations/1719800000000_baseline.cjs`) reproduces the exact `initSchema()`
  6-table schema + both seed sets (2 demo anchors + balanced routing policy), idempotent
  (`IF NOT EXISTS` + `DO`-block "seed only if empty" guards). `runMigrations()` on start;
  `initSchema()` removed (runtime `writeAuditLog` helper kept).
- **Verified against real Postgres:** schema byte-for-byte identical + seed content identical
  (anchors 2, routing_policies 1); **existing DB** with runtime data (quote/health/decision/
  audit) → quote row byte-identical after adoption, seeds not duplicated, idempotent; **fresh
  boot** → migrate-on-start + engines functioning (registration ✅, health polling ✅,
  registry read ✅, quote/route engines run + health-filter as before).
- **CI (`db.yml` `aggregator-migrations`):** apply + idempotency + no-runtime-DDL guard, under `db-required`.
- No routing/quote algorithm change, no API change, additive-only.

---

## ✅ M4 CLOSED — every NordStern service on versioned, CI-enforced migrations
platform/api (Drizzle) · control-plane · business-server · aggregator-service — all four
DB-owning services now run migrate-on-start (no runtime schema creation), validated by the
blocking **`db-required`** check (apply-on-fresh-DB + idempotency + drift/no-runtime-DDL per
service). Original placeholder note below retained for history.
- Single instance → simplest rollout; independent of the money path.

### Cross-cutting
- Each service gets a `db.yml`-style consistency/apply/drift check once it has a migration dir.
- M5 backups are the safety precondition for applying migrations to any DB with data.

**Recommended order:** ✅ platform/api → control-plane → business-server → aggregator.
