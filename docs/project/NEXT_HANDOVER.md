# NordStern — Next Engineer Handover

> Read `CURRENT_STATE.md` first for the full picture. This file is the **action plan**:
> where development stopped, what's broken, and exactly what to do next, in order.
> Grounded in the code + a full end-to-end run executed 2026-07-06.

---

# Project Context

NordStern = "Vercel for Stellar Anchors." A business applies, and the platform
**automatically provisions a real Stellar anchor** (SEP servers + KYC + rails +
treasury), registers it in an **aggregator** that routes on-ramp transactions to it.
NordStern never holds funds (Model A). Stack: TypeScript/Express + Postgres + Drizzle
(platform), dockerode factory (control-plane), Next.js consoles, Stellar SDK, Docker
Compose + Traefik today; EKS/Helm/ArgoCD planned.

---

# Current Status

- **Branch:** `feat/platform-infra-and-money-safety` (pushed to origin).
- **Latest commits (newest first):**
  - `7360774` fix: aggregator health check + SEP handoff work against provisioned anchors
  - `05b6cfa` feat: unified compose to run platform + control-plane + aggregator together
  - `e03ad2b` feat: connect platform → real provisioner + aggregator (remove simulation)
  - `764c04c` feat: money-safety hardening + Phase-1 infra + platform control-plane
- **Milestones reached:**
  1. Money-safety: outbox/reconciler (DEC-007), at-most-once payout (DEC-009), fail-closed KYC (DEC-008) — live-verified.
  2. Phase-1 infra authored (Terraform/Helm/ArgoCD/Dockerfiles) — unapplied.
  3. **Platform connected end-to-end and personally verified**: apply→approve→redeem→real provision→aggregator register→route→live SEP endpoints.
- **Uncommitted:** the two docs (`CURRENT_STATE.md`, `NEXT_HANDOVER.md`) — commit them.

---

# What Works Today (verified)

- ✅ `docker-compose.platform.yml` brings up db + traefik + control-plane + aggregator + platform-migrate + platform-api.
- ✅ Platform auth (register/login/refresh, cookie JWT, RBAC).
- ✅ Application submit → approve (auth) → invitation token.
- ✅ Redeem → creates org/anchor/job → **auto-triggers real provisioning**.
- ✅ Control-plane real provisioning: keygen, Friendbot, on-chain asset issuance, per-anchor DB, dockerode AP+biz, health, `active`.
- ✅ Real provisioning **status API** (genuine stages) + retry.
- ✅ Aggregator **auto-registration**, `GET /anchors`, weighted **routing**, quote, health workers, **real SEP handoff**.
- ✅ Provisioned anchor serves **live SEP-1/10/24** via Traefik (real SEP-10 challenge).
- ✅ USDC `anchor-template` (standalone): real DIDIT KYC + Razorpay on-ramp + idempotency (single-tenant).

---

# Current Problems (incomplete / mocked / needs attention)

- ⚠️ Provisioned anchor is the **ANCH `anchor-service`** stack (mints per-anchor asset), **not** the money-safe USDC `anchor-template`.
- ⚠️ **Operator dashboard not provisioned per anchor** — `createAnchorStack` codes client/console + images exist, but only apId/bizId are persisted and they weren't observed running.
- ⚠️ **No admin bootstrap** — approving an application needs a manually-registered platform user.
- ⚠️ **Aggregator seeds demo anchors** (`globex`, `acme`) + **FX is a constant**.
- ⚠️ **Full wallet SEP-24 deposit** (SEP-10 sign → interactive → trustline → asset receipt) **not driven** — only endpoint liveness proven.
- ⚠️ **Off-ramp payout mock** (no Cashfree creds).
- ❌ **Zero automated tests.**
- ❌ **No TLS / public domain**; dev `.localhost` on :80 only.
- ⚠️ Provisioning is **fire-and-forget in-process** (no durable queue).

---

# Immediate Priorities (ranked, execution order)

