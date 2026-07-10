# Antigravity task — Build the self-hostable NordStern Anchor Kit (in `sdk/`)

You are a senior platform engineer. Turn this `sdk/` directory into a **self-hostable anchor
kit** ("anchor-in-a-box"): a distributable a developer deploys on THEIR OWN infrastructure,
brings their own keys/rails, configures via ONE config file, and launches with ONE command —
with **zero dependency on NordStern's central platform** and **no dependency on the rest of
the monorepo**.

`sdk/` was seeded with a source-only copy of `anchor-template/` (the single-anchor stack).
`anchor-template/` itself stays as the *hosted* version — **do not touch it**; do all work
inside `sdk/`.

This is a **research-then-build** task, executed in **numbered phases**. Each phase has an
**acceptance test you must run and pass before moving on**. Do not skip ahead. Do not write
code you cannot verify runs.

> ⚠️ Previous doc work on this repo was low quality. This time: **read the actual code
> first, verify every claim against it, and TEST each phase end-to-end.** Quality bar =
> "a developer who has never seen this repo launches a working testnet anchor from the
> `sdk/README.md` in under 30 minutes, on their own machine, with no NordStern platform."

---

## 0. Non-negotiable rules

1. **Work only in `sdk/`.** Do not modify `anchor-template/`, `platform/`, `anchor-service/`,
   or anything else in the monorepo. The kit must end up self-contained in `sdk/`.
2. **Read before writing.** Audit `sdk/` fully. Base every change on real code.
3. **No secrets in the repo, ever.** All keys/creds come from a git-ignored `sdk/.env` the user
   fills from `sdk/.env.example`. Never commit real values. If you find a committed secret,
   list it in `sdk/FINDINGS.md` and do not reproduce it.
4. **Testnet is the default. Mainnet is a deliberate, gated config flip** (Phase 6). Never make
   real-money rails the default path.
5. **Standalone is additive, selected by config.** Add an `AUTH_MODE=local|platform` flag; when
   `local`, the anchor needs no central platform. Preserve the existing conditional seams.
6. **Verify each phase with its acceptance test before continuing.** Fix failures before moving on.
7. **Keep it a SINGLE anchor.** Drop/optionalize cross-anchor concepts (multi-anchor aggregator
   registry, central KYC propagation). The anchor must fully function without them.

---

## 1. Context — what NordStern is (frame it right)

NordStern lets a business run a **Stellar anchor**: a fiat (INR) ⇄ Stellar on/off-ramp — takes
fiat deposits, delivers a 1:1 asset on Stellar, redeems it back to fiat. Read `AGENTS.md` and
`README.md` at the repo root FIRST for product intent and the "what NordStern is NOT" framing
(not an exchange, not a wallet, not a launchpad; non-custodial — users bring their own Stellar
wallet). The anchor uses the **Anchor Platform** Docker image (`stellar/anchor-platform:latest`)
for the SEP protocol server + Observer; the business-server answers its callbacks. Never
reimplement SEP-1/10/12/24 — the AP does that.

**Compliance (do NOT resolve in code):** whoever runs a live anchor is likely a regulated
entity (VDASP/FIU-IND, KYC/AML). Make mainnet a deliberate, clearly-gated step and surface a
go-live checklist. Flag legal questions; never give legal advice.

---

## 2. Inventory `sdk/` FIRST — and resolve the legacy/current confusion

`sdk/` contains BOTH current and legacy components. Your FIRST job (Phase 0) is to establish
ground truth by reading the code — do not assume from names. Known facts to verify:

| Dir | What it is | Keep? |
|---|---|---|
| `business-server/` | The money engine (SEP-24, outbox, poller, adapters, /admin, customer API). **Core.** | ✅ keep |
| `anchor-client/` (`stellar-anchor-client`) | The **current native customer app** (Buy/Sell/KYC/history). | ✅ keep |
| `console/` | The **current operator console** (14 modules: overview/transactions/treasury/customers/compliance/pricing/api-keys/webhooks/reports/team/settings/activity/audit). | ✅ keep |
| `client/` (`anchor-template-dashboard`) | **LEGACY** old operator dashboard. The seed's `docker-compose.yml` still references `client` (stale) — the current stack uses `console` + `anchor-client`. | ❌ likely remove — verify, then delete |
| `aggregator-service/` | Multi-anchor registry/quote/routing/health. **Not needed for a single self-hosted anchor.** | ⚠️ make optional / remove from kit |
| `config/` | AP config (`stellar.toml`, `assets.yaml`, `anchor-platform.yaml`). | ✅ keep (generate from the config layer) |
| `scripts/` | `setup-testnet.mjs` (keys/Friendbot/.env), test scripts. | ✅ keep/extend |
| `infra/` | `terraform/ helm/ argocd/ docker/` — authored, NOT fully wired. | ✅ wire the Terraform VM path (Phase 5) |
| `docker-compose.yml` | **STALE** — references the legacy `client`, not `console`/`anchor-client`. | 🔧 rewrite for the current single-anchor stack |
| `docs/` | DECISIONS, KNOWN_ISSUES, GO_LIVE_GATING. | ✅ reuse |

