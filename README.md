# NordStern

**NordStern is B2B infrastructure that lets a business become a compliant Stellar
anchor in India without building the technical, KYC, banking, and operations stack
itself.** A Stellar *anchor* is the on/off-ramp between fiat (INR) and the Stellar
network — it accepts fiat and issues 1:1-backed tokens, then redeems those tokens
back to fiat. Doing that well means running SEP protocol servers, KYC/AML, payment
rails, treasury, and an operator console — expensive and repetitive to rebuild for
every anchor. NordStern runs and manages that stack **on behalf of anchor operators**,
so a customer brings their liquidity, bank relationship, and regulatory standing, and
NordStern provides the servers, the provisioning, the money-movement safety, and the
consoles. It exists because the *plumbing* of an anchor is the same every time and the
*business* around it is not.

> **Status:** working software on Stellar **testnet**, with a single-command local
> platform and a validated (not-yet-applied) AWS deployment. It is **not** a crypto
> exchange, a consumer wallet, or a token launchpad — see
> [`AGENTS.md`](AGENTS.md) §1, the canonical source of truth for this repository.

---

## Table of contents

- [Product overview](#product-overview)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Core components](#core-components)
- [Provisioning flow](#provisioning-flow)
- [Multi-tenant model](#multi-tenant-model)
- [Authentication](#authentication)
- [Money flow](#money-flow)
- [Security](#security)
- [Infrastructure](#infrastructure)
- [CI/CD](#cicd)
- [Database](#database)
- [Testing](#testing)
- [Disaster recovery](#disaster-recovery)
- [Deployment](#deployment)
- [Local development](#local-development)
- [Product walkthrough](#product-walkthrough)
- [Current status](#current-status)
- [Roadmap](#roadmap)
- [Design principles](#design-principles)
- [Technology stack](#technology-stack)
- [Repository philosophy](#repository-philosophy)
- [Contributing](#contributing)
- [License](#license)

---

## Product overview

Think of NordStern as **Stripe for anchor operators**. Stripe let any business accept
card payments without becoming a payments company; NordStern lets any business run a
fiat ↔ Stellar on/off-ramp without becoming a protocol, compliance, and treasury
company.

The value chain it sits in:

```
   Banks / UPI / fiat rails          Traditional fiat on/off ramps
            │
            ▼
   Anchor operator                   A business with liquidity + a bank
            │                        relationship + regulatory standing.
            ▼
   ┌─────────────────────┐           NordStern owns the stack the operator
   │      NordStern       │           would otherwise have to build:
   │  (this repository)   │             • SEP protocol servers
   └─────────────────────┘             • KYC/AML integration seams
            │                          • payment-rail adapters (UPI in / payout)
            ▼                          • money-movement safety + treasury guards
   Stellar network                     • per-anchor provisioning + operator console
            │
            ▼
   End customer                       Holds funds in their OWN Stellar wallet
                                      (Lobstr / Vibrant / Freighter) — NordStern
                                      never custodies keys.
```

NordStern sits **between the banks and Stellar**. Fiat and bank relationships stay on
the operator's side; the Stellar network is on the other side; NordStern is the
managed middle that turns "we have money and a licence" into "we have a live anchor at
`ourbrand.nordstern.live` in minutes." Customers never see the blockchain — they see a
branded buy/sell app; the token movement exists only to bridge fiat and Stellar.

Background and rationale live in
[`docs/independent_research/`](docs/independent_research/) (business model, strategy,
off-ramp/UPI flow, KYC providers, compliance) and
[`docs/project/`](docs/project/) (maintained architecture, roadmap, and audits).

---

## Architecture

One **platform** provisions and operates many **isolated anchor stacks**. The platform
runs as a small set of shared services; each anchor is a set of containers spun up on
demand through the Docker Engine API and routed by Traefik under a wildcard domain.

```
 ┌──────────────────────────────────────────── FOUNDER / OPERATOR / ADMIN ───────────┐
 │                                                                                     │
 │   Founder Console + NordStern Admin (platform/console, Next.js)                     │
 │        app.nordstern.live   —  register · redeem · admin approvals · overview       │
 └───────────────────────────────────────┬─────────────────────────────────────────────┘
                                          │ same-origin /api  (host-only cookies)
                                          ▼
 ┌─────────────────────────── PLATFORM (shared, always-on) ───────────────────────────┐
 │                                                                                     │
 │   Platform API (platform/api :4000)      ← onboarding, orgs, auth (OTP), admin,      │
 │        │        │            │              customers, secret refs, email lifecycle   │
 │        │        │            └─────────────► Aggregator (:3005)  anchor registry +    │
 │        │        │                             health / routing / quote engine         │
 │        │        └───────────► SecretStore  (AWS Secrets Manager / LocalStack)         │
 │        │                        PSP + banking credential VALUES (never in Postgres)   │
 │        ▼                                                                             │
 │   Control Plane / Provisioner (anchor-service/control-plane :3002)                    │
 │        dockerode → keygen · Friendbot · asset issuance · CREATE DATABASE · containers │
 │        │                                                                             │
 │   Traefik v3.7  ──────────────────────────  wildcard routing *.nordstern.live         │
 │   PostgreSQL   (platformdb · controldb · aggregatordb · anchordb_<slug> …)            │
 └────────────────────────────────────────┬────────────────────────────────────────────┘
                                          │ Docker Engine API (provision)
                                          ▼
 ┌──────────────────────── PER-ANCHOR STACK  (one per operator) ───────────────────────┐
 │                                                                                     │
 │   Anchor Platform (stellar/anchor-platform)   SEP-1/10/12/24   ── watches ──► Horizon │
 │        │  callbacks (:8085 Platform API)                                             │
 │        ▼                                                                             │
 │   Business Server (anchor-template/business-server)  ← money logic, SEP-24 webview,   │
 │        │   idempotent release, treasury reserve guard, KYC/payout adapters            │
 │        ▼                                                                             │
 │   Customer App (anchor-client)      slug.nordstern.live         Operator Console      │
 │        buy · sell · KYC · history                               console-slug.…live    │
 └─────────────────────────────────────────┬───────────────────────────────────────────┘
                                          │
                                          ▼
                            End customer's Stellar wallet
                            (Lobstr / Vibrant / Freighter) — SETTLEMENT
                            signs SEP-10 auth; receives / returns tokens
```

**Routing on a single host (production):** for each anchor, Traefik serves three
things on `slug.nordstern.live` distinguished by priority — the customer app as the
catch-all (`Host(...)`, priority 1), the Anchor Platform's SEP endpoints
(`/.well-known`, `/auth`, `/sep*`, priority 10), and the business-server's SEP-24
interactive webview subpaths (`/sep24/interactive`, `/sep24/kyc`, …, priority 20). The
operator console is a sibling host, `console-slug.nordstern.live`. All fall under one
`*.nordstern.live` wildcard TLS certificate; anchor ↔ Anchor-Platform callbacks are
internal (container name), so no `api.` / `sep.` hostnames are needed.

Deeper technical map: [`docs/project/ARCHITECTURE.md`](docs/project/ARCHITECTURE.md).

---

## Repository structure

One git repository, several independently-tooled subprojects. There is no top-level
build; work inside the relevant subproject.

| Path | Role | Canonical? |
|---|---|---|
| [`platform/api/`](platform/api/) | **Platform API** — onboarding, orgs, auth, admin, customers, secret refs, email. | ✅ canonical |
| [`platform/console/`](platform/console/) | **Founder Console + NordStern Admin** (Next.js) — register, redeem, approvals, overview. | ✅ canonical |
| [`anchor-service/control-plane/`](anchor-service/control-plane/) | **Provisioner** — `dockerode` orchestrator, keygen, asset issuance, per-anchor DB + stack. | ✅ canonical |
| [`anchor-template/business-server/`](anchor-template/business-server/) | **Per-anchor money runtime** — SEP-24 callbacks, idempotent release, adapters. Built as `nordstern/business-server:dev`. | ✅ canonical |
| [`anchor-template/aggregator-service/`](anchor-template/aggregator-service/) | **Aggregator** — anchor registry + health / routing / quote engine (foundational). | ✅ canonical |
| [`anchor-template/anchor-client/`](anchor-template/anchor-client/) | **Customer App** — branded buy/sell/KYC/history. Image `nordstern/anchor-client:dev`. | ✅ canonical |
| [`anchor-template/console/`](anchor-template/console/) | **Operator Console** (per-anchor) — treasury, transactions, customers, credentials. Image `nordstern/operator-console:dev`. | ✅ canonical |
| [`anchor-template/config/`](anchor-template/config/) | Anchor Platform config templates (`anchor-platform.yaml`, `stellar.toml`, `assets.yaml`). | ✅ canonical |
| [`frontend/landing/`](frontend/landing/) | **Marketing landing** site (Next.js). | ✅ canonical |
| [`deploy/`](deploy/) | **Deployment** — root `docker-compose.platform.yml` companion, `pg-init.sql`, and modular **Terraform** (`deploy/terraform/`). | ✅ canonical |
| [`scripts/`](scripts/) | Operational scripts — `backup.sh`, `restore.sh`, `dr-drill.sh`. | ✅ canonical |
| [`docs/project/`](docs/project/) | **Authored, maintained context** — architecture, roadmap, readiness, audits, ADRs. | ✅ canonical |
| [`anchor-template/infra/`](anchor-template/infra/) | EKS / Helm `anchor-stack` / ArgoCD bootstrap — **authored, not wired to the runtime.** | 🟡 future target |
| [`frontend/web/`](frontend/web/) | "Keel" operator console **prototype** — synthetic (faker) data, high visual fidelity. | 🟡 prototype |
| [`anchor-service/business-server/`](anchor-service/business-server/), [`anchor-service/client/`](anchor-service/client/) | Original Phase-0 anchor MVP — **superseded** by `anchor-template/*` (control-plane + scripts here remain canonical). | 🟠 legacy |
| [`anchor-template/client/`](anchor-template/client/) | Earlier customer dashboard prototype (faker/next-auth) — superseded by `anchor-client`. | 🟠 legacy |
| [`anchor-platform/`](anchor-platform/) | **Upstream Stellar Anchor Platform source** (Java/Kotlin, Gradle). | 📖 reference only |
| [`sep24-reference-ui/`](sep24-reference-ui/) | Stellar's official SEP-24 reference wallet UI. | 📖 reference only |
| [`docs-website/`](docs-website/) | Fumadocs documentation site. | 📖 aux |
| [`docs/`](docs/) (non-`project`) | Saved Stellar docs (Admin_Guide, SEP_GUIDE, API_References) + `independent_research/`. | 📖 reference |

> **Two Anchor Platforms, kept distinct:** `anchor-platform/` is upstream *source* for
> study. The MVP runs the published `stellar/anchor-platform:latest` image, configured
> by `anchor-template/config/`. To change anchor behavior, edit the config and the
> business server — never `anchor-platform/`. See [`AGENTS.md`](AGENTS.md) §8.

---

## Core components

### Platform API — `platform/api` (TypeScript / Express, port 4000)
The always-on brain of the platform. Owns onboarding **applications**, **organizations
& memberships**, three **auth realms** (operator / customer / admin, all OTP-based),
**customer identity** (email-OTP, attached wallets, reusable KYC), **secret refs**
(pointers to the SecretStore — never values), **audit logs**, and the **email
lifecycle** (OTP + application received/approved/rejected + anchor-live) via Resend
with a console-logging fallback. It drives the provisioner and registers live anchors
with the aggregator. Zod-validated inputs, helmet, scoped CORS, `pino` structured
logs, per-route rate limiting. Schema is managed by Drizzle.

### Control Plane / Provisioner — `anchor-service/control-plane` (TypeScript / Express, port 3002)
The factory. Given an approved anchor, it generates keypairs (issuer / distribution /
signing), encrypts secrets at rest, funds accounts via Friendbot and issues the asset
on Stellar, `CREATE DATABASE anchordb_<slug>`, generates the Anchor Platform config,
and launches the per-anchor container stack through the **Docker Engine API**
(`dockerode`) with Traefik routing labels. It reads each anchor's PSP credentials from
the SecretStore at launch and injects them as env — mirroring what External Secrets
Operator does in a Kubernetes target. See `orchestrator.ts` and `provision.ts`.

### Aggregator — `anchor-template/aggregator-service` (TypeScript / Express, port 3005)
A registry of live anchors plus a health / routing / quote engine and background
workers. Platform API registers each newly-live anchor here. Advanced telemetry-based
routing (ranking anchors by real-time success rate, speed, FX spread) is foundational
here and expanded under [Roadmap](#roadmap) Phase 3.

### Business Server — `anchor-template/business-server` (TypeScript / Express, port 3000, one per anchor)
The per-anchor money runtime and the code that owns the *business*, not the protocol.
Answers Anchor Platform callbacks (`unique_address`, `fee`, `customer`), hosts the
SEP-24 interactive webview, performs Stellar mint/send, and drives transaction status
through the Platform API. It contains the **money-safety core**: an idempotent deposit
release outbox, a treasury reserve guardrail, at-most-once withdrawal payout, and
fail-closed KYC. External dependencies (KYC, deposit-in, payout, FX rate, fee) are
**swappable adapters with mock defaults** under `src/adapters/`. It owns a per-anchor
`nordstern` money schema and migrates it on start.

### Operator Console — `anchor-template/console` (Next.js, per anchor)
The operator's control surface for a single anchor: overview, transactions, treasury,
customers, credentials, compliance, webhooks, API keys, team, audit, reports. Served at
`console-slug.nordstern.live`; proxies to the Platform API and this anchor's business
server same-origin. Branding is injected per anchor at container launch.

### Customer App — `anchor-template/anchor-client` (Next.js, per anchor)
The white-label end-customer experience served at `slug.nordstern.live`: OTP login,
KYC/verify, **buy** (fiat → token) and **sell** (token → fiat), transaction history and
receipts, profile with attached Stellar wallets. The blockchain is hidden; customers
sign SEP-10 auth with their own wallet and hold tokens themselves (non-custodial).

### Founder Console + NordStern Admin — `platform/console` (Next.js, port 3000 → `app.nordstern.live`)
One Next.js app, several surfaces: the public **founder application** (`/register`), the
gated **NordStern Admin** approval queue (`/admin`), the founder **redeem → provision**
flow (`/redeem`), and the post-login **overview / wallet**. Proxies `/api` to the
Platform API same-origin so host-only cookies flow.

### Landing — `frontend/landing` (Next.js)
The marketing site and top-of-funnel CTA into the founder application.

### Terraform — `deploy/terraform`
Modular, least-privilege infrastructure-as-code for the pilot: a single EC2 Docker host
+ RDS Postgres, with networking, IAM, Secrets Manager, CloudWatch, EIP, and optional
Route53. See [Infrastructure](#infrastructure) and [Deployment](#deployment).

---

## Provisioning flow

From an interested business to a live anchor:

```
 Founder submits application         POST /api/v1/applications
        │                            (landing / platform-console /register)
        ▼                            → "Application received" email
 NordStern Admin reviews             /admin  (isolated admin realm)
        │                            approve → signed redeem token
        ▼                            → "Application approved" email + redeem link
 Founder activates                   /redeem?token=…  → org + anchor record created
        │
        ▼
 Provision (control-plane, async — the console polls /anchors/:id/status):
    1. Generate keypairs             issuer · distribution · signing (encrypted at rest)
    2. Issue asset on Stellar        Friendbot funding + trustline + issuance (testnet)
    3. Generate Anchor Platform config   stellar.toml · assets.yaml · anchor-platform.yaml
    4. CREATE DATABASE anchordb_<slug>   isolated per-anchor money DB
    5. Launch containers             Anchor Platform + business-server (+ client + console)
    6. Health gate                   wait until SEP-1 toml serves AND business /health is 200
    7. Register with aggregator      anchor becomes routable/quotable
        │                            → "Anchor is live" email
        ▼
 Live anchor                         https://slug.nordstern.live
                                     https://console-slug.nordstern.live
```

Provisioning is **idempotent**: a failed attempt rolls back the stack and per-anchor DB,
and a retry clears partial keypair state before regenerating. Status transitions
(`provisioning → active | error`) are persisted and polled by the console.

---

## Multi-tenant model

```
                        one NordStern platform
                                │
        ┌───────────────┬───────┴───────┬───────────────┐
        ▼               ▼               ▼               ▼
     anchor A        anchor B        anchor C        anchor …
```

Each anchor is isolated where it matters and shares infrastructure where it is safe:

| Dimension | Isolation |
|---|---|
| **Database** | A dedicated `anchordb_<slug>` per anchor; the business-server refuses to co-mingle money tables in the shared DB. |
| **Branding** | White-label per anchor (display name, accent, logo, support/legal URLs) injected at container launch; one image, N brands. |
| **Sessions** | Host-only cookies bound to each anchor's origin; customer/operator sessions do not cross anchors. |
| **Consoles** | Every anchor gets its own operator console host and its own customer app host. |
| **Keys & asset** | Per-anchor issuer/distribution/signing keypairs and asset code, encrypted at rest. |
| **Secrets** | Per-anchor PSP/banking credentials under a per-anchor SecretStore path. |
| **Shared** | Postgres server, Traefik, the platform services, and one wildcard TLS certificate. |

The seam is deliberate: NordStern is built as *one platform, many anchors* so that
adding a tenant is a provisioning action, not a rewrite (`AGENTS.md` §6).

---

## Authentication

Four distinct principals, each with its own realm. All tokens are HS256 JWTs
distinguished by a `typ` claim and delivered as **host-only cookies**; no secret is
ever exposed to a browser.

| Principal | Where | Mechanism |
|---|---|---|
| **Founder / Operator** | Platform / operator console | **Email OTP** → server session → operator access + refresh cookies (`ns_access` / `ns_refresh`). No passwords (passwords were removed platform-wide). |
| **Customer** | Customer app | **Email OTP** → central customer identity, wallets attached as verifiable attachments; cookie carries `typ: customer` (`ns_customer`). |
| **NordStern Admin** | `/admin` | Isolated admin realm, gated login → `typ: admin` cookie (`ns_admin`), used only to review/approve/reject applications. |
| **Service ↔ service** | Backend only | A shared `SERVICE_SECRET` (e.g. a business server propagating a KYC decision to the central customer profile) and the operator access secret forwarded into each business server so its money-admin API can verify an org-scoped operator session. |

OTP delivery uses the same Resend-backed mailer as the onboarding lifecycle, with a
console-logging fallback when no API key is configured (local dev). Rate limiting
protects OTP/auth, application submission, provisioning, and status-polling routes.

---

## Money flow

Money movement is **asynchronous, status-driven, and idempotent** — designed so a
crash, retry, or duplicate webhook can never move funds twice.

**Buy (on-ramp, deposit):**
1. Customer app / wallet authenticates (SEP-10) and starts a SEP-24 deposit.
2. The Anchor Platform opens the business server's **interactive webview**; the
   customer confirms and passes the (mock/real) KYC gate.
3. `executeRelease` runs the **transfer-after-commit outbox**: it first *atomically
   claims* a row in `nordstern.deposit_releases` (the universal double-send guard),
   asks the chain whether that exact transfer already landed, then sends tokens
   carrying a deterministic memo, records the hash **before** completing the Platform
   transaction, and marks the row `completed`.
4. A **treasury reserve guardrail** (`assertTreasuryReserve`) refuses a release that
   would breach the float; a **reconciler** resolves anything a crash left mid-flight
   (adopts an on-chain transfer if present, else bounded re-drive) — safe because the
   staleness window is far longer than a ledger close.

**Sell (off-ramp, withdrawal):**
1. Customer returns tokens to the distribution account with a required memo.
2. The Anchor Platform **Observer** matches the incoming payment by memo.
3. The payout is released through the `PayoutProvider` adapter with **at-most-once**
   semantics. On testnet the fiat leg is simulated; a real PSP (Cashfree / RazorpayX)
   plugs in behind the same interface.

**Settlement** is customer-side and non-custodial: the end user's own Stellar wallet
holds tokens and signs SEP-10 auth — NordStern never holds customer keys.

Why money cannot be duplicated: every release is gated by a single-winner atomic claim
keyed on the transaction id; sends are idempotent (adopt-then-submit against a
deterministic memo); Platform completion is idempotent; and the reconciler only
re-drives transfers proven absent on-chain. Deposit-release and withdrawal-payout
invariants are covered by money-flow tests against **real Postgres** (see
[Testing](#testing)). Details:
[`docs/project/CUSTOMER_MONEY_FLOW_AUDIT.md`](docs/project/CUSTOMER_MONEY_FLOW_AUDIT.md).

---

## Security

Implemented today (grounded in
[`docs/project/PRODUCTION_READINESS.md`](docs/project/PRODUCTION_READINESS.md)):

- **OTP authentication** — email OTP everywhere; passwords deleted platform-wide.
- **Isolated auth realms** — operator / customer / admin separated by `typ` claim,
  host-only cookies, server-side sessions, scoped CORS (never `*`), helmet.
- **Rate limiting** — auth/OTP, application submission, provisioning, and status
  polling each throttled.
- **Secrets Manager, never plaintext** — PSP/banking credential *values* live in AWS
  Secrets Manager (LocalStack in dev, same SDK); Postgres stores only `secret_refs`.
  Operator add/rotate/delete with masked, never-viewable responses.
- **Least-privilege IAM** — the EC2 instance role is scoped to this project's secret
  prefix and per-anchor paths, its log groups, and SSM only.
- **Org / tenant isolation** — membership-scoped resolution; per-anchor DB, cookies,
  keys, and secret paths (see [Multi-tenant model](#multi-tenant-model)).
- **CI security gates** — gitleaks secret scanning over the PR range, a committed-artifact
  hygiene check (both blocking), and advisory `npm audit`.
- **Money-flow tests** as a required gate on any change to payment or secret logic.
- **Migration checks** — schema consistency + apply-to-fresh-Postgres in CI; runtime DDL
  was removed in favor of versioned migrations.
- **DR drill** in CI — backup → destroy → restore proven byte-for-byte on every PR.
- **Docker build validation** — no PR may silently break an image build.
- **Fail-closed production boot** — the Platform API refuses to start in production with
  weak/default JWT, service, or admin secrets.
- **No mock data in production UI** — consoles render real data only; synthetic-data UIs
  are quarantined as prototypes.

**Known gaps (honestly tracked, not yet closed):** no tuned CSP, no anti-CSRF token
beyond SameSite + host-only cookies, thin audit-log coverage, DB-at-rest/TLS not
enforced in the local compose, and — most importantly — the provisioner mounts the
**Docker socket**, which is host-root-equivalent and acceptable only for the single-host
pilot. The Kubernetes target (`anchor-template/infra/`) replaces this with an API +
RBAC + NetworkPolicy model but is not yet wired. Full matrix in
[`PRODUCTION_READINESS.md`](docs/project/PRODUCTION_READINESS.md).

---

## Infrastructure

Two infrastructure realities, kept honest:

**1. What runs (canonical): Docker Compose → single EC2 + RDS.**
The platform is one `docker-compose.platform.yml` stack: Postgres, Traefik v3.7, the
control-plane provisioner, a LocalStack Secrets Manager (dev), the aggregator, a
one-shot schema migrator, the Platform API, and the platform console. Provisioned
per-anchor stacks join the same Docker network and are discovered by Traefik labels.

The **Terraform** in `deploy/terraform/` provisions the AWS home for exactly that stack —
**modular and least-privilege**, no Kubernetes:

| Module | Provisions |
|---|---|
| `networking` | VPC, 2 public + 2 private subnets, IGW (no NAT), EC2 SG (80/443, optional 22) and RDS SG (5432 from the EC2 SG only). |
| `compute` | One EC2 (Amazon Linux 2023, `t3.large`), Elastic IP, IMDSv2, Docker bootstrap, CloudWatch log groups. No auto-deploy. |
| `database` | RDS Postgres (private, encrypted, gp3 autoscaling) with automated backups **and point-in-time recovery**; master has `CREATEDB` for per-anchor DBs. |
| `secrets` | Generates the platform + DB master secrets (KEK, JWT, service, admin, DB) into Secrets Manager with keys matching the compose interpolation. |
| `iam` | EC2 instance role scoped to `${project}/${env}/*` and per-anchor `…/anchor/*` secrets, its log groups, and SSM. |
| `dns` | Optional Route53 wildcard + apex records; the pilot manages DNS manually at Hostinger (`manage_dns=false`). |

Providers: `hashicorp/aws ~> 5.40`, `hashicorp/random ~> 3.6`; Terraform `>= 1.5`. State
defaults to local; an encrypted S3 backend is stubbed for shared use.

Wildcard routing + HTTPS: in production the provisioner sets Traefik to the `websecure`
entrypoint with a Let's Encrypt cert resolver, so every `*.nordstern.live` host is
served under one wildcard certificate with no per-anchor cert work.

**2. What is authored but not wired (future target): Kubernetes.**
`anchor-template/infra/` contains Terraform for EKS/ECR/VPC/secrets, a Helm
`anchor-stack` chart (default-deny NetworkPolicies, ServiceAccounts, ExternalSecrets),
and an ArgoCD app-of-apps (ALB controller, cert-manager, external-dns, External Secrets
Operator, Karpenter, kube-prometheus-stack). **Nothing in the runtime references it** —
it is a designed target, not a deployed one. See [Roadmap](#roadmap).

---

## CI/CD

Six GitHub Actions workflows run on every PR and on push to `main`. Each is
independent so its required check is always present (deadlock-safe).

| Workflow | Validates | Gate |
|---|---|---|
| `ci.yml` | Install + `build`/`typecheck` for every NordStern-owned workspace (build if it exists, else typecheck); advisory lint. Upstream reference dirs excluded. | **Blocking** (docs-website leg advisory) |
| `db.yml` | Migration consistency (`drizzle-kit check`) + migrations **apply cleanly** to a fresh Postgres service, for every DB-owning service. | **Blocking** |
| `docker.yml` | `docker build` for image contexts whose build directory changed (dynamic matrix via paths-filter). Build only — no push/registry/scan. | **Blocking** |
| `security.yml` | gitleaks over the PR range (blocking on **new** secrets); committed-build-artifact hygiene (blocking); `npm audit` (advisory). | **Mixed** |
| `tests.yml` | Money-flow suites against **real infrastructure** — Testcontainers Postgres (deposit release + withdrawal payout) and LocalStack (SecretStore). Runs on every PR. | **Blocking** |
| `dr.yml` | Backup → destroy → restore drill asserting money data returns byte-for-byte. | **Blocking** |

Design intent: enforce what *exists*. Missing `lint`/`test` scripts are skipped, never
faked. Adding a project is one matrix line; new stages are new jobs that reuse the
`./.github/actions/setup` composite. Rationale:
[`docs/project/R6_M2_CI_DESIGN.md`](docs/project/R6_M2_CI_DESIGN.md).

---

## Database

PostgreSQL throughout, with **one owner per database** and **versioned migrations as the
single source of schema truth** (runtime `initSchema()` DDL was removed).

| Database | Owner | Migration tool | Holds |
|---|---|---|---|
| `platformdb` | `platform/api` | Drizzle (`drizzle/*.sql`) | Orgs, users, memberships, applications, anchors, customers + wallets, OTPs, sessions, audit logs, secret refs. |
| `controldb` | `anchor-service/control-plane` | node-pg-migrate | Tenants, provisioning status, encrypted anchor keypairs, adapter selections. |
| `aggregatordb` | `anchor-template/aggregator-service` | node-pg-migrate | Anchor registry, health/telemetry, audit log. |
| `anchordb_<slug>` | `anchor-template/business-server` (per anchor) | node-pg-migrate | **Money**: `deposit_releases`, `withdrawal_payouts`, KYC verifications, payments. |

On first boot the shared Postgres creates `controldb`, `platformdb`, and `aggregatordb`
(`deploy/pg-init.sql`); each anchor's `anchordb_<slug>` is created at provision time.
Each service migrates on start; the CI `db` workflow proves every migration applies to a
clean database. Why runtime DDL was removed: so a schema change is reviewed, versioned,
tested against a fresh DB, and covered by the DR drill — never an implicit side effect of
a deploy. See
[`docs/project/R6_M4_MIGRATIONS.md`](docs/project/R6_M4_MIGRATIONS.md).

---

## Testing

Test runner: **Vitest**. The highest-value suites run against **real infrastructure**,
not mocks, because they guard money and secrets.

- **Money-flow tests** — `anchor-template/business-server`: deposit release and
  withdrawal payout invariants (double-send guard, adopt-then-submit idempotency,
  reconciler behavior) against a **Testcontainers Postgres 15** (real DB, not a stub).
- **SecretStore tests** — `platform/api`: the secret abstraction against a **real
  LocalStack** AWS Secrets Manager, proving LocalStack ↔ AWS parity.
- **DR drill** — `scripts/dr-drill.sh` seeds representative money + tenant data, backs
  it up, destroys it, restores it, and asserts a byte-for-byte content digest.

What is **mocked**: external vendor rails by default (KYC → `ACCEPTED`, payout →
simulated release, deposit-in → placeholder), because the legal model is unsettled and
vendors sit behind swappable adapters. What is **not mocked** in tests: Postgres, the
Secrets Manager API, and the money-movement logic itself.

---

## Disaster recovery

The recovery path exists **before** any money database is migrated, and CI proves it
continuously. Guiding principle: *never migrate a money database without a tested backup
and a proven restore.*

- **`scripts/backup.sh`** — `pg_dump` custom-format (compressed, parallel-restore
  capable) + SHA-256 sidecar.
- **`scripts/restore.sh`** — verifies checksum, then `pg_restore --clean --if-exists`.
- **`scripts/dr-drill.sh`** — the self-verifying drill, also the `dr` CI check.
- **Restore order** — control-plane / platform DBs → per-anchor money DBs → reconcile
  secrets → start services → verify money tables.
- **Secret reconciliation** — the DB restores *refs*, not values. In prod, values are
  durable + versioned in Secrets Manager (nothing to restore, confirm refs resolve); in
  dev, LocalStack is ephemeral, so re-provision affected anchors.
- **Targets (proposed):** RPO ≤ 15 min, RTO ≤ 30 min for a single-DB restore. RDS
  automated backups + PITR provide this in the cloud.

Full procedure: [`docs/project/DR_RUNBOOK.md`](docs/project/DR_RUNBOOK.md).

---

## Deployment

High level — the copy-paste detail lives in
[`deploy/terraform/README.md`](deploy/terraform/README.md) and
[`deploy/terraform/DEPLOY_CHECKLIST.md`](deploy/terraform/DEPLOY_CHECKLIST.md):

1. **Provision infrastructure** — `terraform apply` in `deploy/terraform/` stands up the
   VPC, EC2 (Elastic IP), RDS, Secrets Manager entries, IAM, and CloudWatch. Nothing is
   auto-deployed onto the box.
2. **Prepare the host** — connect via SSM, clone the repo, build the per-anchor
   `nordstern/business-server:dev` image.
3. **Databases** — create `platformdb` / `controldb` / `aggregatordb` on RDS.
4. **Configuration** — read the platform + DB secrets from Secrets Manager into `.env`,
   add production runtime vars (domain suffix `nordstern.live`, `https` scheme, Traefik
   `websecure` + Let's Encrypt), and the production compose overrides.
5. **Bring it up** — `docker compose ... up -d`; the migrator applies schemas to RDS.
6. **DNS + TLS** — point a wildcard `*.nordstern.live` A-record (and apex) at the
   Elastic IP; Let's Encrypt issues on first request per host.
7. **Smoke-test** the founder → provision → buy → sell → operator journeys against the
   live host.

Everything remains on **testnet**; mainnet / real PSP is a separate, deliberate go-live
gate ([`AGENTS.md`](AGENTS.md) §7). The current Terraform plan is validated and staged;
applying it is an explicit, credentialed action.

---

## Local development

The whole connected platform runs from one compose file.

```bash
# 1. One-time: generate the master KEK + anchor-config host dir, then export them.
cd anchor-service && node scripts/setup-base.mjs
export MASTER_KEK=…  ANCHOR_CONFIG_HOST_ROOT=/abs/path/anchor-configs

# 2. Build the per-anchor business-server image the provisioner launches.
docker build -t nordstern/business-server:dev anchor-template/business-server
# (optional) build the customer app + operator console images to get their URLs:
docker build -t nordstern/anchor-client:dev   anchor-template/anchor-client
docker build -t nordstern/operator-console:dev anchor-template/console

# 3. Bring the platform up.
docker compose -f docker-compose.platform.yml up --build
```

Then reach:

| Surface | Local URL |
|---|---|
| Founder Console + Admin | `http://localhost:4001` (`/register`, `/admin`) |
| Platform API | `http://localhost:4000` |
| Control Plane | `http://localhost:3002` |
| Aggregator | `http://localhost:3005` |
| Traefik dashboard | `http://localhost:8090` |
| A provisioned anchor | `http://<slug>.anchors.127.0.0.1.sslip.io` (customer app + SEP) |
| Its operator console | `http://console-<slug>.anchors.127.0.0.1.sslip.io` |

**Provision a test anchor:** submit an application at `/register`, approve it in
`/admin` (isolated admin realm), redeem the link, and watch the console poll through
`provisioning → active`. `*.sslip.io` gives zero-config wildcard DNS locally so no
`/etc/hosts` edits are needed.

**Common workflows:** each service also runs standalone (`cd <service> && npm install &&
npm run dev`; Express services use `tsx watch`, Next apps use `next dev`). Type-check any
workspace with `npm run typecheck`; run its tests with `npm test`.

---

## Product walkthrough

The experience, persona by persona:

**Founder** → visits the landing site, submits an application (legal entity, use case,
country, FIU status), receives an "Application received" email.
`![Founder application](docs/screenshots/founder-register.png)`

**NordStern Admin** → reviews the queue in the isolated `/admin` realm, approves; the
founder gets an approval email with a redeem link.
`![Admin approval queue](docs/screenshots/admin-queue.png)`

**Founder (activation)** → redeems the link, watches provisioning stream to `active`,
and lands on the overview for their live anchor.
`![Provisioning status](docs/screenshots/provisioning.png)`

**Operator** → signs in with OTP at `console-slug.nordstern.live`, sees treasury float,
transactions, customers, and credentials for their anchor.
`![Operator console](docs/screenshots/operator-console.png)`

**Customer** → opens `slug.nordstern.live`, logs in with OTP, passes KYC, **buys**
(fiat → token) into their own Stellar wallet and **sells** back, with receipts and
history — never seeing the blockchain underneath.
`![Customer buy flow](docs/screenshots/customer-buy.png)`

> Screenshot paths above are placeholders; replace with captures under
> `docs/screenshots/`.

---

## Current status

Grounded in the code and
[`docs/project/PRODUCTION_READINESS.md`](docs/project/PRODUCTION_READINESS.md). Legend:
✅ working · 🟡 partial / converging · ❌ not implemented.

| Component | Status | Notes |
|---|---|---|
| Landing (`frontend/landing`) | ✅ | Marketing site + CTA. |
| Founder Console + Admin (`platform/console`) | ✅ | Register, redeem, admin approvals, overview. |
| Platform API (`platform/api`) | ✅ | Most mature service: OTP auth, orgs, customers, secrets, email, audit. |
| Control Plane / Provisioner | ✅ | End-to-end provisioning; Docker-socket privilege flagged for prod. |
| Business Server (money runtime) | ✅ | Idempotent release, treasury guard, at-most-once payout, fail-closed KYC. |
| Customer App (`anchor-client`) | ✅ | OTP, KYC, buy/sell (SEP-24), history, receipts. |
| Operator Console (`anchor-template/console`) | 🟡 | Functional; visual convergence with the Keel prototype pending. |
| Aggregator | 🟡 | Registry + health/routing/quote engine; advanced telemetry routing is Roadmap. |
| SecretStore (Secrets Manager) | ✅ | Values never in DB; LocalStack ↔ AWS parity; rotation API. |
| KYC | 🟡 | Mock default; `didit` / `surepass` adapters implemented, not production-verified. |
| Fiat rails (UPI-in / payout) | 🟡 | `upi` / `razorpay` / `cashfree` adapters scaffolded; live integration simulated on testnet. |
| CI/CD | ✅ | Six workflows (build, db, docker, security, money-flow tests, DR). |
| Disaster recovery | ✅ | Backup/restore scripts + drill green in CI. |
| Terraform (single EC2 + RDS) | ✅ | Validated + planned; apply is a deliberate credentialed step. |
| Observability | 🟡 | Structured logs + CloudWatch; no metrics/Prometheus/tracing yet. |
| Kubernetes infra (`anchor-template/infra`) | 🟡 | EKS/Helm/ArgoCD authored, **not wired** to the runtime. |
| Mainnet / real money | ❌ | Testnet only; explicit go-live gate. |

---

## Roadmap

Only genuinely unfinished work. Detail:
[`docs/project/ROADMAP.md`](docs/project/ROADMAP.md) and
[`PRODUCTION_READINESS.md`](docs/project/PRODUCTION_READINESS.md).

- **Observability** — metrics (Prometheus/`prom-client`), tracing, dashboards, and
  alerting on treasury float and stuck transactions.
- **Security hardening** — tuned CSP, anti-CSRF tokens, broad audit-log coverage,
  enforced DB-at-rest + TLS-in-transit, dependency scanning, `logoUrl` allowlisting.
- **Stack consolidation** — retire the legacy `anchor-service/*` and prototype
  `anchor-template/client` / `frontend/web` surfaces to remove drift.
- **Native payment rails** — real UPI Intent/QR collection (Razorpay) and live Cashfree
  Payouts behind the existing adapter interfaces, with webhook signature verification
  and backend re-verification.
- **Reconciliation & settlement** — automated bank-statement ↔ ledger reconciliation.
- **Aggregator routing** — telemetry-ranked anchor selection and SEP-38 quote
  multiplexing across eligible anchors.
- **Kubernetes go-live** — wire `anchor-template/infra/` (EKS, Helm `anchor-stack`,
  ArgoCD, External Secrets Operator, per-tenant NetworkPolicy), replacing the
  Docker-socket provisioner.
- **Advanced reporting** — operator financial/compliance reporting.
- **Mainnet launch** — counsel-approved custody/banking model, mainnet asset config
  swap, and the full go-live checklist (`AGENTS.md` §7).

---

## Design principles

- **One source of truth.** [`AGENTS.md`](AGENTS.md) governs intent; `docs/project/`
  holds maintained architecture and decisions. Fix the code or fix the doc — never work
  around a contradiction.
- **Idempotent money movement.** Every fund move is claim-gated, adopt-then-submit
  idempotent, and reconcilable. Duplicate transfers are treated as unacceptable, not
  unlikely.
- **Multi-tenant isolation.** Per-anchor database, keys, secrets, cookies, and consoles;
  shared infrastructure only where safe.
- **Everything external is a swappable adapter with a mock default.** KYC, deposit-in,
  payout, FX rate, and fee are interfaces; vendors are implementations that never leak
  into core flow logic — because the legal model is unsettled.
- **Testnet/sandbox is the default; real money is a deliberate gate.** Network and PSP
  are config, not code.
- **Infrastructure as code.** The AWS home is Terraform; provisioning is programmatic.
- **No mock data in production UI.** Consoles show real data only; synthetic-data UIs are
  quarantined as prototypes.
- **Honest empty states.** Unfinished is labelled unfinished — including in this README.
- **White-label first.** One image serves N branded anchors.
- **Blockchain hidden from customers.** The end user sees buy/sell and receipts, not
  ledgers and memos.
- **The Anchor Platform owns the protocol; our code owns the business.** Never
  reimplement SEP-1/10/12/24 — configure the platform and answer its callbacks.

---

## Technology stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js (App Router), React 19, Tailwind, Radix UI, TanStack Query, React Hook Form + Zod, Framer Motion, `@stellar/freighter-api`. |
| **Backend** | Node.js, TypeScript, Express, Zod, Helmet, `pino`, `express-rate-limit`, `jsonwebtoken`, Resend. |
| **Database** | PostgreSQL 15; Drizzle ORM (platform) + `node-pg-migrate` (services); `pg`. |
| **Blockchain** | Stellar (testnet), `@stellar/stellar-sdk`, Horizon, Friendbot, SEP-1/10/12/24; `stellar/anchor-platform` image. |
| **Infrastructure** | Docker + Docker Compose, Traefik v3.7, `dockerode` provisioning. |
| **Cloud** | AWS — EC2, RDS Postgres, Secrets Manager, IAM, CloudWatch, SSM, Elastic IP, (optional) Route53. |
| **IaC** | Terraform (`hashicorp/aws`, `hashicorp/random`); authored EKS/Helm/ArgoCD target. |
| **Testing** | Vitest, Testcontainers (Postgres), LocalStack (Secrets Manager). |
| **DevOps** | GitHub Actions (6 workflows), gitleaks, `pg_dump`/`pg_restore` DR tooling. |
| **Docs** | Fumadocs (`docs-website`), Markdown (`docs/`, `docs/project/`). |

---

## Repository philosophy

The repository looks large because it deliberately keeps **canonical**, **template**,
**prototype**, **legacy**, and **reference** code side by side, each labelled:

- **Canonical** (`platform/*`, `anchor-service/control-plane`,
  `anchor-template/{business-server,aggregator-service,anchor-client,console,config}`,
  `deploy/*`, `scripts/*`) is what actually runs and deploys.
- **Templates** (`anchor-template/*`) are cloned *per anchor* at provision time — the
  business-server image, customer app, and operator console are the same code serving
  N branded tenants.
- **Prototypes** (`frontend/web` "Keel", `anchor-template/client`) are high-fidelity,
  synthetic-data UIs for investor/partner review; they are never wired to live keys and
  the functional UIs are never downgraded to their mock data.
- **Legacy** (`anchor-service/business-server`, `anchor-service/client`) is the original
  Phase-0 anchor MVP that proved the SEP-24 loop; it is superseded by `anchor-template/*`
  but kept until consolidation, with the still-canonical provisioner and scripts living
  alongside it.
- **Reference** (`anchor-platform/`, `sep24-reference-ui/`, saved Stellar docs) is
  upstream material to learn the correct contract — read, never built, never edited to
  change behavior.

The rule is that the *distinction is always explicit*: if two things look like the same
component, one is labelled here and in `docs/project/` as the canonical one. Drift
between them is tracked as tech debt, not hidden.

---

## Contributing

- **Read [`AGENTS.md`](AGENTS.md) first.** It is the canonical guidance for both humans
  and coding agents and it overrides assumptions. `CLAUDE.md` imports it.
- **Respect the seams.** To add KYC, payouts, or UPI, extend the *adapter interface* with
  a working mock default and put the vendor behind it — do not scatter vendor SDK calls
  through core flows.
- **Keep testnet/sandbox the default** and gate anything that moves real money.
- **Match the surrounding stack and conventions.** TS/Express + Stellar SDK for backend
  services, App-Router Next.js for frontends.
- **Migrations, not runtime DDL.** Schema changes are versioned and must apply to a fresh
  database (the `db` CI check enforces this).
- **CI must be green.** All six workflows are part of the contract; money-flow and DR
  checks especially must not regress.
- **Record consequential decisions** in `anchor-service/docs/decision-log.md` (`DL-00x`)
  or an ADR under `docs/project/`, and update this README or `AGENTS.md` when reality
  changes.
- **Never present legal/compliance conclusions as settled** — document open questions in
  [`docs/project/COMPLIANCE_OPEN_QUESTIONS.md`](docs/project/COMPLIANCE_OPEN_QUESTIONS.md).

---

## License

_TBD._ No open-source license has been declared for this repository yet. Until a
`LICENSE` file is added, all rights are reserved by the project owners; do not assume
permission to use, copy, modify, or distribute.
