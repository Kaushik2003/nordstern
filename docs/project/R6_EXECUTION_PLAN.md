# R6 — Production Hardening: Execution Plan

> Planning only. No implementation until this plan is accepted and a milestone is
> started. Grounded in the code at `0fe4909`. Companion to
> `PRODUCTION_READINESS.md`.

## Principle

R6 is **not** one PR. It is **8 independent milestones**, each individually
reviewable, testable, and mergeable. Order is chosen so each milestone makes the
next one safer. Milestones M1→M4 are the load-bearing foundation; M5→M8 build on
the gate they create.

```
M1 Repo hygiene & guardrails      (S)  → unblocks a clean CI
M2 CI foundation                  (M)  → the merge gate everything plugs into
M3 Automated tests — money flows  (L)  → correctness safety net (flagship)
M4 Versioned migrations (all svc) (M)  → schema evolution without drift
M5 Backup & restore + DR runbook  (M)  → close the data-loss landmine
M6 Observability (OTel/Prom/Graf) (L)  → stop flying blind
M7 Security hardening             (M)  → CSP/CSRF/rate-limit/scanning/socket
M8 Stack consolidation            (M/L)→ one canonical anchor stack
```

Effort key: **S** ≈ ≤1 day · **M** ≈ 2–4 days · **L** ≈ 1–2 weeks.

---

## Current state (audited, not assumed)

| Concern | Already exists | Missing / partial |
|---|---|---|
| Tests | **nothing** (0 test deps, 0 `test` scripts) | everything |
| CI | none for product (only upstream `anchor-platform/`) | everything |
| Migrations | `platform/api` drizzle `0000`,`0001` + meta ✅ | control-plane (raw `IF NOT EXISTS`), runner step, drift check |
| Typecheck | `platform/api`, `aggregator-service` only | other 14 workspaces |
| Lint | none configured for product | everything |
| Logging | pino + requestId ✅ | metrics, tracing, alerting |
| Secrets scanning | none | gitleaks/CI |
| Backups | none | everything |
| Rate limit | `authLimiter` (auth routes) ✅ | all other routes |
| CSP/CSRF | helmet defaults only | tuned CSP, CSRF tokens |
| Repo hygiene | — | 307 tracked `.next` files (anchor-client), empty root `.gitignore`, junk `chat*.txt`, stale `CURRENT_STATE.md` |
| Duplicate stacks | — | `anchor-service/*` vs `anchor-template/*` |

---

## M1 — Repository hygiene & guardrails  *(S)*

**Objective.** Make the tree clean and self-defending so CI (M2) starts from a
known-good baseline and build artifacts can never re-enter history.