## Priority 1 — Provision the operator dashboard per anchor (make it real & tracked)
- **Goal:** every provisioned anchor gets a reachable operator console at `console.<slug>.anchors.localhost`.
- **Why:** the deliverable "receive a working dashboard" is currently unmet; it's the last visible gap in the happy path.
- **Current Implementation:** `orchestrator.createAnchorStack` already builds `anchor-client-<slug>` + `operator-console-<slug>` with Traefik labels; images `nordstern/anchor-client:dev` + `nordstern/operator-console:dev` exist.
- **Problem:** `provision.ts` destructures `{apId,bizId,clientId,consoleId}` but only persists `apId,bizId`; client/console not observed running, not health-checked, not torn down.
- **Root Cause:** provisioning + persistence + teardown were only wired for AP+biz.
- **Files To Modify:** `anchor-service/control-plane/src/provision.ts` (persist client/console ids, add to health wait), `orchestrator.ts` (`removeStack` must remove all four; `waitHealthy` optionally check client), control-plane schema (`tenants.client_container_id`, `console_container_id`).
- **Services Affected:** control-plane; (Traefik routes already labeled).
- **APIs Affected:** none new (status already surfaces home_domain).
- **Database Changes:** add two nullable container-id columns to `tenants`.
- **Acceptance Criteria:** after provisioning, `docker ps` shows 4 containers for the slug; `console.<slug>.anchors.localhost` returns the dashboard; teardown removes all four + DB.
- **Verification Steps:** run the demo flow; `curl -H "Host: console.<slug>.anchors.localhost" http://localhost/`.
- **Estimated Complexity:** **S–M** (mostly wiring; images already exist).

## Priority 2 — Admin bootstrap for approvals
- **Goal:** a platform-admin exists without manual `curl` register/login.
- **Why:** the approval step blocks self-serve onboarding.
- **Current Implementation:** `applications/:id/approve` uses `requireAuth`; no seeded admin.
- **Problem:** first admin must be created by hand; no role seeding.
- **Root Cause:** no bootstrap/seed script or first-run admin.
- **Files To Modify:** `platform/api/src/db/` (seed), a `scripts/seed-admin.ts`, or an env-gated first-admin on boot; optionally `docker-compose.platform.yml` (seed service).
- **Services Affected:** platform-api.
- **APIs Affected:** none (or an internal seed).
- **Database Changes:** insert a platform user + membership(owner/platform-admin).
- **Acceptance Criteria:** `up` yields a working admin login (documented creds for dev); approve works without manual register.
- **Estimated Complexity:** **S**.

## Priority 3 — Drive a full wallet SEP-24 on-ramp against a provisioned anchor
- **Goal:** prove a real testnet deposit end-to-end (asset actually received by a wallet).
- **Why:** the one remaining "verified" gap — endpoints are live, but no completed tx.
- **Current Implementation:** provisioned ANCH anchor serves SEP-10/24; KYC=mock, deposit=mock (per adapters).
- **Problem:** requires a wallet to sign SEP-10 + drive the interactive flow (Demo Wallet), and the ANCH mock-deposit "confirm" path.
- **Root Cause:** SEP-10 is wallet-signed; no headless wallet harness exists.
- **Files To Modify:** likely none (a test harness/script) — reuse `anchor-service` test scripts or Stellar Demo Wallet with home domain `<slug>.anchors.localhost`.
- **Services Affected:** provisioned anchor only.
- **Acceptance Criteria:** a testnet account receives the anchor's asset via the SEP-24 interactive flow initiated from the aggregator handoff.
- **Estimated Complexity:** **M** (wallet-in-the-loop).

## Priority 4 — Clean the aggregator registry (remove seeds, wire live FX)
- **Goal:** registry contains only real provisioned anchors; quotes use live FX.
- **Why:** correctness of discovery/routing.
- **Current Implementation:** `aggregator-service/src/db.ts` seeds `globex`+`acme`; `config.ts` `FX_RATE_INR_USDC` constant.
- **Problem:** fakes pollute the registry; FX is static.
- **Root Cause:** dev seed left in; FX never wired to a provider.
- **Files To Modify:** `aggregator-service/src/db.ts` (gate seed behind `SEED_DEMO=true`), `quote.ts`/`config.ts` (live FX — the `anchor-template` already has rate providers to port).
- **Database Changes:** none (optionally delete seed rows).
- **Acceptance Criteria:** fresh `up` → `GET /anchors` empty until a real anchor registers; quote FX moves with market.
- **Estimated Complexity:** **S–M**.

