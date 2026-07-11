# NordStern — Anchor Infrastructure as a Service

> **Read this before writing any code in this repository.** It exists so an AI
> coding agent (Claude Code, Codex, Cursor, etc.) understands *what* is being
> built, *what is not*, and *where the flexible seams are*. Skimming it will lead
> you to build the wrong product.

`CLAUDE.md` imports this file, so Claude Code and Codex share one source of truth.
Deeper detail lives in `docs/` (linked throughout).

---

## 1. Product summary

**NordStern is B2B infrastructure that lets a business become a compliant Stellar
anchor in India without building the technical, KYC, banking, and operations
stack itself.** A Stellar *anchor* is the on/off-ramp between fiat (INR) and the
Stellar network: it takes fiat deposits and issues 1:1-backed tokens, and it
redeems those tokens back to fiat. Doing this well means running SEP protocol
servers, KYC/AML, banking/UPI integrations, treasury, and compliance workflows —
expensive and repetitive to rebuild for every anchor.

NordStern runs and manages that stack **on behalf of anchors**. The pitch to a
customer is roughly: *"Bring your liquidity, your bank relationship, and your
regulatory standing. We provide the SEP servers, KYC integration, payment rails,
and the operator console. You collect the spread/fees."*

Business context and founder research: `docs/independent_research/`
(`business_model.txt`, `strategy.txt`, `offramp.txt`, `case-study.txt`).

### What NordStern is NOT — read this twice

Future agents repeatedly misread this product. It is **none** of the following:

- **Not a crypto exchange / trading app.** No order books, no speculation, no
  "buy the dip" UX. Token movement exists only to bridge fiat ↔ Stellar.
- **Not a consumer wallet.** End users hold funds in *third-party* Stellar
  wallets (Lobstr, Vibrant, Freighter). We do not custody user keys or ship a
  retail wallet as the product. NordStern renders the SEP-24 *interactive flow*
  that those wallets open in a webview — that is all.
- **Not a coin/token launchpad.** The `ANCH` test token is a stand-in for a
  fiat-backed asset, not a product to promote.
- **Not (yet) a self-serve multi-tenant SaaS.** See §2 — the MVP is one anchor
  we operate, built so it can *later* generalize.

If a design decision only makes sense for an exchange, a wallet, or a token sale,
it is almost certainly wrong here.

---

## 2. MVP scope

**Goal: build one working anchor service of our own, on the Stellar Anchor
Platform, structured so it becomes the template for anchors we onboard later.**

The functional MVP lives in **`anchor-service/`**. Target for the MVP:

1. **Stellar Anchor Platform running** (SEP-1/10/12/24 at minimum) against
   **testnet**, wired to a custom business server. working.
2. **SEP-24 deposit (on-ramp)** end-to-end: wallet authenticates, opens the
   interactive webview, and NordStern mints/sends `ANCH` to the user's Stellar
   address. working on testnet — but the **fiat-in step is simulated**
   (placeholder "wire" screen; clicking confirm just releases tokens).
3. **SEP-24 withdrawal (off-ramp)**: user sends `ANCH` back with a memo; the
   Observer detects it. detection works — but **fiat payout is simulated**
   (no real PSP). This is the seam Cashfree Payouts / RazorpayX plugs into.
4. **KYC flow** via SEP-12 — currently **mocked** (customer callback always
   returns `ACCEPTED`). Real provider (HyperVerge / Signzy) is a pluggable seam.
5. **UPI deposit flow** — **mocked/planned**. Design target is the SEP-24
   webview triggering a `upi://pay` intent (mobile) or QR (desktop), with
   backend verification. Not yet wired to a PSP.
6. **Fiat payout flow** designed *around* Cashfree/RazorpayX — **designed, not
   integrated**. Keep the interface abstract (see §6, §7 seams).
7. **An operator-facing surface**: `anchor-service/frontend` (functional wallet +
   dashboard) and `frontend/` (the higher-fidelity "Keel" console prototype).