**Scope.**
- Remove tracked build artifacts: `git rm -r --cached anchor-template/anchor-client/.next` (307 files).
- Add a **root `.gitignore`** covering `**/.next/`, `**/dist/`, `**/node_modules/`, `**/*.tsbuildinfo`, `.env`, `.env.*` (keep `!.env.example`), `**/coverage/`.
- Delete junk: `anchor-template/chat.txt`, `chat2.txt`, stray `KYC_DIDIT*.txt` if not referenced, the `frontend/landing/.zshrc` junk if still present.
- Fix `CURRENT_STATE.md` (12-byte stub) or delete it.
- **Out of scope:** deleting either duplicate stack (that's M8).

**Files likely to change.** `/.gitignore` (new), `anchor-template/anchor-client/.gitignore`, removal of `.next/*`, `chat*.txt`, `CURRENT_STATE.md`.

**Dependencies.** None. Do first.

**Verification.** `git ls-files | grep -c '\.next/'` → `0`; fresh `next build` leaves working tree clean (`git status` clean); repo clone + `npm ci` unaffected.

**Effort.** S (≤ half a day).

**Risks.** Low. Only risk: a script depends on a committed `.next` (none found) — verify `docker build` for anchor-client still builds from source, not the committed artifact.

---

## M2 — CI foundation (GitHub Actions)  *(M)*

**Objective.** A required merge gate that runs on every PR: typecheck, lint, build,
secret-scan, and dependency audit across all product workspaces.

**Scope.**
- `.github/workflows/ci.yml`: matrix over the ~10 product workspaces (exclude `anchor-platform/`, `sep24-reference-ui/`). Per workspace: `npm ci` → `typecheck` → `lint` → `build` where applicable.
- Add missing `typecheck` scripts (`tsc --noEmit`) to the 14 workspaces lacking them.
- Introduce a **shared ESLint + Prettier** baseline (flat config) — start lenient (no churn), tighten later.
- **Secret scanning**: `gitleaks` action on PRs.
- **Dependency scanning**: `npm audit --audit-level=high` (non-blocking warn first, then blocking) + `.github/dependabot.yml` for the product workspaces.
- Cache `~/.npm` per workspace for speed.

**Files likely to change.** `.github/workflows/ci.yml` (new), `.github/dependabot.yml` (new), `eslint.config.mjs` + `.prettierrc` (root or per-workspace), `package.json` scripts across workspaces.

**Dependencies.** M1 (clean tree so the build/lint gate is green from day one).

**Verification.** Open a throwaway PR: all jobs run and pass; a deliberately broken type / an injected fake secret / a known-vuln dep each **fail** the gate. Branch protection requires the check.

**Effort.** M. Bulk is the lint baseline across 16 heterogeneous projects.

**Risks.** Lint on existing code surfaces many warnings → start with `--max-warnings` lenient / `warn` not `error`, ratchet later. Matrix flakiness → pin Node version, use `npm ci` with committed lockfiles (all present).

---

## M3 — Automated tests: money flows  *(L)*  ← flagship

**Objective.** A correctness safety net over the paths where a regression moves or
loses real money. This is the highest-value milestone in R6.

**Scope (priority order — test the irreversible first).**
1. **Idempotent deposit release** (outbox → on-chain send): duplicate trigger sends **once**; 5xx mid-flight doesn't double-send; status transitions are correct.
2. **Withdrawal poller dedupe** (off-ramp): re-processing the same incoming payment/memo is a no-op.
3. **SecretStore**: `put/get/rotate/delete` semantics; provider key namespacing; **credentials never returned unmasked**; memory backend refused in production.
4. **AnchorInvitation.redeem + provisioner**: branding sanitization (hex/URL/email validation, junk dropped); retry uses `resume()` (stable slug/secret path), not a new anchor.
5. **Auth/session**: login, role/tenant scoping on `resolve`, host-only cookie.
- Tooling: **Vitest** + **supertest** for HTTP; Postgres via **Testcontainers** (or an ephemeral compose service) for integration; LocalStack for SecretStore integration. Stub Horizon/AP with recorded fixtures — **no real testnet calls in CI**.
- Add `test` + `test:watch` + `coverage` scripts; wire `test` into the M2 gate.

**Files likely to change.** New `**/*.test.ts` beside sources in `platform/api/src/services|lib`, `anchor-service/business-server/src`, `anchor-service/control-plane/src`; `vitest.config.ts` per service; test helpers/fixtures; `package.json` scripts; `ci.yml` gains a `test` job.

**Dependencies.** M2 (gate to run in). Benefits from M4 (migrations to seed the test DB) but can bootstrap its own schema initially.

**Verification.** `npm test` green locally + in CI; coverage reported on the 5 target areas (aim ≥ 70% on money-path modules, not global); each test *fails* when its guard is inverted (mutation sanity-check a few).

**Effort.** L (1–2 weeks). Test **infrastructure** (Testcontainers, AP/Horizon stubs, fixtures) is the real cost; individual cases are fast after.

**Risks.** Over-mocking hides real bugs → prefer integration against a real Postgres + LocalStack. Testnet flakiness → never hit live networks in CI; record fixtures. Scope creep → **money paths only** in M3; UI/e2e is later.

---

## M4 — Versioned migrations across all services  *(M)*

**Objective.** One disciplined, ordered, reversible-where-possible migration story;
eliminate `CREATE TABLE IF NOT EXISTS` drift; add a CI drift check.

**Scope.**
- `platform/api`: already on drizzle migrations — add a **CI drift check** (`drizzle-kit check` / generate-and-diff must be clean) and make `db:migrate` the canonical startup path.
- **control-plane**: replace the imperative `db.ts` bootstrap with **versioned migrations** capturing current schema as `0000` baseline (users, tenants, anchor_secrets, anchor_adapters, tenant_config, reconciliation_alerts, branding column). Pick one tool — `node-pg-migrate` (fits raw `pg`) or adopt drizzle for parity.
- Add a **migrate-on-deploy** step (compose/entrypoint) instead of implicit table creation.
- Document the "add a column" workflow so agents stop hand-writing `ALTER … IF NOT EXISTS`.

**Files likely to change.** `anchor-service/control-plane/src/db.ts` (retire bootstrap), new `control-plane/migrations/*`, migration tool config, `docker-compose.platform.yml` (migrate step), `ci.yml` (drift job), `docs`/decision-log entry.

**Dependencies.** M2 (drift check runs in CI). Coordinates with M3 (shared test-DB seeding).

**Verification.** Fresh DB + run migrations → schema identical to today's (diff a `pg_dump --schema-only` before/after). CI drift check fails on an un-generated schema change. Idempotent re-run is a no-op.

**Effort.** M. Care needed to snapshot the *existing* prod-ish schema as baseline without a destructive reset.

**Risks.** Baselining a live schema wrong → data mismatch. Mitigate: generate baseline from an actual running DB dump, not from memory; test against a cloned volume.

---

## M5 — Backup & restore + DR runbook  *(M)*

**Objective.** Close the data-loss landmine: automated backups and a **tested**
restore before any real anchor config exists.

**Scope.**
- Automated `pg_dump` (both `anchordb` + `controldb`) on a schedule → durable, encrypted destination (local volume now; S3 in the K8s/R7 era).
- **SecretStore backup note**: secrets live in Secrets Manager/LocalStack, not PG — document that restore must reconcile DB refs ↔ secret store, and that LocalStack community is ephemeral (test-only).
- A **restore script** + a documented, **actually-executed** restore drill (evidence in the runbook).
- `docs/project/DR_RUNBOOK.md`: RPO/RTO targets, backup location, restore steps, secret-store reconciliation, stuck-provision recovery.

**Files likely to change.** `scripts/backup.sh`, `scripts/restore.sh` (new), `docker-compose.platform.yml` (backup sidecar/cron or documented cron), `docs/project/DR_RUNBOOK.md` (new).

**Dependencies.** M4 recommended (restore should replay migrations then data), but can ship independently.

**Verification.** Take a backup → drop/recreate the DB volume → restore → app comes up with all anchors/tx metadata intact → **document the drill output** in the runbook.

**Effort.** M.

**Risks.** Backups that never restore = false safety → the drill is mandatory, not optional. Secret/DB divergence on restore → explicitly reconcile in the runbook.

---

## M6 — Observability: OpenTelemetry + Prometheus + Grafana  *(L)*

**Objective.** Make money movement and provisioning **visible**: traces across
services, metrics, dashboards, and alerts on the things that hurt.

**Scope (can split into 6a instrumentation / 6b stack+alerts if PRs get large).**
- **Tracing**: OTel SDK in platform-api, control-plane, business-server; propagate `traceparent` across the provisioning + money hops; export to an OTel collector.
- **Metrics**: `prom-client` `/metrics` on each service — provision success/failure + duration, deposit/withdrawal counts + latency, outbox depth/age, treasury balance gauge, HTTP error rate, aggregator per-anchor health.
- **Stack**: add Prometheus + Grafana (+ collector) to `docker-compose.platform.yml`; commit starter dashboards as JSON.
- **Alerts**: provision failure, stuck tx (outbox age threshold), error-rate spike, cert expiry, treasury below floor.
- **Health**: split liveness vs readiness endpoints.

**Files likely to change.** New `otel.ts`/`metrics.ts` per service, middleware wiring, `docker-compose.platform.yml`, `deploy/observability/*` (prometheus.yml, grafana dashboards, alert rules), health route updates.

**Dependencies.** M2. Independent of M3–M5 but far more useful once tests + migrations stabilize the base.

**Verification.** Run a provision + a deposit → single trace spans all services in the collector; `/metrics` scraped; Grafana shows the flow; a forced provision failure fires the alert.

**Effort.** L. Cross-service trace propagation is the effort; metrics are quick.

**Risks.** Perf overhead from tracing → sample. Metric cardinality blowup (per-anchor labels) → bound labels. Scope creep → ship the 6–8 metrics that matter, not everything.

---

## M7 — Security hardening  *(M)*

**Objective.** Finish the boundary controls the strong secret model doesn't cover.

**Scope.**
- **Rate limiting** beyond auth: sensible limiters on mutating + provisioning + credentials routes; global fallback.
- **CSRF**: token (double-submit or synchronizer) on state-changing routes, complementing SameSite/host-only cookies.
- **CSP**: tuned Content-Security-Policy via helmet (dial in for the console + customer app; allow runtime brand CSS vars, block inline-script gaps).
- **`logoUrl` hardening**: allowlist scheme/host or proxy-and-revalidate before rendering in `<img>` (customer app + console).
- **Image scanning**: Trivy in CI on built Docker images (blocking on HIGH/CRITICAL).
- **Docker-socket privilege**: document the risk and the R7 exit (K8s scheduling); optionally sandbox the provisioner now (socket proxy with a restricted command allowlist).

**Files likely to change.** `platform/api/src/app.ts` + `middleware/rateLimit.ts` (expand), CSRF middleware (new), helmet/CSP config, `logoUrl` validators in `lib/brand.ts` (both frontends), `ci.yml` (Trivy job), decision-log entry.

**Dependencies.** M2 (scanning in CI).

**Verification.** Automated: rate-limit test trips on burst; CSRF-less mutating request is rejected; CSP header present + no console violations on normal use; Trivy fails on a seeded vulnerable base image; malicious `logoUrl` rejected.

**Effort.** M.

**Risks.** CSP too strict breaks the runtime-branding CSS-var injection → test both frontends thoroughly. CSRF on the same-origin BFF proxies needs care so console/customer flows don't break.

---

## M8 — Stack consolidation  *(M/L)*

**Objective.** One canonical anchor stack as the provisioning source of truth;
remove the `anchor-service/*` vs `anchor-template/*` drift.

**Scope.**
- Decide the canonical template (likely `anchor-template/*`, which already carries console + client + aggregator + infra) vs `anchor-service/*` (the proven testnet stack the provisioner currently clones). **This is a judgment call to make explicitly, with a decision-log entry.**
- Migrate the provisioner to the single chosen template; archive or delete the other (or clearly mark one `reference-only`).
- Reconcile config divergence (assets.yaml, AP config, business-server) so there's one lineage.

**Files likely to change.** Provisioner/orchestrator paths, one of the two stack trees (removed/archived), compose, docs, decision-log.

**Dependencies.** **M3 (tests)** strongly recommended first — consolidation is the change most likely to silently break provisioning, and tests are the guardrail. Also benefits from M6 (see the change land cleanly).

**Verification.** Provision two distinct anchors end-to-end from the single template; both customer app + console + money flows work; the removed stack is referenced nowhere (`grep` clean).

**Effort.** M–L depending on how divergent the two stacks have become.

**Risks.** Highest-risk milestone → do it late, behind tests. Deleting the wrong lineage loses working config → archive (git tag/branch) before removing.

---

## Sequencing summary

| # | Milestone | Effort | Depends on | Readiness lift |
|---|---|---|---|---|
| M1 | Repo hygiene | S | — | Low-but-unblocking |
| M2 | CI foundation | M | M1 | **High** |
| M3 | Money-flow tests | L | M2 | **Highest** |
| M4 | Migrations everywhere | M | M2 | High |
| M5 | Backup & restore | M | M4* | High (catastrophe) |
| M6 | Observability | L | M2 | High |
| M7 | Security hardening | M | M2 | Medium-High |
| M8 | Stack consolidation | M/L | M3 | Medium (debt) |

\* recommended, not strict.

**Recommended first milestone: M1**, then **M2**, delivered as two small PRs, so the
gate exists before the flagship testing work (M3) lands against it. M1+M2 are
low-risk and unlock everything after.