## Priority 5 — Converge on ONE anchor image (USDC template in the factory)
- **Goal:** the factory launches the money-safe USDC `anchor-template`, not the ANCH stack.
- **Why:** the provisioned anchor should have DIDIT/Razorpay/outbox, not a minted stand-in.
- **Current Implementation:** `orchestrator` uses `BIZ_IMAGE=nordstern/business-server:dev` (ANCH); asset per-slug.
- **Problem:** money-safety lives in a different codebase than what's provisioned.
- **Root Cause:** two anchor lineages; factory predates the USDC pivot.
- **Files To Modify:** build a template image; `orchestrator.ts` env (USDC issuer, adapters, FX); `config-gen.ts` (USDC assets.yaml); control-plane adapters mapping.
- **Services Affected:** control-plane, provisioned anchor.
- **Database Changes:** possibly per-anchor adapter/treasury fields.
- **Acceptance Criteria:** a provisioned anchor runs the template, does a real DIDIT+Razorpay USDC on-ramp.
- **Estimated Complexity:** **L** (largest; real integration).

## Priority 6 — Tests
- **Goal:** regression protection on money paths, RBAC, provisioning, routing.
- **Why:** zero tests today; money + auth are unguarded.
- **Files To Modify:** add `*.test.ts` per service + an E2E harness scripting the demo flow.
- **Acceptance Criteria:** CI runs unit + one full E2E; money-safety invariants asserted.
- **Estimated Complexity:** **M–L**.

## Priority 7 — Durable provisioning queue
- **Goal:** provisioning survives platform-api restarts.
- **Current Implementation:** `triggerProvisioningJob` is an in-process async IIFE + poller.
- **Problem:** a restart mid-provision orphans the platform job (control-plane continues).
- **Files To Modify:** platform-api worker (poll `provisioning_jobs` where `running/pending` on boot and resume), or a real queue.
- **Estimated Complexity:** **M**.

---

# Remaining Roadmap (phases)

- **Phase G — Complete the happy path (P1–P4):** dashboard provisioned, admin bootstrap, one real wallet deposit, clean registry + live FX. *Outcome: a polished, self-serve testnet demo.*
- **Phase H — One anchor image (P5):** factory launches the USDC template. *Outcome: provisioned anchors are money-safe.*
- **Phase I — Quality & resilience (P6–P7):** tests + durable queue + restart-safety.
- **Phase J — Deploy (infra):** apply Terraform → EKS, Helm anchor-stack, ArgoCD, ACM/TLS, external-dns; move secrets to Secrets Manager. *Outcome: internet-reachable, real domains, phone wallets.*
- **Phase K — Go-live gating:** mainnet config, real Cashfree/RazorpayX payout, legal custody/banking (counsel), FIU/DPDP (see `GO_LIVE_GATING.md`, `COMPLIANCE_OPEN_QUESTIONS.md`).

---

# Debugging Notes

- **Docker network label** — `network nordstern-net … incorrect label` → `docker network rm nordstern-net`, then `up`. (Compose must own the network it created.)
- **platform-api crash on boot** — zod env: needs `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (set in compose). Also `DATABASE_URL` → `platformdb`.
- **Provisioning stuck / no stages** — check control-plane logs (`docker logs nordstern-platform-control-plane-1`); ensure `MASTER_KEK` + `ANCHOR_CONFIG_HOST_ROOT` exported from `.env.base`, and `/var/run/docker.sock` mounted.
- **Friendbot** — testnet only; failures are transient (retry the job). Testnet resets quarterly → keys/assets wiped.
- **Traefik** — anchor reachable via `-H "Host: <slug>.anchors.localhost" http://localhost/...`. Router priorities: SEP(5) > api(10) > client(1). If 404, check the container's Traefik labels + that it joined `nordstern-net`.
- **Networking** — the aggregator reaches anchors by **container DNS** (`business-server-<slug>:3000`), NOT the public domain (unreachable from inside the container). Register api_url accordingly.
- **Database** — 4 DBs on one Postgres (`deploy/pg-init.sql`). `platform-migrate` runs `drizzle-kit push`; on a populated DB it may prompt — for a clean run start fresh (`down -v`).
- **Wallet/SEP** — Demo Wallet: home domain `<slug>.anchors.localhost` (add hosts entry if needed). SEP-24 deposit needs a SEP-10 JWT (403 without). Handoff returns the real endpoints.
- **Known workaround** — anchor `available=false`: re-`POST /anchors` with container-DNS api_url; health falls back to `/health` (already fixed in code).

