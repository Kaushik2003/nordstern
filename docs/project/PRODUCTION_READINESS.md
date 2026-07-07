# NordStern — Production Readiness Plan (R6 gap analysis)

> Status: **planning / gap-analysis only** — no implementation.
> Scope: what stands between "working engineering platform" and "production SaaS
> we can put a real Anchor business on." Grounded in the code at commit
> `0fe4909` (branch `feat/platform-infra-and-money-safety`), not in docs or intent.
> Date: 2026-07-07.

Legend: ✅ Complete · ⚠️ Partial · ❌ Missing.

---

## 0. Ground truth (what actually runs today)

- **Live path** = `docker-compose.platform.yml` (platform-api :4000, control-plane,
  Traefik, LocalStack secrets, Postgres) + **`dockerode` provisioning**
  (`anchor-service/control-plane/src/orchestrator.ts`) that spins per-anchor
  containers on **one Docker host**, routed by Traefik labels on `*.sslip.io`.
- **`anchor-template/infra/`** (Terraform EKS/ECR/network/secrets, Helm
  `anchor-stack`, ArgoCD bootstrap: cert-manager / external-dns / ESO / Karpenter /
  kube-prometheus-stack) is **authored but not wired to the runtime** — nothing in
  the provisioner references it. Treat it as a designed target, not a deployed one.
- **Two anchor stacks coexist**: `anchor-service/*` (the proven testnet stack the
  provisioner clones) and `anchor-template/*` (newer console + client + aggregator +
  infra). This duplication is itself a source of drift (see Tech Debt).
- **platform/api** is the most mature service: helmet, scoped CORS, host-only
  cookies, bcrypt + JWT sessions, `authLimiter`, pino structured logs, requestId,
  audit service, mailer (Resend/console), SecretStore (creds never in DB, rotation
  API). Auth is **password** today; OTP is R4.

---

## 1. Security

| Item | State | Notes |
|---|---|---|
| Authentication | ⚠️ | Password + bcrypt + JWT sessions (`auth.service.ts`). No MFA; OTP is R4. |
| Authorization | ✅ | `requireAuth` + `requireRole` + `tenant` middleware; membership-scoped resolve. |
| Session management | ✅ | Server sessions repo, host-only cookies bound per console origin. |
| OTP | ❌ | Not implemented (R4). Mailer (Resend) already wired → small delta. |
| CSRF | ⚠️ | Relies on SameSite + host-only cookies; no anti-CSRF token on state-changing routes. |
| XSS | ⚠️ | React escaping + helmet defaults; **no explicit CSP**; branding injects runtime CSS vars (safe) but `logoUrl` is user-supplied and rendered in `<img>` — validate/allowlist. |
| CSP | ❌ | helmet default only; no tuned Content-Security-Policy. |
| CORS | ✅ | Scoped to `APP_URL` with credentials; not `*`. |
| Rate limiting | ⚠️ | `authLimiter` on **auth routes only**. Credentials/provisioning/admin routes unprotected. |
| Secret management | ✅ | SecretStore (DL-010): PSP/banking creds never in DB; LocalStack↔AWS parity; metadata refs only. |
| Secret rotation | ✅ | Operator add/rotate/delete API, masked responses, never viewable. |
| Encryption | ⚠️ | Secrets encrypted at rest in Secrets Manager; **DB-at-rest + TLS in transit not enforced** in the running compose (LocalStack/local PG plaintext). |
| Audit logs | ⚠️ | `audit.service` + table + routes exist, but coverage is thin (not called from most mutating services). |
| Supply chain | ❌ | No lockfile pinning policy, no SBOM, no provenance. |
| Docker security | ⚠️ | Provisioner mounts `/var/run/docker.sock` → container has host-root-equivalent power. Acceptable locally, unacceptable in prod. |
| Container isolation | ⚠️ | Per-anchor containers share one Docker network/host; no per-tenant network policy at runtime (NetworkPolicy exists only in the unused Helm chart). |
| Dependency scanning | ❌ | No Dependabot/Snyk/`npm audit` gate for product code. |
| API security | ⚠️ | Zod validation on inputs ✅; no request size caps beyond defaults, no API-key scoping tests, no schema/OpenAPI contract. |

**Why it matters:** we will hold PSP + banking credentials and move real money. The
secret architecture is genuinely strong; the gaps are the *boundary* controls
(CSP, CSRF, rate-limit coverage, image/dep scanning) and the **Docker-socket
privilege** of the provisioner.

---