Treat items marked as **the MVP work still to do**, and items marked as the
foundation you must not break.

Full phase breakdown: `docs/reference/Roadmap.md`.

---

## 3. Non-goals for the MVP

Do **not** build these yet, even if they seem natural — they add risk and lock in
decisions that are still open:

- **No full self-serve multi-tenant onboarding.** `control-plane` is a *seed* of
  the future SaaS (tenant auth, keypair provisioning). Do not turn "add an
  anchor" into an instant public signup. We onboard anchors by hand for now.
- **No mainnet / real money by default.** Everything runs on **testnet** with the
  `ANCH` test asset. Mainnet configs exist (`*.mainnet.*`) but are not the
  working path. Never point a demo at production rails casually — see §7.
- **No production banking/custody commitments.** Do not hardcode a single bank,
  BaaS provider, custody model, or "managed accounts" design as final. All are
  open legal questions (§5).
- **No KYC data warehouse / shared-KYC network yet.** "Verify once, use across
  anchors" is a future value prop, not MVP plumbing. Store the minimum.
- **No compliance/legal automation presented as advice.** We can build workflow
  scaffolding; we do not encode legal conclusions.
- **No Kubernetes / production infra hardening yet.** Docker Compose is the
  deliberate local-dev choice (`anchor-service/docs/decision-log.md`, DL-002).

---

## 4. Key technical assumptions

- **Network:** Stellar **testnet** (`Test SDF Network ; September 2015`), Horizon
  at `horizon-testnet.stellar.org`. Testnet **resets quarterly** — keypairs and
  the issued asset are wiped; never treat testnet keys/assets as durable
  (DL-003). Free XLM via Friendbot.
- **Asset:** `ANCH` (4-char test code), 2 significant decimals, issued by an
  issuer account, distributed from a distribution account. Stand-in for a real
  INR-backed asset (DL-004).
- **Anchor Platform version:** the config in `anchor-service/config/` targets AP
  **v4.4.0** and runs via the official `stellar/anchor-platform:latest` Docker image.
- **Business server language:** **TypeScript / Node.js + Express**, using
  `@stellar/stellar-sdk` for Stellar ops. There is no official TS Anchor SDK, so
  the Platform callback API is implemented by hand as a plain HTTP contract
  (DL-001). Match this stack; don't introduce Kotlin/Java for new services.
- **Control plane:** TypeScript/Express + **PostgreSQL** (`pg`), JWT + bcrypt
  auth. Separate `controldb` from the Anchor Platform's `anchordb`.
- **Frontends:** Next.js (App Router) + React 19. `anchor-service/frontend` uses
  `@stellar/freighter-api` for wallet signing and proxies to backends via
  `/biz/*` (business-server) and `/cp/*` (control-plane) rewrites — same-origin,
  no CORS in the browser.
- **Money movement is asynchronous and status-driven.** Transaction state lives
  in the Anchor Platform DB and is advanced via Platform API `PATCH`es and the
  Stellar Observer — not by synchronous request/response. Design new flows around
  status transitions and webhooks/callbacks, not blocking calls.
- **Secrets via env, never in files or the repo.** Signing seeds, DB creds, and
  PSP keys come from environment (`.env.testnet`, generated by
  `scripts/setup-testnet.mjs`). See §7.

---

## 5. Open legal / compliance questions

**We do not give legal advice, and neither should the code or docs.** The legal
model is deliberately *not finalized*. Architect for optionality; document
assumptions; flag anything that needs an expert. The following are **open
questions requiring qualified Indian fintech/regulatory counsel** — do not resolve
them in code:

- **Who holds the fiat, and under what license?** Master escrow/nodal account run
  by NordStern vs. each anchor holding its own account vs. a licensed
  managed-account model. This changes who is the regulated entity.