---

# Useful Commands

```bash
# Bring up / tear down
docker compose --env-file anchor-service/.env.base -f docker-compose.platform.yml up -d --build
docker compose --env-file anchor-service/.env.base -f docker-compose.platform.yml down        # add -v to wipe DBs
docker compose --env-file anchor-service/.env.base -f docker-compose.platform.yml ps
docker compose --env-file anchor-service/.env.base -f docker-compose.platform.yml logs -f platform-api

# Provisioned anchors
docker ps --format '{{.Names}}' | grep -E 'anchor-platform-|business-server-'
docker logs nordstern-platform-control-plane-1 --tail 50

# Images
docker build -t nordstern/business-server:dev anchor-service/business-server

# Health
for p in 3002 3005 4000; do curl -s localhost:$p/health; echo; done

# DB
docker exec -it nordstern-platform-db-1 psql -U anchor -d platformdb -c '\dt'
docker exec -it nordstern-platform-db-1 psql -U anchor -d aggregatordb -c 'SELECT id,current_availability FROM aggregator.anchors;'
docker exec -it nordstern-platform-db-1 psql -U anchor -d controldb -c 'SELECT slug,stack_status,asset_code FROM tenants;'

# Typecheck (per service)
cd platform/api && npm run typecheck
cd anchor-template/aggregator-service && npx tsc --noEmit

# Anchor SEP (via Traefik)
curl -s -H "Host: <slug>.anchors.localhost" http://localhost/.well-known/stellar.toml
curl -s -H "Host: <slug>.anchors.localhost" "http://localhost/auth?account=<G...>"
```

---

# Testing Checklist

- ☑ Registration (application submit)
- ☑ Approval (auth-gated → token)
- ☑ Invitation (token issued)
- ☑ Redemption (org/anchor/job)
- ☑ Provisioning (real: keys, Friendbot, asset, containers)
- ☑ Aggregator registration (auto)
- ☑ `GET /anchors` returns it
- ☑ Quote
- ☑ Routing selects provisioned anchor
- ☑ SEP-1 (stellar.toml)
- ☑ SEP-10 (real challenge issued)
- ☑ SEP-24 (info 200, deposit auth-enforced)
- ☐ Wallet (full signed deposit → asset received)  ← Priority 3
- ☐ Operator dashboard reachable per anchor          ← Priority 1
- ☐ Admin bootstrap (no manual user)                 ← Priority 2
- ☐ Registry clean (no seeds) + live FX              ← Priority 4
- ☐ USDC template provisioned (not ANCH)             ← Priority 5
- ☐ Automated tests                                  ← Priority 6
- ☐ Customer frontend
- ☐ TLS / public domain / K8s

---

# Tomorrow Morning Plan (in order)

1. **Commit these two docs** (`CURRENT_STATE.md`, `NEXT_HANDOVER.md`). *Outcome: canonical docs in repo.*
2. **Priority 1 — dashboard provisioning.** Persist client/console ids + teardown + verify `console.<slug>.anchors.localhost` loads. *Outcome: the happy path ends in a working dashboard.*
3. **Priority 2 — admin bootstrap.** Seed a dev platform-admin; drop the manual register/login from the demo. *Outcome: approval is one step.*
4. **Priority 4 — clean registry + live FX** (quick wins). Gate the seed; port a rate provider. *Outcome: honest discovery + real quotes.*
5. **Priority 3 — one real wallet deposit** against a provisioned anchor via Demo Wallet. *Outcome: fully verified on-ramp, end to end.*
6. Re-run the full **Demo Flow** clean (`down -v` → `up`) and update the Testing Checklist. *Outcome: reproducible green run.*

---

# Success Criteria (next milestone = "self-serve testnet")

Considered complete when, from a **clean** `up` with **no manual engineering**:
1. A new business applies and is approved via a seeded/admin UI (not hand-curl).
2. Redemption auto-provisions a real anchor **including a reachable operator dashboard**.
3. The aggregator shows **only** real anchors and routes to the new one.
4. A wallet completes a **real testnet on-ramp** through the handoff and receives the asset.
5. The whole flow is covered by at least **one automated E2E test**.

Stretch (Phase H): the provisioned anchor is the **USDC template** doing a real
DIDIT + Razorpay on-ramp.
