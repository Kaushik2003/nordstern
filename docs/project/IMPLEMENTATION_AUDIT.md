# NordStern — Implementation Audit (evidence-based)

> **Date:** 2026-07-06 · **Lens:** technical due diligence for an investor/adopter.
> **Method:** read the actual code, traced execution paths, grepped for mocks/tests.
> **Rule:** no credit for anything that only exists in docs. Brutal honesty.

---

## 1. Executive summary

NordStern is **two disconnected halves**:

1. **One genuinely working anchor** (`anchor-template/`, ~13.4k LOC). A real SEP-24
   **INR→USDC on-ramp works end-to-end on testnet** — real DIDIT identity
   verification, real Razorpay collection, real USDC delivered from a treasury float,
   with crash-safe idempotency that was **live-verified**. This is the hard part of
   the business, and it is real.

2. **A platform/aggregator SaaS shell** (`platform/`, `aggregator-service/`) with real
   auth, a real data model, and a real routing *algorithm* — but whose **core value
   prop (provisioning an anchor) is simulated theater**, whose aggregator routes over
   **fake inventory** with a **mocked transaction handoff**, and which is **not wired**
   to the working anchor or to the one real provisioner that exists.

**If you cloned this repo today**, you could: bring up the single `anchor-template`
stack via Docker Compose and perform a **real INR→USDC on-ramp on testnet** through a
wallet. You could **not**: register a business and get a real anchor provisioned (the
provisioner is `setTimeout` + `console.log`), nor route real money through the
aggregator (the handoff is mocked).

**Cross-cutting red flags:** **zero automated tests** in the entire repo; **no single
way to run the platform + aggregator + anchor together**; the real provisioner
(`anchor-service`, dockerode) is **orphaned and outdated** (provisions the old
ANCH-mint anchor, disconnected from the new platform); infra (Terraform/Helm/ArgoCD)
is **authored but never applied or validated**.

**Overall: ~5/10.** A strong, real single-anchor MVP wrapped in a mostly-simulated
platform. See §8.

---

## 2. System-by-system audit

### 2.1 `anchor-template/` — the single anchor ✅ (the real one)
**What exists & works (verified live this session):**
- Official Anchor Platform (`-s -p -o`) on testnet; SEP-1/10/24/38 active.
- **On-ramp INR→USDC end-to-end:** real DIDIT KYC (Aadhaar+selfie, resolved via
  webhook *and* polling), real Razorpay collection (₹ paid, server-verified), real
  CMC FX, real USDC transferred from a treasury float. Observed: 50 USDC delivered,
  treasury debited exactly 50.
- **Money-safety, live-verified:** Transfer-After-Commit deposit **outbox** +
  reconciler (crash-after-send recovery proven on testnet); **at-most-once withdrawal
  payout guard** (proven against Postgres); fail-closed real KYC (mock forbidden on
  mainnet); atomic DIDIT webhook (single DB tx). (`releases.ts`, `poller.ts`,
  `db.ts`, `adapters/kyc/didit.ts`.)
- Operator console (`client/`) on **live** `/admin` data.
- Tamper-evident audit log with a real SHA-256 **hash chain** (`admin.ts:180-188`)
  — though truncated to 16 chars (weakens collision resistance).

**Incomplete / mocked:**
- **Off-ramp payout is mock** — USDC-return + Observer detection + poller are real,
  but the ₹ disbursement is simulated (`PAYOUT_PROVIDER=mock`; Cashfree in-review, no
  creds). Off-ramp is *not* a complete real flow.
- UPI-intent collection provider is unverified (Razorpay path is the real one).
- Testnet only; secrets in `.env`; single-tenant (hardcoded slug/DB/keys).

**Maturity: MVP → Production-Candidate for the on-ramp; Alpha for off-ramp.**

### 2.2 `platform/` — control plane + console ⚠️ (real shell, fake core)
**Real:**
- Auth: bcrypt passwords, JWT, sessions repo, `requireAuth`/`requireRole` RBAC,
  rate-limit + requestId + tenant middleware, helmet. (`lib/`, `middleware/`.)