- **VDA / VDASP classification & FIU-IND.** Fiat-to-token on/off-ramps may be
  Virtual Digital Asset Service Providers requiring **FIU-IND registration**
  (PMLA reporting). Which entity registers — NordStern or the anchor?
  (`docs/independent_research/compliance.txt`, `after-infra-setup.txt`.)
- **Custody model.** Are we ever in custody of customer funds or keys? Custody
  triggers heavier obligations. The MVP should avoid custody unless/until counsel
  approves a model.
- **Banking partnership shape.** Embedded banking vs. bring-your-own-bank vs.
  BaaS (e.g. virtual accounts). Bank risk systems freeze crypto-adjacent,
  high-velocity accounts lacking FIU registration — a real operational risk.
- **KYC ownership & data residency.** Who is the controller of KYC data? Can it be
  shared across anchors ("verify once")? What are consent/retention limits?
- **Whose license enables what.** Payments, PPI/wallet, cross-border/remittance,
  and VDA rules may each apply depending on flows offered.

Keep the full, maintained list in `docs/reference/Compliance.md` and
add to it whenever a task surfaces a new dependency on legal choice. When code
*must* assume something to proceed, make the assumption a **named, swappable
config/adapter** (§6) and note it there.

---

## 6. Architecture principles

Full technical map (services, ports, data flow, seams):
**`docs/architecture/Architecture.md`**. Principles:

1. **The Anchor Platform owns the protocol; our code owns the business.** Never
   reimplement SEP-1/10/12/24 yourself — the AP does that. Our business server
   only answers the decisions the AP delegates: generate deposit address
   (`unique_address`), quote fees (`fee`), manage customers/KYC (`customer`),
   move funds, and advance transaction status via the Platform API.
2. **Everything external is a swappable adapter behind an interface.** KYC
   provider, fiat-in (UPI/collections), fiat-out (payout PSP), and banking/custody
   are all *seams*, because the legal model is unsettled (§5). Program to an
   interface (`KycProvider`, `PayoutProvider`, `DepositProvider`) with a **mock
   implementation as the default**, and Cashfree/RazorpayX/HyperVerge as
   *implementations* — never let a concrete vendor leak into core flow logic.
3. **One anchor now, multi-anchor later — but leave the seam.** Build the single
   anchor as if tenant identity will eventually scope every asset, keypair, and
   transaction. Don't build the multi-tenant control surface yet; don't design
   anything that would make adding a tenant dimension a rewrite.
4. **Testnet/mainnet is config, not code.** Network, Horizon URL, asset, and
   accounts come from config/env. Sandbox must be the default; going live must be
   a deliberate config swap (§7). No hardcoded production URLs or keys.
5. **State is authoritative in the Platform DB; treat money moves as idempotent
   and async.** Match incoming Stellar payments by memo; never assume synchronous
   settlement; never blindly retry a fund movement on 5xx without checking status
   first (duplicate transfers are hard to reverse).
6. **Keep the two frontends distinct** (§8): the *functional* wallet/dashboard vs.
   the *demo-grade* operator console prototype. Don't wire synthetic-data UI to
   live keys, and don't downgrade the functional UI to mock data.

---

## 7. Development workflow

### Repository is one git repo rooted at `nordstern/`

Subprojects have their own tooling. There is no top-level build. Work inside the
relevant subproject.

### Running the platform (the ONE supported way)

There is a single canonical run path — the connected platform stack
(`infrastructure/docker/platform.yml`). The old standalone `anchor-service/docker-compose.yml`
stack was retired.

```bash
cd anchor-service
node scripts/setup-base.mjs   # one-time: writes .env.base (MASTER_KEK + config dir)
./scripts/dev.sh              # builds the per-anchor images + brings up infrastructure/docker/platform.yml
```

Services and ports (see `infrastructure/docker/platform.yml`):