## 2. Infrastructure

| Item | State | Notes |
|---|---|---|
| Docker | ✅ | All services containerized; multi-stage Dockerfiles present. |
| Docker Compose | ✅ | `docker-compose.platform.yml` is the working orchestration. |
| Traefik | ✅ | Dynamic per-anchor routing via container labels (live). |
| Gateway API | ❌ | Not used. |
| Kubernetes | ⚠️ | Helm `anchor-stack` authored; **never deployed**; provisioner is dockerode, not K8s. |
| Helm | ⚠️ | Chart exists (ingress, externalsecret, networkpolicy, SA) — unverified against a cluster. |
| ArgoCD | ⚠️ | Bootstrap + platform-config charts authored; not bootstrapped anywhere. |
| GitOps | ❌ | No connected repo→cluster reconciliation. |
| AWS | ⚠️ | Terraform for VPC/EKS/ECR/Aurora/IAM-IRSA/Secrets Manager authored; **not applied** (no state, no verified plan). |
| EKS | ⚠️ | `eks.tf` present, not provisioned. |
| Terraform | ⚠️ | Modules present; no CI plan/apply, no remote state backend confirmed. |
| Secrets Manager | ⚠️ | Code targets it; runs against **LocalStack** locally; real AWS path unproven. |
| External Secrets Operator | ⚠️ | Manifest authored (`external-secrets.yaml`, `externalsecret.yaml`); not running. |

**Bottom line:** infrastructure is **~70% designed, ~0% deployed** beyond the local
Docker host. The single biggest architectural risk is that the *provisioning model
itself* (dockerode on one host) is not the production model (K8s), so R7 is a
**replatform of provisioning**, not a lift-and-shift.

---

## 3. Reliability

| Item | State | Notes |
|---|---|---|
| Retry mechanisms | ⚠️ | Provision `resume()` retry ✅; no generic backoff/retry policy across HTTP calls. |
| Idempotency | ✅ | Durable outbox + on-chain-idempotent deposit release; off-ramp poller dedupe. |
| Dead letter queues | ❌ | Outbox has no DLQ / poison-message handling. |
| Background jobs | ⚠️ | In-process pollers/jobs; no durable queue (BullMQ/SQS); dies with the process. |
| Saga recovery | ⚠️ | Provisioning is resumable; multi-step money sagas lack a formal compensator. |
| Provisioning recovery | ✅ | `resume(cpAnchorId)` re-provisions stable slug/secret path idempotently. |
| Transaction recovery | ⚠️ | Status-driven via AP DB + observer; no automated stuck-tx sweeper/alert. |
| Database migrations | ❌ | control-plane uses `CREATE TABLE IF NOT EXISTS` + ad-hoc `ALTER … IF NOT EXISTS`; platform-api has drizzle-kit but no committed migration history discipline. No versioned, ordered, reversible migrations. |
| Rollbacks | ❌ | No image/version rollback story; no DB down-migrations. |

**Why it matters:** money movement is the crown jewel and it's *good* (idempotency
is real). The weak links are **schema evolution** (drift across two stacks) and
**job durability** (in-process pollers = lost work on crash/restart).

---

## 4. Observability

| Item | State | Notes |
|---|---|---|
| Logging | ✅ | pino structured logs + `pino-http` + requestId correlation. |
| Metrics | ❌ | No `prom-client`; Prometheus appears only in the unused ArgoCD chart. |
| Tracing | ❌ | No OpenTelemetry / spans across platform→control-plane→business-server. |
| Health checks | ⚠️ | `/health` on platform-api + 2 compose healthchecks; not comprehensive/liveness+readiness split. |
| OpenTelemetry | ❌ | Absent. |
| Prometheus | ❌ | Not running. |
| Grafana | ❌ | Not running. |
| Alerting | ❌ | None. |
| Dashboards | ❌ | None. |
| Distributed tracing | ❌ | None — this is the top blind spot for a multi-hop provisioning + money system. |
| Provisioning visibility | ⚠️ | Job status is pollable; no timeline/event stream/metrics on success rate or duration. |
| Aggregator visibility | ⚠️ | Health-check registration exists; no metrics on per-anchor health/latency. |

**Why it matters:** you cannot operate money movement you cannot see. Today, a
stuck deposit or a failed provision is discoverable only by reading logs. This is
the single weakest category (score 2/10) and gates real onboarding.

---

## 5. Scalability