- Data model (Drizzle): orgs, memberships, projects, anchors, invitations,
  applications, apiKeys, auditLogs, **provisioningJobs** — a coherent multi-tenant
  schema (`db/schema.ts`).
- Registration/invitation flow: `anchorInvitation.service.redeem()` atomically creates
  user→org→settings→membership→projects→anchor-stub→provisioning-job (real DB tx).
- Console: real Next.js register wizard (CompanyProfile/Compliance/PaymentRails/
  StellarConfig/ReviewSubmit steps), auth pages, real HTTP client to `/api/v1`
  with token refresh (`console/lib/api.ts`).

**FAKE — the core value prop:**
- **Provisioning is theater.** `triggerProvisioningJob()` (`anchorInvitation.service.ts:
  134-207`) runs three `await new Promise(r => setTimeout(r, 2000))` stages that
  `console.log` *"database created" / "keys generated & funded" / "Docker container
  stack running"* — **none of which happens.** No Stellar keypair, no Friendbot, no
  database, no container. It then POSTs a **hardcoded** anchor (USDC/UPI/HDFC/ICICI,
  fee 10+1%) to the aggregator and marks the job `completed`. **There is no dockerode,
  no k8s, no Stellar, no Friendbot anywhere in `platform/api/src`** (grep-confirmed).
- So: register → "provision" → you get a **DB row that claims to be an anchor**, and a
  fake registry entry. No running anchor is produced.

**Maturity: Prototype/Alpha** for its stated purpose (a provisioning control plane
that doesn't provision).

### 2.3 `aggregator-service/` — routing/quote ⚠️ (real algorithm, fake reality)
**Real:**
- **Weighted routing engine** (`routing.ts`): pulls policy weights + active anchors +
  1-hour health metrics from Postgres, filters by asset/rail/region/liquidity, scores
  fee/speed/uptime/liquidity, returns the best route with a reasoning string. Genuine.
- **Quote engine** (`quote.ts`): DB-transactional, persists quotes with TTL.
- DB-backed registry (`aggregator.anchors`, `routing_policies`, `health_metrics`,
  `audit_logs`); `POST /anchors` registration; background health workers.

**Fake / mocked:**
- **Transaction handoff is mocked** (`sdk.ts:163-172`): *"For local dev, we build a
  mock interactive redirect"* — generates `agg-tx-<random>` and a fake interactive URL.
  No real SEP-10/SEP-24 against the selected anchor. **The aggregator cannot actually
  execute a routed transaction.**
- **FX is a hardcoded constant** (`FX_RATE_INR_USDC`), not live.
- The anchors it routes over are the **fake ones** the platform's fake worker (or a
  seed) inserted — not real, provisioned anchors.

**Can it "route multiple anchors"?** The *algorithm* can rank N registry rows. But the
rows are fictional and the execution is mocked. **Maturity: Alpha.**

### 2.4 `anchor-service/` — the old factory 🪦 (real provisioner, orphaned)
- **This is where the REAL provisioning lives:** `orchestrator.ts` uses **dockerode**
  (`new Docker()` on `/var/run/docker.sock`, `createContainer`, image pull);
  `provision.ts` generates keypairs + `provisionAssetOnChain` (real Stellar);
  `config-gen.ts`, encrypted key vault, per-anchor Postgres DB.
- **But it is orphaned:** it provisions the **old ANCH-mint** anchor (superseded by
  the USDC `anchor-template`), and it is **not wired to `platform/`** (zero cross-refs).
  The new platform reimplemented the *shell* and faked the provisioning instead of
  calling this.
- **Net effect:** the one real provisioner in the repo is disconnected and outdated.
  **Maturity: MVP-but-parked.**

### 2.5 `frontend/web` — "Keel" console 🎭 (synthetic)
- High-fidelity Next.js operator console using **`@faker-js/faker` (seed 11)** to
  generate all data (`lib/data/dev.ts`). It is a **design/demo prototype**, not wired
  to live backends. (Consistent with `AGENTS.md`.) **Maturity: Prototype (polished).**