| Service | Port | Role |
|--------------------|-----------|------------------------------------------------------------|
| `db` (Postgres) | 5432 | platformdb / controldb / aggregatordb / anchordb |
| `secrets` (LocalStack) | 4566 | AWS Secrets Manager stand-in (PSP/signing creds) |
| `traefik` | 80 / 8090 | Front door — routes `<slug>.anchors.localhost` + consoles |
| `platform-api` | 4000 | Onboarding: auth, applications, drives provisioning |
| `control-plane` | 3002 | The real provisioner (dockerode, keys, asset, per-anchor DB)|
| `aggregator` | 3005 | Registry / quote / routing / health |
| `founder-console` | 4001 | `register.*` — founder journey |
| `admin-console` | 4002 | `admin.*` — NordStern internal review |

The compose files live under `infrastructure/docker/` (`platform.yml` for local dev,
`production.yml` as the mainnet/RDS/TLS overlay). Per-anchor containers (Anchor Platform,
business-server, anchor-client, operator-console) are created **dynamically** by the
control-plane during provisioning — not by compose.

- `.env.base` does **not** exist until you run `setup-base.mjs` — the first failure new
  agents hit. `dev.sh` will tell you.
- Smoke-test flows without a wallet: `node scripts/test-deposit.mjs`,
  `node scripts/test-withdrawal.mjs`.

### Running the console/landing (`apps/landing`)

The Next.js `apps/landing` marketing app (see its own
`package.json` / `AGENTS.md`). It is a **prototype with synthetic data** —
running it does not touch the anchor backend. Its brand/design-system source and the
Cashfree payment-integration skills live in `packages/design-system/`.

### Going live / real money — treat as a gated, deliberate act

The **only** thing separating "simulated" from "real money" is the base URL + the
key pair (Stellar network *and* any PSP like Cashfree). Because that boundary is
just config:

- Sandbox/testnet must remain the **default**. Never hardcode a production URL.
- Real disbursement (mainnet payout, live Cashfree Payouts) moves actual funds
  and is largely irreversible. Do not enable it in a demo path.
- Before *anyone* says an integration is "production-ready", surface the go-live
  checklist (env swap, webhook signature verification, backend re-verification,
  domain whitelisting, dead-code cleanup) rather than declaring readiness.
- Payment-provider integration work (Cashfree, RazorpayX) has its own skills under
  `packages/design-system/.claude/skills/` and its own `packages/design-system/CLAUDE.md`.
  Follow those when touching PSP code.

### General conventions

- Match the surrounding code's style, naming, and structure. TS/Express + Stellar
  SDK for backend services; App-Router Next.js for frontends.
- Confirm the current Anchor Platform behavior against the running container or
  `docs/` before assuming SEP semantics from memory — AP versions differ.
- Record any consequential architectural choice in
  `anchor-service/docs/decision-log.md` (follow the `DL-00x` format).

---

## 8. How to work with the Stellar Anchor Platform install

The MVP runs the **`stellar/anchor-platform:latest` Docker image**, launched **per anchor
by the control-plane provisioner** (dockerode) with `-s -p -o` (SEP server, Platform API,
Observer). Its configuration is generated per-anchor by the provisioner
(`control-plane/src/config-gen.ts`); the templates live in **`anchor-service/config/`**:
- `anchor-platform.yaml` — SEP toggles, network, callback/Platform API URLs, DB, assets.
  (Note: SEP-6/31/38 are enabled only because the AP requires them alongside SEP-24; SEP-24
  is the one active flow.)
- `stellar.toml` — SEP-1 service-discovery file wallets fetch.
- `assets.yaml` — the asset definition (deposit/withdraw limits/methods).

Rule of thumb: **to change how the anchor behaves, edit `anchor-service/config/` templates +
`config-gen.ts` and the business server.** (The upstream AP source clone `anchor-platform/`
and `sep24-reference-ui/` were removed 2026-07-09 — they're on GitHub upstream if you need to
study AP internals or the SEP-24 reference wallet.)

---

## 9. How to use the documentation in `docs/`