**Phase 0 acceptance:** a short `sdk/FINDINGS.md` section listing, verified against code, which
components are current vs legacy, and what the kit's stack will be. Rewrite `sdk/docker-compose.yml`
to launch the CURRENT stack (AP + business-server + console + anchor-client, + Postgres),
dropping the legacy `client` and the multi-anchor aggregator. This compose must come up before
Phase 1.

---

## 3. The core problem: DECOUPLE from NordStern's central platform

The anchor currently **borrows NordStern's `platform-api` for identity**. A self-hosted anchor
has none, so replace with **local, standalone auth**. Exact coupling (verify each in code —
paths relative to `sdk/`):

| Concern | File(s) | Today | Standalone fix |
|---|---|---|---|
| **Operator login + authz** | `business-server/src/adminAuth.ts`, `console/lib/api.ts`, `console/app/login/page.tsx` | Console proxies OTP to platform-api `/auth/otp/*`; `requireOperator` verifies a `PLATFORM_JWT_ACCESS_SECRET` cookie AND calls `${NORDSTERN_API_URL}/api/v1/anchors/resolve` to authorize | Local operator OTP + a local `operators` table; `requireOperator` authorizes for this single anchor (membership is trivial) |
| **Customer identity** | `business-server/src/customerSession.ts`, `src/customerApi.ts`, `anchor-client/lib/customer.ts` | `ns_customer` session minted by platform-api customer OTP; wallet list via `SERVICE_SECRET` | Local customer OTP + local `customers`/`customer_wallets` tables in the anchor's own DB |
| **KYC propagation** | `business-server/src/kycPropagate.ts` | Pushes DIDIT decisions to the central platform ("verify once across anchors") | No-op in standalone: single anchor stores KYC locally (`nordstern.kyc_verifications`) only |

The code ALREADY has conditional seams (`if (!NORDSTERN_API_URL) …`, `if (!PLATFORM_JWT_ACCESS_SECRET) return null`).
Add `AUTH_MODE=local` (default for the kit) that selects local auth; reuse the EXISTING
session/cookie/JWT/OTP plumbing — you are adding a local issuer/verifier, not a new session
system. You need a local **mailer** for OTP (Resend or log-to-console in dev) — mirror the
platform-api mailer pattern; check if one already exists in the template first.

Both consoles call `/api/v1/auth/otp/*` and `/api/v1/customer/*` (proxied to platform-api).
In standalone mode, **serve those paths from the business-server** (simplest — keeps the stack
small) rather than shipping a separate auth service.

---

## 4. Phased build plan (do in order; run each acceptance test)

### Phase 0 — Inventory + current-stack compose (see §2)
Verify current vs legacy; write `sdk/FINDINGS.md`; rewrite `sdk/docker-compose.yml` for the
current single-anchor stack; remove legacy `client` + optionalize the aggregator.
**Acceptance:** `docker compose up` in `sdk/` brings up AP + business-server + console +
anchor-client + Postgres; `/.well-known/stellar.toml` serves (config may still be scattered).

### Phase 1 — Standalone identity (operator + customer local auth) ⟵ the hard part
- Add `AUTH_MODE=local|platform` to `business-server/src/config.ts` (default `local`).
- Local **operator** auth: `operators` table, OTP request/verify, issue the SAME cookie/JWT the
  console expects, local `requireOperator`. First operator seeded from `OPERATOR_EMAIL` in `.env`.
- Local **customer** auth: `customers` + `customer_wallets` in the anchor DB; OTP issuing the
  existing `ns_customer` session; `customerSession` reads the local wallet list.
- Serve the auth/customer API paths from the business-server in standalone mode.
- Make `kycPropagate` a no-op when `AUTH_MODE=local`.
- **Acceptance:** stack up with NO platform-api anywhere. Operator logs into the console via OTP
  → dashboard; customer logs into the app via OTP. Prove `NORDSTERN_API_URL` is unset and nothing
  calls it (grep running config + logs).