### 2.6 `infra/` — Terraform / Helm / ArgoCD 📐 (blueprint, unproven)
- Authored this session: production Dockerfiles (business-server image **built +
  boot-verified**), Terraform (VPC/EKS/Aurora/ECR/IRSA/Secrets via community modules),
  `anchor-stack` Helm chart, ArgoCD app-of-apps + addons.
- **Never applied, never validated.** `terraform`/`helm` aren't installed locally; no
  AWS account attached; no `terraform validate` / `helm lint` has run. The one image
  was built; **everything else is unexecuted code.** **Maturity: Blueprint.**

---

## 3. End-to-end capability matrix

| Capability | Status | Evidence / Notes |
|---|---|---|
| SEP-24 on-ramp INR→USDC (real) | ✅ | Live-verified; real KYC+PSP+USDC (`sep24.ts`,`releases.ts`) |
| Deposit crash-safety / no double-spend | ✅ | Outbox+reconciler, live-verified on testnet (DEC-007) |
| Real KYC (DIDIT, fail-closed) | ✅ | `adapters/kyc/didit.ts`; mock forbidden on mainnet (DEC-008) |
| Real fiat-in (Razorpay) | ✅ | Verified server-side before release |
| SEP-24 off-ramp detection | ✅ | Observer + poller real |
| **Real fiat-out (payout)** | ❌ | `PAYOUT_PROVIDER=mock`; Cashfree in-review |
| Operator console on live data | ✅ | `anchor-template/client` → `/admin` |
| Business registration + invitation | ✅ | Real DB tx (`anchorInvitation.service`) |
| Platform auth / RBAC / sessions | ✅ | JWT+bcrypt+sessions+`requireRole` |
| **Anchor provisioning (platform)** | ❌ | `setTimeout`+`console.log` theater — no Stellar/Docker/DB |
| Real anchor provisioner (dockerode) | ⚠️ | Exists in `anchor-service`, **orphaned + outdated** |
| Aggregator routing algorithm | ✅ | Real weighted scoring (`routing.ts`) |
| Aggregator over **real** inventory | ❌ | Anchors are fake/seeded; not provisioned |
| **Aggregator transaction execution** | ❌ | Mocked handoff (`sdk.ts`) |
| Multi-tenant isolation (running) | ❌ | Not deployed; platform doesn't provision isolated stacks |
| Kubernetes / cloud deployment | ❌ | Terraform/Helm/ArgoCD authored, never applied |
| Real banking rails | ❌ | Model A (BYO-rails) decided; nothing live |
| Automated tests | ❌ | **Zero** test files repo-wide; only manual `.mjs` scripts |
| Unified run (platform+agg+anchor) | ❌ | No shared compose/k8s; aggregator not in any compose |

---

## 4. Architecture review

**Strengths**
- The single anchor is architected well: adapter seams (KYC/deposit/payout/fee),
  async status-driven money moves, idempotent outbox, fail-closed KYC. Genuinely
  production-minded money-safety.
- Platform API is cleanly layered (routes → services → repositories → Drizzle), with
  real middleware. Good bones.
- Aggregator's routing is a real, extensible weighted engine.

**Weaknesses / risks**
- **Two disconnected halves + a third orphan.** `platform` (fake provision) ≠
  `anchor-service` (real provision, outdated) ≠ `anchor-template` (real anchor). The
  platform doesn't provision the anchor it's supposed to sell. This is the central
  architectural gap.
- **Simulation masquerading as implementation.** The provisioning worker and
  aggregator handoff *log success* while doing nothing — dangerous because a demo
  "works" without the substance.
- **No integration surface.** Nothing composes the three services; no e2e path from
  register → live anchor → aggregator route.
- **Scalability is theoretical** — the isolation model is designed (docs + Helm) but
  never run; no evidence any of it scales because none of it is deployed.

---

## 5. Security review