- **`docs/independent_research/`** — founder research and product thinking
  (business model, strategy, off-ramp/UPI flow, KYC providers, compliance,
  Cowrie case study). Use for *intent and rationale*. It is exploratory notes,
  **not** a spec — where it conflicts with this file or the code, this file wins.
- **`docs/Admin_Guide/`, `docs/SEP_GUIDE/`, `docs/API_References/`,
  `docs/ecosystem/`, `docs/index.md`** — saved Stellar documentation. Use as the
  **authoritative reference** for SEP semantics and AP admin/config.
- **`docs/Product_Overview.md`** — a saved clipping of Stellar's Anchor Platform
  overview page (reference despite the name), not a NordStern product spec.
- **`docs/architecture/`, `docs/guides/`, `docs/runbooks/`, `docs/reference/`** —
  **our authored, maintained context** (created for agents):
  - `docs/architecture/Architecture.md` — services, ports, data flows, the swappable seams.
  - `docs/architecture/Platform.md` / `Identity.md` / `Blueprint.md` — target architecture, identity, product.
  - `docs/reference/Compliance.md` — the living legal/compliance question list.
  - `docs/reference/Roadmap.md` / `Readiness.md` — phased plan + production-readiness matrix.
  - `docs/guides/Walkthrough.md` / `Testing.md`, `docs/runbooks/Recovery.md` — run/test/recover.
- **`docs/text.txt`** — the original project brief that seeded this setup.

When you learn something durable about *how the system works or why a choice was
made*, write it into `docs/architecture/` (or the relevant `docs/` subfolder) or the
decision log — not into a throwaway comment.

---

## 10. Suggested future roadmap (summary)

Detail and acceptance criteria in `docs/reference/Roadmap.md`.

- **Phase 0 — Foundation (now):** one anchor on testnet; SEP-24 deposit mints
  tokens; withdrawal detected; KYC + fiat mocked. mostly done.
- **Phase 1 — Real rails behind adapters:** implement `KycProvider` (HyperVerge),
  `DepositProvider` (UPI collection), `PayoutProvider` (Cashfree/RazorpayX) as
  swappable adapters, still testnet/sandbox. Real webhook verification.
- **Phase 2 — Operator productization:** converge the functional dashboard with
  the "Keel" console; treasury, fees/spread config, transaction ops, compliance
  views — driven by live data.
- **Phase 3 — Multi-anchor:** promote `control-plane` from seed to real
  tenanting; scope assets/keys/transactions per anchor; subdomain launch;
  shared-KYC (pending legal §5).
- **Phase 4 — Go-live hardening:** mainnet, custody/banking model chosen with
  counsel, k8s/infra, monitoring, incident runbooks.

Do not skip ahead. Each phase assumes the seams from earlier phases exist.

---

## 11. Instructions for future agents (do not skip)

- **Re-read §1 "What NordStern is NOT" before proposing features.** If your idea
  fits an exchange, a wallet, or a token sale, stop.
- **Respect the mock-first seams.** When asked to "add KYC" or "add payouts",
  implement/extend the *adapter interface* with a working mock default; put the
  real vendor behind it. Do not scatter vendor SDK calls through core flows.
- **Never present legal/compliance conclusions as settled.** Document the question
  in `COMPLIANCE_OPEN_QUESTIONS.md` and flag it for expert review (§5).
- **Keep testnet/sandbox the default; gate anything that moves real money** (§7).
- **Don't overbuild.** The MVP is *one* anchor done well. Prefer finishing a real
  end-to-end flow over scaffolding the whole SaaS.
- **Keep the two frontends and the two AP copies straight** (§8). Ask which
  surface a task targets if it's ambiguous.
- **Match existing stacks and conventions**; log significant decisions in
  `anchor-service/docs/decision-log.md`.
- When something here is out of date with the code, **fix the code or fix this
  file** — don't silently work around the contradiction.