| Subsystem | State | Ceiling |
|---|---|---|
| Control Plane | ⚠️ | Single instance; stateless-ish → horizontally scalable *if* sessions move to shared store. |
| Aggregator | ⚠️ | Single instance; in-memory registration risk. |
| Provisioning | ❌ | **Hard ceiling: one Docker host.** dockerode cannot schedule across nodes; N anchors = N Java AP containers on one box (already hit RAM pressure in testing). |
| Business Server | ⚠️ | One per anchor; fine, but co-located on the same host. |
| Anchor Platform | ⚠️ | Heavy JVM per anchor; memory-bound; needs per-anchor node scheduling (K8s). |
| Customer Frontend | ✅ | Next.js standalone, stateless, trivially scalable. |
| Operator Console | ✅ | Same. |
| Database | ⚠️ | Single Postgres (`anchordb`+`controldb`); no read replicas, no Aurora (authored only). |
| Traefik | ⚠️ | Single instance; label-driven; fine at small N. |
| Networking | ⚠️ | One bridge network; no per-tenant isolation at runtime. |
| Autoscaling | ❌ | None (Karpenter authored, not live). |
| Connection pools | ⚠️ | Default `pg` pools; unsized/untuned. |
| Caching | ❌ | No cache layer (fine for now). |

**Why it matters:** the current model works for a **handful** of demo anchors and
falls over well before "real customers." Scaling is blocked on the R7 replatform
(K8s + per-node AP scheduling), not on app code.

---

## 6. Testing

| Item | State |
|---|---|
| Unit tests | ❌ **Zero** across `platform`, `anchor-service`, `anchor-template`, `frontend`. |
| Integration tests | ❌ None. |
| E2E tests | ⚠️ Manual only (scripts + R2 validation report); nothing automated/repeatable in CI. |
| Provisioning tests | ❌ None. |
| Routing tests | ❌ None. |
| SEP tests | ❌ None (upstream AP has them; our business logic has none). |
| Aggregator tests | ❌ None. |
| Load tests | ❌ None. |
| Chaos testing | ❌ None. |
| Disaster recovery testing | ❌ None. |

**This is the most alarming category.** A money-moving system with idempotency
logic, secret handling, and multi-service provisioning has **no automated test
safety net**. Every change is validated by hand. No CI gate exists for product
code. Score 1/10. This is a hard prerequisite for onboarding anyone real.

---

## 7. Operations

| Item | State | Notes |
|---|---|---|
| Deployment | ⚠️ | `docker compose up`; no CD pipeline, no environments (dev/stage/prod). |
| Rollback | ❌ | No versioned deploys to roll back to. |
| Backups | ❌ | No `pg_dump`/snapshot/automation anywhere. |
| Restore | ❌ | Untested; no runbook. |
| Database snapshots | ❌ | None (Aurora automated backups authored, not live). |
| Secret rotation | ✅ | API-driven rotate/delete, masked. |
| Incident response | ❌ | No on-call, no severity model, no comms plan. |
| Runbooks | ⚠️ | Go-live gating checklist exists (task); no operational runbooks (stuck tx, failed provision, key compromise). |
| Admin tooling | ⚠️ | Console overview + credentials; no platform-wide admin (list/suspend anchors, force-resume, refund). |
| Monitoring | ❌ | See §4. |
| Maintenance mode | ❌ | No global/per-anchor maintenance toggle. |
| Feature flags | ❌ | None; behavior gated by env only. |

**Why it matters:** the **no-backups** gap is a data-loss landmine — a bad
migration or dropped volume loses every anchor's config and tx metadata with no
recovery. This must be fixed before any real config exists.

---

## 8. Compliance (production requirements)

| Item | State | Notes |
|---|---|---|
| KYC | ⚠️ | DIDIT adapter integrated behind interface; webhook dedupe+decision atomic. Still sandbox. |
| AML | ❌ | No transaction monitoring / thresholds / SAR workflow. |
| Sanctions | ❌ | No OFAC/UN/India list screening on customers or destinations. |
| Audit retention | ⚠️ | Audit table exists; no retention/immutability policy. |
| GDPR / data protection | ❌ | No consent records, no data-subject export/delete. |
| Consent management | ❌ | Not modeled. |
| Data deletion | ❌ | No deletion pipeline. |
| Regional regulations | ❌ | Open (§5 AGENTS.md) — VDA/VDASP, licensing unresolved. |
| FIU requirements | ❌ | FIU-IND registration + PMLA reporting **unresolved legal question**; needs counsel, not code. |
| Logging requirements | ⚠️ | Structured logs exist; no compliance-grade tamper-evident audit trail. |