- ✅ Passwords bcrypt-hashed; JWT + sessions; RBAC middleware; rate limiting; helmet;
  webhook HMAC signature verification (DIDIT/Razorpay/Cashfree) with timing-safe
  compare + replay window; per-anchor secrets designed for Secrets Manager/ESO.
- ✅ Audit hash-chaining is real (anchor-template) — but **16-char truncated SHA-256**
  is weak; use the full digest. Also it lives in the anchor, not the platform.
- ⚠️ Secrets are in `.env` today (not a manager) — expected pre-prod, but a gate.
- ⚠️ Operator console has **no app auth** (intentional per template decision) — safe
  only if the deployment fronts it with private ingress/SSO; a live public exposure
  would leak treasury/tx data.
- ⚠️ `anchor-service` orchestrator mounts the **Docker socket** — a large privilege
  surface if that path is ever revived.
- ❌ No tests means security-relevant logic (RBAC, signature verification, idempotency)
  has **no regression protection**.

---

## 6. Code quality scores (/10)

| Area | Score | Note |
|---|---|---|
| Architecture | 6 | Good layering + seams; undermined by disconnected halves & simulated core |
| Backend (anchor-template) | 8 | Real, careful money code; live-verified |
| Backend (platform/aggregator) | 5 | Clean structure, but fake provisioning + mocked handoff |
| Frontend | 6 | Polished; console(s) real-ish, but `frontend/web` synthetic |
| Infrastructure | 4 | Authored, never applied/validated |
| Documentation | 8 | Unusually thorough + honest (KNOWN_ISSUES, DECISIONS, GO_LIVE) |
| Developer experience | 5 | One-command anchor compose is nice; no unified run; no tests |
| Maintainability | 6 | Readable; but duplication across two factories + drift risk |
| Scalability | 4 | Designed, not demonstrated |
| Testing | 1 | **Zero** automated tests |

---

## 7. Project maturity

| Subsystem | Maturity |
|---|---|
| Anchor runtime (`anchor-template`) | **Beta / Production-Candidate (on-ramp only)** |
| Control plane (`platform`) | **Alpha** (real shell, simulated provisioning) |
| Aggregator | **Alpha** (real algorithm, fake inventory + mocked execution) |
| Real provisioner (`anchor-service`) | **MVP but parked/orphaned** |
| Operator platform (RBAC/keys/audit) | **Alpha–Beta** (platform side real; anchor-side console live) |
| Infrastructure | **Prototype/Blueprint** (unexecuted) |
| **Overall platform** | **Alpha** |

---

## 8. Final score

### **5.0 / 10**

**Justification (investor-DD lens):**
- **+** The *hardest, riskiest* piece is genuinely done and **live-proven**: a real
  compliant INR→USDC on-ramp with real KYC, real payments, real settlement, and
  crash-safe money handling. Most "crypto ramp" projects fake exactly this; NordStern
  didn't. That's worth real credit (this subsystem alone is a 7–8).
- **–** The *product being pitched* — a multi-tenant platform that provisions and
  aggregates anchors — is **mostly simulated**: provisioning is `setTimeout` theater,
  aggregator execution is mocked, the real provisioner is orphaned/outdated, and none
  of it is connected or deployed.
- **–** **Zero tests**, no unified run, infra unexecuted → low confidence that the
  parts compose into the whole.

**The honest one-liner:** *A production-quality single anchor, wrapped in a
convincing but hollow platform demo.* Fund/adopt on the strength of the anchor and the
team's money-safety rigor — but treat the "platform," "provisioning," and "aggregator
execution" as **not yet built**, and budget for connecting the real provisioner to the
real anchor, wiring the aggregator handoff to real SEP flows, and adding a test suite.

---

*Verification note: findings above cite specific files/paths. The anchor on-ramp
claims were confirmed by live testnet runs this session; the "fake provisioning" and
"mocked handoff" findings are from reading `anchorInvitation.service.ts:134-207` and
`aggregator-service/src/sdk.ts:163-172` directly.*