### Phase 2 — One config layer
- ONE annotated `sdk/.env.example` = the single source of config: `NETWORK` (testnet/mainnet),
  `HORIZON_URL`, `NETWORK_PASSPHRASE`, `ASSET_CODE`+`ASSET_ISSUER` (or "mint new"), treasury keys,
  `KYC_PROVIDER` (+DIDIT/surepass creds), `DEPOSIT_PROVIDER` (+Razorpay), `PAYOUT_PROVIDER`
  (+Cashfree), `RATE_PROVIDER`, branding (name/logo/colours), limits (min/max/daily),
  `PUBLIC_BASE_URL`, `DOMAIN`, `OPERATOR_EMAIL`, mail provider, `AUTH_MODE`.
- Consolidate scattered config (`business-server/src/config.ts`, `config/*.yaml`,
  `scripts/setup-testnet.mjs`) to read from this ONE file (generate AP `config/*.yaml` from it).
- **Acceptance:** a fresh clone with ONLY `sdk/.env` filled (no other edits) boots the whole
  stack; changing `ASSET_CODE`/branding/a provider in `.env` is reflected with no code changes.

### Phase 3 — One-command bootstrap
- Extend `scripts/setup-testnet.mjs` (or add `scripts/create-anchor.mjs`) into a single idempotent
  bootstrap: validate `.env` → generate/import keypairs → fund (testnet Friendbot) → establish the
  asset → generate AP config → run DB migrations → print next steps.
- Provide ONE launch entry: a `sdk/Makefile` (`make setup && make up`) OR `npx create-nordstern-anchor`.
  Pick one and make it flawless.
- **Acceptance:** on a clean machine (Docker + Node only), following ONLY `sdk/README.md`, a new
  user runs bootstrap + one command → live anchor serving `/.well-known/stellar.toml` with their
  asset, in under 30 minutes.

### Phase 4 — Packaging (monorepo-independent)
- The kit must work WITHOUT the rest of the monorepo. Audit `sdk/` for any import/path/dep that
  reaches outside `sdk/`; vendor or remove. (The console/anchor-client may have imported shared
  UI or referenced platform paths — fix those.)
- Write a first-class `sdk/README.md`: what it is, prerequisites, quickstart, config reference
  link, architecture diagram (Mermaid), going-to-mainnet gating, limits/support.
- Choose + implement the distribution shape (justify in README): (a) template repo to clone,
  (b) published Docker images + compose, or (c) a `create-*` CLI. Prefer the simplest meeting the
  30-min bar.
- **Acceptance:** copy `sdk/` to a location OUTSIDE the monorepo and launch a working anchor from
  it — no missing-dependency errors.

### Phase 5 — Self-host infrastructure
- Wire + document `sdk/infra/` so a dev deploys to their own cloud. A single VM via Terraform is
  enough (Helm/k8s optional/Roadmap — label honestly what's wired). Include TLS + public domain.
- **Acceptance:** `terraform validate` + `plan` clean; docs walk clone → cloud-deployed anchor
  over HTTPS. (No need to apply to real cloud — clean plan + complete docs suffice.)

### Phase 6 — Mainnet gating + docs
- One obvious, guarded mainnet switch: real KYC required (fail-closed), real PSP creds required,
  webhook signature verification on, no mock providers, explicit confirmation. Surface
  `docs/GO_LIVE_GATING` prominently.
- Write: self-hosting guide, full config reference, adapter guide (add/swap a KYC/PSP provider
  behind the existing interfaces), ops runbook (backups/DR), troubleshooting/FAQ.
- **Acceptance:** the mainnet path refuses to start with mock/missing real providers; the go-live
  checklist is complete and accurate.

---

## 5. Deliverables
1. Standalone-capable `sdk/` (`AUTH_MODE=local`) running with NO central platform, NO monorepo.
2. Current-stack `sdk/docker-compose.yml`; legacy `client` removed; aggregator optional.
3. One `sdk/.env.example` config layer; every var documented.
4. A one-command bootstrap + launch (`Makefile` or `create-*` CLI).
5. A distributable, monorepo-independent kit + a first-class `sdk/README.md`.
6. Wired + documented self-host infra (Terraform VM path at minimum).
7. Mainnet gating + full docs (self-hosting, config reference, adapters, ops, FAQ).
8. `sdk/FINDINGS.md` — current-vs-legacy verdict, anything you changed, coupling you couldn't
   cleanly break, any committed secret found, any code/doc discrepancy.

## 6. Definition of done
- A developer with only Docker + Node, following `sdk/README.md`, launches a working **testnet**
  anchor on their own machine in < 30 min — no NordStern platform, no monorepo, no code edits.
- Operator + customer log in locally (OTP); Buy and Sell work end-to-end on testnet; operator
  console shows the real transactions.
- Mainnet is a deliberate, gated flip that fails closed without real providers.
- No secrets committed. Every phase's acceptance test passes.

Work inside `sdk/`. Read + inventory first (Phase 0), then build phase by phase, testing each.
Prefer small, verified increments over big untested rewrites. Leave `anchor-template/` untouched.