**Stance (unchanged from AGENTS.md §5):** these are **open legal questions**, not
engineering choices. Architect for optionality (adapters), do not encode legal
conclusions. Sanctions screening + AML monitoring are the two *engineering* items
that will be required regardless of how the legal model resolves.

---

## 9. Identity Platform (planned R5)

Currently **design-only (score 1/10)**. Recommendations before building:

- **Shared KYC** is a *legal* decision first (data controller, cross-anchor reuse
  consent) — do not build the "verify once, use everywhere" plumbing until counsel
  confirms the model (§5).
- **Tenant isolation must be the primitive**, not an afterthought: identity records
  scoped by `organizationId`/`anchorId` with row-level enforcement, mirroring the
  SecretStore's per-anchor IAM boundary.
- **Consent + data ownership**: model explicit, versioned consent per purpose;
  default to *per-anchor* ownership, with cross-anchor reuse behind explicit
  opt-in — never implicit.
- **Token model**: issue short-lived, audience-scoped identity assertions (per
  anchor), not a shared bearer that grants cross-tenant read.
- **Federation/privacy**: keep PII in the Identity Service; anchors receive a
  *verification result + reference*, not raw KYC documents. Minimize blast radius.
- Build the **mock-first adapter** exactly like KYC/PSP seams; DIDIT is one
  implementation.

---

## 10. Developer Experience

| Item | State |
|---|---|
| Documentation | ✅ Strong: AGENTS.md, `docs/project/*`, decision log, per-subtree CLAUDE.md. |
| SDKs | ❌ None. |
| API docs | ❌ No published reference. |
| OpenAPI | ❌ No spec (routes are hand-rolled Express + Zod). |
| CLI | ❌ None. |
| Local setup | ✅ Scripted (`setup-testnet.mjs`, `dev.sh`, unified compose). |
| Debugging | ⚠️ Structured logs help; no trace correlation across services. |
| Secrets (dev) | ✅ LocalStack parity is a genuinely nice DX win. |
| Environment management | ⚠️ `.env` sprawl across services; no single source or schema doc. |
| Developer onboarding | ✅ AGENTS.md is a strong single entry point. |

---

## 11. Production Launch Checklist (go-live gate)

Everything below is **required before the first real anchor business**:

- **Infrastructure**: EKS (or equivalent) provisioned via applied Terraform;
  remote state; per-node AP scheduling replacing dockerode.
