<div align="center">

# NordStern

### Anchor Infrastructure as a Service — become a compliant Stellar anchor without building the stack.

[Live site](https://nordstern.live) · [Documentation](https://docs.nordstern.live) · [Architecture](docs/architecture/Architecture.md) · [AGENTS.md (canonical spec)](AGENTS.md)

**Testnet-first · Multi-tenant · One-command local platform · Docker-based provisioning**

</div>

---

## What is NordStern?

A **Stellar anchor** is the on/off-ramp between local fiat (INR) and the Stellar network: it accepts fiat deposits and issues 1:1-backed tokens (e.g. USDC), and redeems those tokens back to fiat. Running one well means operating SEP protocol servers, KYC/AML, banking/UPI integrations, treasury, and compliance workflows — expensive and *identical to rebuild for every anchor*.

**NordStern runs and manages that entire stack on behalf of anchor operators.** A business brings its liquidity, bank relationship, and regulatory standing; NordStern provides the SEP servers, KYC integration, payment rails, treasury safety, and the operator/customer consoles. Think **"Stripe for Stellar anchors"** — Stripe let any business accept cards without becoming a payments company; NordStern lets any business run a fiat ↔ Stellar ramp without becoming a protocol, compliance, and treasury company.

Concretely, **one platform provisions and operates many isolated anchor stacks.** A founder applies, NordStern approves, and a single click spins up a dedicated, white-labelled anchor — its own keypairs, database, containers, domain, customer app, and operator console — through the Docker Engine API, routed by Traefik. It exists because the *plumbing* of an anchor is the same every time and the *business* around it is not.

> **Who it's for:** fintechs, wallets, and exchanges that want a compliant INR ↔ USDC ramp, and Stellar ecosystem/hackathon reviewers evaluating the architecture.
>
> **What it is *not*:** a crypto exchange, a consumer trading app, a custodial wallet, or a token launchpad. End users hold their own funds in third-party Stellar wallets (Lobstr, Vibrant, Freighter). See [`AGENTS.md`](AGENTS.md) §1 — the canonical source of truth for this repository.

```
┌──────────── FOUNDER / OPERATOR / ADMIN ─────────────┐
│  Founder Console (register.*) · Admin Console (admin.*)  ·  Landing site │
└───────────────────────────────┬──────────────────────┘
                                 │ same-origin /api  (host-only cookies)
                                 ▼
┌──────────── PLATFORM (shared, always-on) ───────────┐
│  Platform API (:4000)  →  Control Plane / Provisioner (:3002)  →  Aggregator (:3005) │
│  Postgres (:5432, N DBs) · Traefik (:80) · SecretStore (Secrets Manager / LocalStack) │
└───────────────────────────────┬──────────────────────┘
                                 │ Docker Engine API (provision on demand)
                                 ▼
┌──────────── PER-ANCHOR STACK (one per operator) ────┐
│  Anchor Platform (SEP-1/10/12/24)  →  Business Server (money runtime) │
│  Customer App  ·  Operator Console   —  served at  <slug>.anchors.…    │
└───────────────────────────────┬──────────────────────┘
                                 ▼
        End customer's Stellar wallet (Lobstr / Vibrant / Freighter) — settlement
```

> Full technical diagram and prose: **[docs/architecture/Architecture.md](docs/architecture/Architecture.md)** · plain-English walkthrough: **[Walkthrough](docs/guides/Walkthrough.md)**.

---

## Table of contents

- [Features](#features)
- [Repository structure](#repository-structure)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Local development (one command)](#local-development-one-command)
- [Running individual services](#running-individual-services)
- [Provisioning your first anchor](#provisioning-your-first-anchor)
- [Test Mode vs Production Mode](#test-mode-vs-production-mode)
- [Running tests](#running-tests)
- [Manual demo guide (for judges)](#manual-demo-guide-for-judges)
- [Screenshots](#screenshots)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Feature | Description |
|---|---|
| **One-click anchor provisioning** | An approved founder redeems an invite and a complete anchor stack is created programmatically — keypairs, on-chain asset, database, containers, domain. |
| **Docker-based provisioning** | The control-plane uses the Docker Engine API (`dockerode`) to launch each anchor's container stack on demand; Traefik routes it under a wildcard domain. |
| **Multi-tenant by design** | Every anchor gets an isolated database, keypairs, secrets, cookies, and consoles. Shared infrastructure only where safe. |
| **Per-anchor database** | `anchordb_<slug>` is created at provision time and holds that anchor's money tables — no cross-tenant data. |
| **Per-anchor domains** | Each anchor is served at its own host (`<slug>.anchors.127.0.0.1.sslip.io` locally, `<slug>.nordstern.live` in prod). |
| **White-labelled customer app** | Branded buy / sell / KYC / history experience; the blockchain is hidden from end users. Non-custodial. |
| **White-labelled operator dashboard** | Per-anchor console: overview, transactions, treasury, customers, compliance, credentials, webhooks, API keys, team, audit. |
| **Stellar Anchor Platform integration** | Runs the official `stellar/anchor-platform` image for SEP-1/10/12/24; our code answers its callbacks and owns the *business* logic. |
| **Identity & DIDIT KYC** | Verify once, reuse across flows; document + liveness + face-match via [DIDIT](https://didit.me), behind a swappable `KycProvider` seam (mock default). |
| **Payment rails (Razorpay / Cashfree)** | UPI collection (on-ramp) and payouts (off-ramp) behind swappable adapters — [Razorpay](https://razorpay.com) and [Cashfree](https://www.cashfree.com). |
| **Treasury & money-safety core** | Idempotent deposit release, treasury-reserve guardrail, at-most-once withdrawal payout, fail-closed KYC. |
| **Secrets never in the database** | PSP/banking credential *values* live in AWS Secrets Manager (LocalStack in dev); Postgres stores only pointers. |
| **Test Mode** | Everything on Stellar **testnet** with Friendbot funding and mock rails — no business registration, no real money. |
| **Production Mode** | Mainnet USDC, real KYC, real payment rails, RDS, TLS — a deliberate, gated config swap. |

---

## Repository structure

One git repository, organized into `apps/` · `services` · `packages/` · `templates` · `infrastructure/` · `docs/`. There is **no top-level build** — each subproject has its own tooling; work inside the relevant one.

**`apps/`** — user-facing frontends
| Path | Role |
|---|---|
| [`apps/landing/`](apps/landing/) | **Marketing landing** site (Next.js) — top-of-funnel into the founder application. |
| [`apps/docs/`](apps/docs/) | **Documentation site** ([Fumadocs](https://fumadocs.dev)) — `docs.nordstern.live`. |
| [`platform/founder-console/`](platform/founder-console/) | **Founder Console** (Next.js, `:4001` → `register.nordstern.live`) — apply, log in, redeem → provision, portfolio overview. |
| [`platform/admin-console/`](platform/admin-console/) | **Admin Console** (Next.js, `:4002` → `admin.nordstern.live`) — internal application review queue (approve / reject → redeem invites). |
| [`anchor-template/anchor-client/`](anchor-template/anchor-client/) | **Customer App** (Next.js, per anchor) — white-label buy / sell / KYC / history. Image `nordstern/anchor-client:dev`. |
| [`anchor-template/console/`](anchor-template/console/) | **Operator Console** (Next.js, per anchor) — treasury, transactions, customers, compliance. Image `nordstern/operator-console:dev`. |
| [`apps/mobile/`](apps/mobile/) | In-progress native wallet prototype (React Native / Expo). |

**Services** — backend runtimes (Express / Node)
| Path | Role |
|---|---|
| [`platform/api/`](platform/api/) | **Platform API** (`:4000`) — onboarding, orgs & memberships, OTP auth realms, customer identity, secret refs, audit, email lifecycle. Drives the provisioner; registers live anchors. |
| [`anchor-service/control-plane/`](anchor-service/control-plane/) | **Control Plane / Provisioner** (`:3002`) — the factory: `dockerode` orchestration, keygen, Friendbot funding, on-chain asset issuance, per-anchor `CREATE DATABASE`, config generation, container launch. |
| [`anchor-template/aggregator-service/`](anchor-template/aggregator-service/) | **Aggregator** (`:3005`) — live-anchor registry + health / routing / quote engine. |
| [`anchor-template/business-server/`](anchor-template/business-server/) | **Per-anchor money runtime** (`:3000`) — Anchor Platform callbacks, SEP-24 webview, mint/send, money-safety core + swappable adapters. Image `nordstern/business-server:dev`. |

**`packages/`** — shared libraries
| Path | Role |
|---|---|
| [`platform/shared-ui/`](platform/shared-ui/), [`platform/shared-auth/`](platform/shared-auth/) | Shared UI primitives + auth helpers used by both platform consoles. |
| [`packages/design-system/`](packages/design-system/) | Brand + design-system source and the Cashfree payment-integration skills (`.claude/skills/`). |

**Templates** — cloned per anchor at provision time
| Path | Role |
|---|---|
| [`anchor-template/config/`](anchor-template/config/) | Anchor Platform config templates (`anchor-platform.yaml`, `stellar.toml`, `assets.yaml`). |

**`infrastructure/`** — deployment & ops
| Path | Role |
|---|---|
| [`infrastructure/docker/`](infrastructure/docker/) | Compose stacks — `platform.yml` (local dev), `production.yml` (RDS/TLS/mainnet overlay), `pg-init.sql`, and the connected-platform run guide. |
| [`infrastructure/aws/`](infrastructure/aws/) | Modular **Terraform** (`terraform/`) + EC2 ops scripts (`scripts/`) for the AWS pilot (single EC2 + RDS). |
| [`infrastructure/scripts/`](infrastructure/scripts/) | Backup / restore / disaster-recovery drill scripts. |

**`docs/`**
| Path | Role |
|---|---|
| [`docs/architecture/`](docs/architecture/) | System design — Architecture, Platform (K8s target), Identity, Blueprint, Transactions. |
| [`docs/guides/`](docs/guides/) · [`docs/runbooks/`](docs/runbooks/) · [`docs/reference/`](docs/reference/) | Walkthrough & Testing guides · Recovery runbook · Readiness / Compliance / Roadmap. |
| [`docs/`](docs/) (Stellar reference) | Saved Stellar docs (Admin Guide, SEP guides, API references) + founder research. |

> **On `anchor-service/` vs `anchor-template/`:** the canonical provisioner lives in `anchor-service/control-plane`; the per-anchor runtime + template code (business-server, customer app, operator console, config) lives in `anchor-template/`. The four service/console folders keep their historical paths — grouped above by role — while `apps/`, `packages/`, and `infrastructure/` hold the reorganized components.

---

## Architecture

**The Anchor Platform owns the protocol; our code owns the business.** We never reimplement SEP-1/10/12/24 — we configure the official `stellar/anchor-platform` image and answer the decisions it delegates.

```
 ┌──────────────────── FOUNDER / OPERATOR / ADMIN ────────────────────┐
 │  Founder Console (register.*)  ·  Admin Console (admin.*)  ·  Landing │
 └───────────────────────────────────────┬─────────────────────────────┘
                                          │ same-origin /api (host-only cookies)
                                          ▼
 ┌──────────────────── PLATFORM (shared, always-on) ──────────────────┐
 │  Platform API (:4000)  ── onboarding · orgs · OTP auth · customers ·  │
 │      │        │              secret refs · audit · email lifecycle     │
 │      │        └───────────► Aggregator (:3005) — registry · health ·   │
 │      │                        routing · quote engine                   │
 │      ├──────────► SecretStore (AWS Secrets Manager / LocalStack)       │
 │      │              PSP + banking credential VALUES (never in Postgres) │
 │      ▼                                                                 │
 │  Control Plane / Provisioner (:3002)                                   │
 │      dockerode → keygen · Friendbot · asset issuance · CREATE DATABASE  │
 │      │              · generate AP config · launch containers            │
 │  Traefik v3.7  ─────────────── wildcard routing *.nordstern.live        │
 │  PostgreSQL  (platformdb · controldb · aggregatordb · anchordb_<slug>)  │
 └───────────────────────────────────────┬─────────────────────────────┘
                                          │ Docker Engine API (provision)
                                          ▼
 ┌──────────────────── PER-ANCHOR STACK (one per operator) ───────────┐
 │  Anchor Platform (stellar/anchor-platform)  SEP-1/10/12/24  ─► Horizon │
 │      │  callbacks                                                      │
 │      ▼                                                                 │
 │  Business Server  ← money logic · SEP-24 webview · idempotent release · │
 │      │              treasury guard · KYC/payout adapters                │
 │      ▼                                                                 │
 │  Customer App   <slug>.…            Operator Console   console-<slug>.… │
 │      buy · sell · KYC · history                                        │
 └───────────────────────────────────────┬─────────────────────────────┘
                                          ▼
                       End customer's Stellar wallet (Lobstr / Vibrant / Freighter)
                       signs SEP-10 auth · holds tokens (non-custodial)
```

**Money movement is asynchronous and status-driven.** Transaction state is authoritative in the Anchor Platform / per-anchor database and advanced via the Platform API and the Stellar Observer — never by blocking request/response. Fund moves are idempotent and matched by memo.

**Full detail:** [Architecture](docs/architecture/Architecture.md) · [Platform](docs/architecture/Platform.md) · [Identity](docs/architecture/Identity.md).

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js (App Router), React 19, Tailwind CSS, TanStack Query, React Hook Form + Zod, Framer Motion, `@stellar/freighter-api`; Fumadocs (docs site). |
| **Backend** | Node.js 20, TypeScript, Express, Zod, Helmet, `pino`, `express-rate-limit`, `jsonwebtoken`, Resend (email). |
| **Database** | PostgreSQL 15 · Drizzle ORM (platform-api) + `node-pg-migrate` (services) · `pg`. |
| **Blockchain** | Stellar (testnet by default), `@stellar/stellar-sdk`, Horizon, Friendbot, SEP-1/10/12/24, `stellar/anchor-platform` image. |
| **Infrastructure** | Docker + Docker Compose v2, Traefik v3.7, `dockerode` provisioning, LocalStack (dev secrets). |
| **Cloud (prod)** | AWS — EC2, RDS Postgres, Secrets Manager, IAM, CloudWatch, SSM, Elastic IP, (optional) Route53. |
| **IaC** | Terraform (`hashicorp/aws`, `hashicorp/random`); authored EKS/Helm/ArgoCD target (not yet wired). |
| **Testing / DevOps** | Vitest, Testcontainers (Postgres), LocalStack; GitHub Actions (6 workflows), gitleaks, `pg_dump`/`pg_restore` DR tooling. |
| **KYC / Payments** | DIDIT (KYC), Razorpay (UPI collection), Cashfree (payouts) — all behind swappable adapters with mock defaults. |

---

## Prerequisites

To run the **local platform** you need exactly:

| Requirement | Version | Why |
|---|---|---|
| **Docker Engine** | 24+ | The provisioner launches anchor stacks via the Docker socket. |
| **Docker Compose** | v2 (`docker compose`) | Brings up the platform stack. |
| **Node.js** | **≥ 20** (LTS) | Build/setup scripts and running services outside Docker (Docker images use `node:20`). |
| **npm** | 10+ (ships with Node 20) | Every workspace has a `package-lock.json`. |
| **git** | any | Clone the repo. |
| **bash** | any | `anchor-service/scripts/dev.sh` (macOS/Linux; on Windows use **WSL2**). |
| **RAM** | ~8 GB free for Docker | Postgres + Traefik + LocalStack + control-plane + aggregator + platform-api + 2 consoles, plus each provisioned anchor's stack. |
| **Internet** | — | Pulls `stellar/anchor-platform:latest`, funds testnet accounts via Friendbot, talks to Horizon. |

**Only for production / cloud deploy (not local):** AWS CLI v2 and Terraform ≥ 1.5.

> **Not required:** Rust, Java, or the Stellar CLI. The Anchor Platform runs as a prebuilt Docker image, and all Stellar operations go through the JavaScript SDK.

---

## Environment variables

> Do **not** hand-edit dozens of variables. Almost everything has a safe dev default baked into `infrastructure/docker/platform.yml`. You generate a couple of secrets once, and optionally add API keys to enable real KYC/email.

### Development

The one-time setup script writes **`anchor-service/.env.base`**, which `dev.sh` loads via `--env-file`:

```bash
cd anchor-service
node scripts/setup-base.mjs
```

This generates:

| Variable | Meaning |
|---|---|
| `MASTER_KEK` | 32-byte base64 key-encryption-key that encrypts anchor signing keys at rest. |
| `CP_JWT_SECRET` | Control-plane JWT secret. |
| `ANCHOR_CONFIG_HOST_ROOT` | Absolute path to `anchor-service/anchor-configs/` (per-anchor generated configs, bind-mounted into the provisioner). |
| `SUREPASS_BASE_URL` / `SUREPASS_TOKEN` | Optional sandbox KYC (leave token empty to use the mock). |

**Everything else has a dev default** (JWT/service secrets, DB creds, network = `TESTNET`, asset model = `self-issued`, LocalStack secrets endpoint). To turn on real integrations, add these lines to `anchor-service/.env.base` before running `dev.sh`:

| Variable | Enables | Where to get it |
|---|---|---|
| `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` | Real DIDIT KYC injected into every anchor (fail-closed) | [didit.me](https://didit.me) dashboard |
| `RESEND_API_KEY`, `EMAIL_FROM` | Real transactional email (OTP + lifecycle). Unset → emails are logged to the console instead | [resend.com](https://resend.com) |

> Per-anchor **PSP credentials (Razorpay / Cashfree)** are *not* global env — an operator adds them per anchor, and they are stored in the **SecretStore** (LocalStack in dev), never in the database.

### Production

Copy [`.env.prod.example`](.env.prod.example) → a git-ignored `.env` **on the host** and fill it from AWS Secrets Manager (created by Terraform). Bring up with the prod overlay:

```bash
docker compose -f infrastructure/docker/platform.yml -f infrastructure/docker/production.yml --env-file .env up -d
```

Required production secrets and where they come from:

| Secret(s) | Source |
|---|---|
| `MASTER_KEK`, `CP_JWT_SECRET`, `PLATFORM_JWT_ACCESS_SECRET`, `PLATFORM_JWT_REFRESH_SECRET`, `SERVICE_SECRET`, `CP_SERVICE_PASSWORD` | AWS Secrets Manager (`nordstern/pilot/platform`) — generated by Terraform |
| `RDS_HOST`, `DB_USER`, `DB_PASSWORD` | RDS + AWS Secrets Manager (`nordstern/pilot/database`) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | You choose — **strong** values; the API refuses to boot in prod with `admin`/`admin` or weak secrets |
| `RESEND_API_KEY`, `EMAIL_FROM` | [Resend](https://resend.com) (verified sender domain) |
| `ACME_EMAIL` | Your ops email — Let's Encrypt TLS notices |
| `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` | [DIDIT](https://didit.me) — **required in prod** (anchors fail closed without KYC) |
| `ASSET_MODEL=external`, `STELLAR_NETWORK=PUBLIC`, `HORIZON_URL`, `NETWORK_PASSPHRASE`, `EXTERNAL_ASSET_CODE=USDC`, `EXTERNAL_ASSET_ISSUER`, `TREASURY_PUBLIC`, `TREASURY_SECRET` | Mainnet USDC config — a pre-funded Stellar treasury account you control (Circle's USDC issuer for `EXTERNAL_ASSET_ISSUER`) |
| AWS account | [aws.amazon.com](https://aws.amazon.com) — RDS, EC2, Secrets Manager, IAM |

---

## Local development (one command)

The whole connected platform runs from a single compose file. The canonical launcher builds the per-anchor images, pulls the Anchor Platform image, and brings everything up:

```bash
# 1. Clone
git clone https://github.com/manovHacksaw/nordstern.git
cd nordstern

# 2. One-time: generate the master key + anchor-config dir (writes anchor-service/.env.base)
cd anchor-service
node scripts/setup-base.mjs

# 3. Build the per-anchor images + bring up the platform stack
./scripts/dev.sh
```

`dev.sh` runs, in order:
1. Builds `nordstern/business-server:dev`, `nordstern/anchor-client:dev`, `nordstern/operator-console:dev` from `anchor-template/*`.
2. `docker pull stellar/anchor-platform:latest`.
3. `docker compose --env-file anchor-service/.env.base -f ../infrastructure/docker/platform.yml up -d --build`.

**Services that start (and their ports):**

| Service | URL / port | Role |
|---|---|---|
| Postgres | `localhost:5432` | `platformdb` · `controldb` · `aggregatordb` · `anchordb` (per-anchor DBs created at provision time) |
| Traefik | `:80`, dashboard `http://localhost:8090` | Front door / wildcard routing for provisioned anchors |
| SecretStore (LocalStack) | `localhost:4566` | AWS Secrets Manager stand-in (PSP/signing creds) |
| Control Plane / Provisioner | `http://localhost:3002` | The real `dockerode` provisioner |
| Aggregator | `http://localhost:3005` | Registry / health / quote / routing |
| Platform API | `http://localhost:4000` | Onboarding, auth, drives provisioning |
| **Founder Console** | **`http://localhost:4001`** (or `http://register.localhost`) | Apply · redeem · provision · overview |
| **Admin Console** | **`http://localhost:4002`** (or `http://admin.localhost`) | Approve / reject applications |

**Startup & health:** `depends_on` sequences boot — Postgres (healthcheck) → schema push (`platform-migrate` runs `drizzle-kit push` and exits) → control-plane + aggregator + LocalStack (healthcheck) → platform-api → consoles. First boot takes a few minutes (image builds + `stellar/anchor-platform` pull). You know it's up when `http://localhost:4001` loads the founder console and `docker compose -f infrastructure/docker/platform.yml ps` shows the services healthy.

**Tear down:**

```bash
docker compose -f infrastructure/docker/platform.yml down          # stop
docker compose -f infrastructure/docker/platform.yml down -v        # stop + wipe the Postgres volume
```

> **Manual path** (equivalent to `dev.sh`, if you prefer to see each step): run `node scripts/setup-base.mjs`, then `export MASTER_KEK=… ANCHOR_CONFIG_HOST_ROOT=/abs/path/anchor-service/anchor-configs`, build the three images above, `docker pull stellar/anchor-platform:latest`, and `docker compose -f infrastructure/docker/platform.yml up --build`.

---

## Running individual services

Every service also runs standalone for hot-reload development (`npm install` once per workspace). Express services use `tsx watch`; Next apps use `next dev`.

| Service | Commands | Port |
|---|---|---|
| Platform API | `cd platform/api && npm install && npm run dev` | `:4000` |
| Founder Console | `cd platform/founder-console && API_URL=http://localhost:4000 npm run dev` | `:3000` |
| Admin Console | `cd platform/admin-console && API_URL=http://localhost:4000 npm run dev -- -p 3001` | `:3001` |
| Control Plane | `cd anchor-service/control-plane && npm install && npm run dev` | `:3002` |
| Aggregator | `cd anchor-template/aggregator-service && npm install && npm run dev` | `:3005` |
| Business Server | `cd anchor-template/business-server && npm install && npm run dev` | `:3000` |
| Customer App | `cd anchor-template/anchor-client && npm install && npm run dev` | `:3001` |
| Operator Console | `cd anchor-template/console && npm install && npm run dev` | `:3001` |
| Landing site | `cd apps/landing && npm install && npm run dev` | `:3000` |
| Docs site | `cd apps/docs && npm install && npm run dev` | `:3000` |

> **Zero-backend UI work:** the two consoles can proxy `/api/*` to the **live** backend, so you can style them with no local stack. Set `API_URL=https://api.nordstern.live`. See [`platform/LocalDev.md`](platform/LocalDev.md). Type-check any workspace with `npm run typecheck`.

---

## Provisioning your first anchor

With the platform up (`./scripts/dev.sh`), take an anchor from application to live in five steps. **No business registration is required in Test Mode.**

1. **Submit an application** — open the Founder Console at **`http://localhost:4001/register`** and fill in the company profile / use case. → *"Application received."*
2. **Approve it** — open the Admin Console at **`http://localhost:4002`**, log in (**dev credentials: `admin` / `admin`**), open the application, and **approve**. This generates a signed **redeem invite link**.
3. **Redeem → provision** — open the redeem link (`http://localhost:4001/redeem?token=…`), choose a **subdomain slug** (e.g. `acme`), and submit. This triggers the **real** provisioner.
4. **Watch provisioning** — the console polls the control-plane through its live stages:
   `Generating keypairs → Funding accounts & issuing asset on Stellar → Creating database & containers → Waiting for stack to become healthy → completed`.
5. **Visit your anchor:**
   - Customer app → **`http://<slug>.anchors.127.0.0.1.sslip.io`**
   - Operator console → **`http://console-<slug>.anchors.127.0.0.1.sslip.io`**

`*.sslip.io` resolves to `127.0.0.1` automatically, so **no `/etc/hosts` editing is needed**.

> **Prefer curl?** The exact request/response for each step (applications → approve → redeem → status → aggregator quote/route → SEP handoff) is in [`infrastructure/docker/README.md`](infrastructure/docker/README.md). SEP-24 itself is **wallet-driven**: the aggregator returns real SEP endpoints, and a Stellar wallet performs SEP-10 + SEP-24 to move funds.

---

## Test Mode vs Production Mode

| | **Test Mode** (default) | **Production Mode** |
|---|---|---|
| Network | Stellar **testnet** (`Test SDF Network ; September 2015`) | Stellar **mainnet** (`PUBLIC`) |
| Funding | **Friendbot** (free, automatic) | Pre-funded mainnet **treasury** account |
| Asset | `self-issued` test token | `external` real **USDC** (Circle issuer) |
| KYC | Mock adapter (auto-`ACCEPTED`), or real DIDIT if creds set | Real **DIDIT** — required, **fail-closed** |
| Payment rails | Simulated on-chain release | Real **Razorpay** (UPI in) + **Cashfree** (payouts) |
| Business registration | **Not required** | Licensed entity + regulatory standing |
| Database / secrets | Local Postgres + LocalStack (ephemeral) | **RDS** + AWS **Secrets Manager** (durable) |
| Routing / TLS | Traefik `web` (`:80`) under `*.anchors.127.0.0.1.sslip.io` | Traefik `websecure` (`:443`) + Let's Encrypt under `*.nordstern.live` |
| Money | **None — no real funds move** | Real funds — irreversible; a deliberate go-live gate |
| Compose | `infrastructure/docker/platform.yml` | `+ infrastructure/docker/production.yml` overlay |

> Testnet/sandbox is the **default**, and moving real money is a deliberate, reviewed change ([`AGENTS.md`](AGENTS.md) §7). Production readiness is tracked honestly in [`PRODUCTION_READINESS.md`](docs/reference/Readiness.md).

---

## Running tests

Test runner: **Vitest**. The highest-value suites run against **real infrastructure** (not mocks) because they guard money and secrets — so **Docker must be running** for them.

```bash
# Money-flow invariants (deposit release + withdrawal payout) — Testcontainers Postgres 15
cd anchor-template/business-server && npm install && npm test

# SecretStore abstraction against a real LocalStack AWS Secrets Manager (LocalStack ↔ AWS parity)
cd platform/api && npm install && npm test

# Type-check any workspace
npm run typecheck

# Disaster-recovery drill — backup → destroy → restore, asserting money data returns byte-for-byte
./infrastructure/scripts/dr-drill.sh
```

**CI (GitHub Actions, 6 workflows on every PR):** build/typecheck, DB migration apply-to-fresh-Postgres, `docker build` for changed images, gitleaks + artifact hygiene, money-flow tests, and the DR drill. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Manual verification:** a persona-by-persona script is in [`docs/guides/Testing.md`](docs/guides/Testing.md).

---

## Manual demo guide (for judges)

We recommend reviewing the project in this order:

1. **Landing page** — `cd apps/landing && npm install && npm run dev` (or [nordstern.live](https://nordstern.live)). The product story and positioning.
2. **Documentation** — `cd apps/docs && npm install && npm run dev` (or [docs.nordstern.live](https://docs.nordstern.live)). Concepts, architecture, operator/customer guides.
3. **Bring up the platform** — `cd anchor-service && node scripts/setup-base.mjs && ./scripts/dev.sh`.
4. **Founder onboarding** — `http://localhost:4001/register` → submit an application.
5. **Admin approval** — `http://localhost:4002` (log in `admin` / `admin`) → approve → copy the redeem link.
6. **Provision an anchor** — redeem the link, pick a slug, and watch it stream `provisioning → active`.
7. **Operator console** — `http://console-<slug>.anchors.127.0.0.1.sslip.io` → overview, transactions, treasury, customers, compliance.
8. **Customer app** — `http://<slug>.anchors.127.0.0.1.sslip.io` → OTP login, KYC, **Buy** (fiat → token) and **Sell** (token → fiat), history.
9. **Architecture review** — [`docs/architecture/Architecture.md`](docs/architecture/Architecture.md) and [`Walkthrough`](docs/guides/Walkthrough.md).

---

## Screenshots

Best experienced live — every surface below runs locally in minutes via [`./scripts/dev.sh`](#local-development-one-command). The table maps each product surface to the URL where you can see it and the asset path it publishes to. Capture specs (1440px, light theme, redacted test data) and the full inbox mapping are in [`apps/docs/public/screenshots/MANIFEST.md`](apps/docs/public/screenshots/MANIFEST.md).

| Surface | See it live at | Published asset |
|---|---|---|
| **Landing** | `apps/landing` (`:3000`) or [nordstern.live](https://nordstern.live) | `screenshots/landing/hero.png` |
| **Docs** | `apps/docs` (`:3000`) or [docs.nordstern.live](https://docs.nordstern.live) | — |
| **Founder Console** | `http://localhost:4001/register` | `screenshots/founder/register.png` |
| **Provision flow** | redeem → live status stream | `screenshots/founder/activate-workspace.png` |
| **Admin Console** | `http://localhost:4002` | `screenshots/admin/applications-queue.png` |
| **Operator dashboard** | `http://console-<slug>.anchors.127.0.0.1.sslip.io` | `screenshots/operator/dashboard.png` |
| **Transaction dashboard** | Operator → Transactions | `screenshots/operator/transactions.png` |
| **Customer App** | `http://<slug>.anchors.127.0.0.1.sslip.io` | `screenshots/customer/home.png` |
| **Customer Buy flow** | Customer → Buy | `screenshots/customer/buy.png` |
| **Customer Sell flow** | Customer → Sell | `screenshots/customer/sell.png` |

> Image assets live under `apps/docs/public/screenshots/<surface>/` (relative to the docs site). Capture per the manifest, then embed each with a standard Markdown image tag pointing at its published path.

---

## Documentation

| Topic | Document |
|---|---|
| Canonical product spec (read first) | [`AGENTS.md`](AGENTS.md) |
| Architecture (services, ports, data flow) | [`docs/architecture/Architecture.md`](docs/architecture/Architecture.md) |
| Plain-English platform walkthrough | [`docs/guides/Walkthrough.md`](docs/guides/Walkthrough.md) |
| Identity & KYC design | [`docs/architecture/Identity.md`](docs/architecture/Identity.md) |
| Kubernetes target architecture | [`docs/architecture/Platform.md`](docs/architecture/Platform.md) |
| Production readiness matrix | [`docs/reference/Readiness.md`](docs/reference/Readiness.md) |
| Roadmap | [`docs/reference/Roadmap.md`](docs/reference/Roadmap.md) |
| Disaster-recovery runbook | [`docs/runbooks/Recovery.md`](docs/runbooks/Recovery.md) |
| Manual product test plan | [`docs/guides/Testing.md`](docs/guides/Testing.md) |
| Compliance open questions | [`docs/reference/Compliance.md`](docs/reference/Compliance.md) |
| Connected-platform run + curl flow | [`infrastructure/docker/README.md`](infrastructure/docker/README.md) |
| Terraform deployment | [`infrastructure/aws/terraform/README.md`](infrastructure/aws/terraform/README.md) |
| Anchor operations | [`anchor-template/Operations.md`](anchor-template/Operations.md) |
| Hosted docs site (Fumadocs) | [docs.nordstern.live](https://docs.nordstern.live) · source in [`apps/docs/`](apps/docs/) |
| Saved Stellar references | [`docs/`](docs/) (Admin Guide, SEP guides, API references) |

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| **`Cannot connect to the Docker daemon`** | Docker isn't running. Start Docker Desktop / the Engine, then re-run `./scripts/dev.sh`. |
| **`anchor-service/.env.base not found`** | You skipped setup. Run `cd anchor-service && node scripts/setup-base.mjs` first. |
| **`.env.base already exists` on setup** | Intentional guard. Delete it manually to regenerate (this rotates `MASTER_KEK` — testnet-only, safe). |
| **`MASTER_KEK … not set` (manual path)** | Only when running `docker compose` directly. `export MASTER_KEK=… ANCHOR_CONFIG_HOST_ROOT=…`, or just use `./scripts/dev.sh` which passes `--env-file`. |
| **Port already in use** (5432 / 80 / 4000 / 4001 / 4002 / 3002 / 3005 / 4566 / 8090) | Stop the conflicting process, or remap the port in `infrastructure/docker/platform.yml`. Common: a local Postgres on 5432. |
| **Provisioning fails at "Creating database & containers"** | The per-anchor `nordstern/business-server:dev` image wasn't built, or the Docker socket isn't mounted. `./scripts/dev.sh` builds the images; ensure `/var/run/docker.sock` is accessible. |
| **Anchor Platform container won't become healthy** | It's slow on first boot and the image is large. Ensure `docker pull stellar/anchor-platform:latest` succeeded and give it a minute; check `docker logs` for the anchor's AP container. |
| **`<slug>.anchors.127.0.0.1.sslip.io` doesn't resolve** | You're offline (sslip.io needs DNS) or behind a DNS filter. Add a `/etc/hosts` entry mapping the host to `127.0.0.1`, or check the Traefik dashboard (`:8090`) for the router. |
| **Admin login rejected** | Dev credentials are `admin` / `admin`. In production the API refuses to boot with those, so set strong `ADMIN_USERNAME`/`ADMIN_PASSWORD`. |
| **Secrets missing after a restart** | LocalStack community is **ephemeral** — restarting the `secrets` service wipes stored creds. Re-provision the affected anchor. |
| **No emails arrive** | `RESEND_API_KEY` isn't set, so the mailer logs emails to the console instead of sending — check `docker logs` for the platform-api. |
| **Platform API won't start in production** | By design it fail-closes on weak/default JWT, service, or admin secrets. Set strong values from Secrets Manager. |

---

## FAQ

**Is NordStern a crypto exchange or a wallet?** No. It's B2B infrastructure to *run* an anchor. There are no order books, no speculation, and no custody of user keys — end users hold funds in their own Stellar wallets.

**Does anything move real money out of the box?** No. Testnet is the default; funding is via Friendbot and rails are simulated. Real money requires the deliberate Production Mode config swap.

**Do I need an AWS account to try it locally?** No. Local dev uses a Postgres container and LocalStack (an AWS Secrets Manager stand-in). AWS is only for cloud deployment.

**Which wallets does the customer flow work with?** Any SEP-24 Stellar wallet — Lobstr, Vibrant, Freighter. The anchor renders the interactive deposit/withdraw webview those wallets open.

**Why does the provisioner mount the Docker socket?** It launches per-anchor container stacks on a single host — acceptable for the pilot. The (authored, not-yet-wired) Kubernetes target replaces this with an API + RBAC + NetworkPolicy model. See [`PRODUCTION_READINESS.md`](docs/reference/Readiness.md).

**Can I run just one anchor without the whole platform?** The per-anchor stack lives in `anchor-template/` (see its [`Makefile`](anchor-template/Makefile) and [`README.md`](anchor-template/README.md)); the platform is what provisions and operates many of them.

**Where's the single source of truth for intent?** [`AGENTS.md`](AGENTS.md). When code and docs disagree, that file wins.

---

## Contributing

- **Read [`AGENTS.md`](AGENTS.md) first** — it's the canonical guidance for humans and coding agents and overrides assumptions. `CLAUDE.md` imports it.
- **Respect the seams.** To add a KYC provider, payout rail, or UPI method, extend the *adapter interface* with a working mock default and put the vendor behind it — never scatter vendor SDK calls through core flows.
- **Keep testnet/sandbox the default** and gate anything that moves real money.
- **Match the surrounding stack** — TS/Express + Stellar SDK for backend services, App-Router Next.js for frontends.
- **Migrations, not runtime DDL** — schema changes are versioned and must apply to a fresh database (the `db` CI check enforces this).
- **CI must be green** — all six workflows are part of the contract; money-flow and DR checks must not regress.
- **Never present legal/compliance conclusions as settled** — document open questions in [`docs/reference/Compliance.md`](docs/reference/Compliance.md).

---

## License

**TBD.** No open-source license has been declared yet. Until a `LICENSE` file is added, all rights are reserved by the project owners; do not assume permission to use, copy, modify, or distribute.

---

<div align="center">

Built on [Stellar](https://stellar.org) · Powered by the [Stellar Anchor Platform](https://developers.stellar.org/platforms/anchor-platform)

</div>