- **Networking**: real TLS (cert-manager + Let's Encrypt), per-tenant NetworkPolicy
  enforced at runtime, WAF in front of ingress.
- **Secrets**: real AWS Secrets Manager + External Secrets Operator (not LocalStack);
  IRSA least-privilege per anchor; rotation runbook.
- **Monitoring**: Prometheus + Grafana + alerting on provision failures, stuck txs,
  treasury balance, queue depth, error rate, cert expiry.
- **Authentication**: OTP (R4) + MFA for operators; session store shared across
  replicas; CSRF tokens; tuned CSP.
- **Identity**: R5 decision + implementation *or* explicit per-anchor KYC only.
- **Payments**: live PSP behind adapter with **webhook signature verification +
  backend re-verification + idempotency**; mainnet asset config; go-live gating
  from AGENTS.md §7 satisfied.
- **Banking**: custody/nodal model chosen with counsel (§5).
- **Observability**: distributed tracing end-to-end; audit trail tamper-evident.
- **Backups**: automated Postgres/Aurora backups + **tested restore**; DR runbook.
- **Security**: dependency + image scanning in CI; pen test; drop Docker-socket
  privilege; supply-chain (SBOM) baseline.
- **Testing**: unit + integration + provisioning + E2E in CI as a merge gate;
  one load test + one chaos/DR drill.
- **Documentation**: OpenAPI + operator runbooks + incident playbooks.
- **Incident response**: on-call, severity model, comms plan, key-compromise runbook.
- **Compliance**: sanctions screening live; AML monitoring; FIU/legal sign-off.

---

## 12. Technical Debt

### Critical
1. **Zero automated tests + no CI.** Money logic, secrets, provisioning all
   hand-verified. *Fix:* Vitest unit + integration; GitHub Actions merge gate;
   start with money paths (outbox, idempotency, secrets).
2. **dockerode single-host provisioning.** Cannot scale past one box; already hit
   RAM limits stacking JVM AP containers. *Fix:* R7 replatform to K8s scheduling.
3. **No backups / DR.** A dropped volume or bad schema change loses everything.
   *Fix:* automated snapshots + tested restore before any real config exists.
4. **No versioned DB migrations.** `CREATE TABLE IF NOT EXISTS` + ad-hoc `ALTER`
   across two stacks → silent drift, no rollback. *Fix:* adopt one migration tool
   (drizzle-kit) with committed, ordered, reversible migrations; retire the IF-NOT-EXISTS pattern.

### High
5. **Observability near-zero** (no metrics/tracing/alerting). *Fix:* prom-client +
   OTel + Grafana + alerts.
6. **Two parallel stacks** (`anchor-service/*` vs `anchor-template/*`). Drift +
   confusion about the source of truth. *Fix:* pick the canonical template, delete
   or clearly archive the other.
7. **307 committed `.next` build artifacts** under `anchor-template/anchor-client`.
   *Fix:* gitignore + `git rm -r --cached`; never commit builds.
8. **Rate limiting auth-only.** Provisioning/credentials/admin unprotected. *Fix:*
   per-route + global limiter, esp. on mutating + provisioning endpoints.
9. **Infra authored-but-unverified** (Helm/Terraform/ArgoCD never applied). *Fix:*
   stand up a throwaway cluster and prove one anchor end-to-end via GitOps in R7.

### Medium
10. **Thin audit-log coverage** — service exists, few call sites. *Fix:* audit every
    mutating action (auth, credentials, provisioning, config).
11. **No DLQ / durable job queue** — in-process pollers lose work on restart. *Fix:*
    durable queue (BullMQ/SQS) + DLQ.
12. **CSRF via SameSite only; no CSP.** *Fix:* CSRF tokens on state-changing routes;
    tuned CSP.
13. **Docker-socket privilege** in provisioner. *Fix:* remove in the K8s model.
14. **Password auth (R4 pending)** — no MFA/OTP.
15. **`logoUrl` rendered unvalidated** in `<img>`. *Fix:* allowlist scheme/host or
    proxy+revalidate.

### Low
16. `CURRENT_STATE.md` is a 12-byte stub (stale).
17. `chat.txt` / `chat2.txt` / `KYC_DIDIT*.txt` junk in `anchor-template/`.
18. `docs-website/` duplication vs `docs/`.
19. `.env` sprawl; no env schema doc.

---

## 13. Future Roadmap (after R4 + R5)

See **Deliverable 2** below for the milestone structure. Per-milestone detail:

- **R6 Production Hardening** — testing+CI, observability, backups/DR, migrations,
  rate-limit + CSRF + CSP, dep/image scanning, repo hygiene, stack consolidation.
  *Complexity: High. Depends on: nothing (do first). Success: green CI gate on
  every PR, metrics+alerts live, tested restore, one canonical stack.*
- **R7 Kubernetes & GitOps** — apply Terraform (EKS/ECR/Aurora/IRSA), replace
  dockerode with K8s-scheduled per-anchor stacks via Helm, real ESO + Secrets
  Manager, ArgoCD reconciliation, Karpenter autoscaling, per-tenant NetworkPolicy.
  *Complexity: Very High. Depends on: R6 (need tests to trust the replatform).
  Success: provision a real anchor on a cluster via GitOps, TLS + isolation +
  autoscale proven.*
- **R8 Compliance & Identity (incl. R5)** — Identity Service (mock-first, tenant-
  isolated, consent-modeled), sanctions screening, AML monitoring, audit retention,
  data-subject deletion. Legal decisions with counsel in parallel.
  *Complexity: High. Depends on: R7 (deploy target) + legal. Success: KYC/sanctions
  in the on-ramp path; consent + deletion demonstrable.*
- **R9 Launch Readiness** — mainnet go-live gating (AGENTS.md §7), live PSP with
  signature + backend re-verification, pen test, runbooks, on-call, load + chaos +
  DR drills. *Complexity: High. Depends on: R6–R8. Success: go-live checklist §11
  fully green; first real anchor onboarded.*

---

# Deliverable 1 — Production Readiness Score (1–10)

| Subsystem | Score | One-line justification |
|---|---:|---|
| Customer Frontend | **7** | Polished, branded, functional, stateless; needs tests + CSP. |
| Control Plane / platform-api | **6** | Strong auth/secrets/audit skeleton; no tests, thin audit coverage. |
| Operator Console | **6** | Real data, branded, auth works; no tests, password-only. |
| Provisioner | **5** | Idempotent + resumable, but single-host dockerode = hard ceiling. |
| Reliability | **5** | Excellent idempotency; missing migrations/DLQ/DR. |
| Aggregator | **5** | Works; no metrics/HA. |
| Security | **5** | Great secret model; gaps in CSP/CSRF/rate-limit/scanning/socket privilege. |
| Developer Experience | **5** | Superb docs + local setup; no OpenAPI/SDK/CLI. |
| Infrastructure (running) | **4** | Compose+dockerode live; K8s/AWS authored, undeployed. |
| Payments | **3** | Adapters + DIDIT KYC exist; no live PSP proven, sandbox only. |
| Observability | **2** | Logs only; no metrics/tracing/alerting/dashboards. |
| Testing | **1** | Zero automated tests; no CI gate. |
| Identity | **1** | Design only. |

**Weighted platform readiness: ~4/10** — a strong, honest engineering prototype;
not yet operable as a money-moving SaaS.

---

# Deliverable 2 — Go-Live Roadmap

```
R4  Email OTP auth            (small; mailer already wired)
R5  Identity Service          (folded into R8; legal-gated)

R6  Production Hardening      ← DO THIS NEXT, before more features
      tests + CI gate · observability (metrics/tracing/alerts) ·
      backups + tested restore · versioned migrations ·
      rate-limit/CSRF/CSP · dep+image scanning · repo hygiene ·
      consolidate to one anchor stack

R7  Kubernetes & GitOps
      apply Terraform (EKS/ECR/Aurora/IRSA) · dockerode → K8s scheduling ·
      real ESO + Secrets Manager · ArgoCD · Karpenter · NetworkPolicy

R8  Compliance & Identity (R5)
      Identity Service (tenant-isolated, consent-modeled) ·
      sanctions screening · AML monitoring · retention · deletion ·
      counsel: FIU/VDA/custody model

R9  Launch Readiness
      mainnet gating · live PSP (sig + backend re-verify) · pen test ·
      runbooks · on-call · load + chaos + DR drills · §11 fully green
```

Rationale for ordering: **R6 first** because you cannot safely replatform (R7) or
add compliance surface (R8) on top of an untested, unobserved, unbacked-up base —
every later milestone is riskier without the safety net R6 builds.

---

# Deliverable 3 — Final Assessment (brutally honest)

**If NordStern froze all feature work after R5, it would still not be ready to
onboard a real anchor business.** The remaining work is not features — it is the
operational, security, and reliability substrate that a money-moving platform is
*defined by*:

1. **No test safety net and no CI.** This alone disqualifies production. Idempotency
   and secret handling are correct *today*, by inspection — but nothing stops the
   next change from silently breaking a money path. This is the #1 blocker.
2. **The provisioning model doesn't scale and isn't the production model.**
   dockerode on one host is a demo architecture; the real target (K8s) exists only
   as unapplied YAML. Onboarding beyond a handful of anchors requires an actual
   replatform (R7), and that replatform is unproven end-to-end.
3. **You are flying blind.** No metrics, no tracing, no alerts. A stuck deposit or a
   failed provision is invisible until someone reads logs. You cannot run money you
   cannot see.
4. **No backups, no DR.** One bad migration or lost volume erases every anchor's
   config and transaction metadata irrecoverably. This is a latent catastrophe.
5. **Security is good-not-done.** The secret architecture is genuinely production-
   grade and ahead of the curve — but CSP/CSRF, rate-limit coverage, dependency and
   image scanning, and the Docker-socket privilege are unfinished, and there's been
   no pen test.
6. **Payments and compliance are sandbox + open legal questions.** No live PSP has
   been proven with signature verification; sanctions/AML screening doesn't exist;
   FIU/VDA/custody remain unresolved legal matters requiring counsel.

**What's genuinely strong and shouldn't be undervalued:** the money-movement
correctness (durable outbox, idempotent deposit/withdrawal), the SecretStore
architecture, the white-label provisioning + branding pipeline, and the
documentation/DX. These are the hard *conceptual* problems, and they're solved.

**Honest characterization:** NordStern is an **excellent working prototype at
roughly 4/10 production readiness.** The gap to production is dominated by
**engineering hygiene and operational maturity** (test/CI, observability, backups,
K8s, migrations), not by missing product. Estimate the pre-launch non-feature work
at **R6–R9 = the majority of remaining effort** — realistically more than
everything built so far, because production operations of a regulated money system
is harder than the happy-path build. Do **R6 next**; do not add product surface
until the safety net exists.
```
