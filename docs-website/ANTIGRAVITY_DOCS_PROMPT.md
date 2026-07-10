# Antigravity task — Research & write the complete NordStern documentation site

You are a senior technical writer + software engineer. Your job is to turn
`docs-website/` (a **Fumadocs** site) into the **canonical, exhaustive, public-facing
documentation for the entire NordStern platform** — covering the smallest of small
details, grounded in what the code actually does today.

This is a **research-then-write** task. Read the whole repository first. Do not write a
single sentence you cannot back with code or an authored source doc.

---

## 0. Non-negotiable rules (read twice)

1. **Audit the ENTIRE repository before writing.** Do not assume. Base every statement on
   code that exists **today**.
2. **Never describe planned functionality as if it exists.** When something is future work,
   label it explicitly as **Roadmap** / **Planned** / **Not yet wired**. When something is a
   simulation (e.g. mock payout), say so plainly.
3. **The docs must match the CURRENT product, not old docs.** The site as it exists is ~1
   month stale (it still describes the old `anchor-service` ANCH-token world and calls fiat-in
   "simulated" with no mention of the platform split, the provisioning factory, DIDIT KYC, the
   native customer app, multi-tenant isolation, or the operator console). **Rewrite it to
   reflect reality.** Where the existing MDX conflicts with the code, the code wins.
4. **No secrets, ever.** Never put API keys, seeds, passwords, or `.env` values in the docs.
   Use placeholders (`<YOUR_KEY>`). If you find a committed secret, note it in a
   `FINDINGS.md`, do not reproduce it.
5. **No marketing fluff, no blockchain hype.** Explain like Stripe/Supabase/Modern Treasury
   docs: precise, calm, example-driven. A first-time fintech founder AND a new engineer must
   both understand it.
6. **Two audiences, clearly separated:** (a) **business/operator/founder** readers who never
   touch code, and (b) **engineers** integrating or running the stack. Structure so each can
   self-serve without wading through the other's content.
7. **Every claim is traceable.** Prefer linking to the real file path (e.g.
   `platform/api/src/api/v1/auth.routes.ts`) over hand-waving.

---

## 1. What NordStern is (so you frame it correctly)

NordStern is **B2B infrastructure that lets a business become a compliant Stellar anchor
(fiat ⇄ Stellar on/off-ramp) in India without building the SEP servers, KYC, payment rails,
treasury, and ops stack themselves.** Positioning: *"Stripe/Vercel for Stellar Anchors."*

It is **NOT**: a crypto exchange, a consumer wallet (users bring their own — Freighter/
Lobstr/Vibrant), a token launchpad, or (yet) a fully self-serve multi-tenant SaaS.

Read `AGENTS.md` (repo root) FIRST — it is the single source of truth for product intent,
scope, non-goals, and the "what NordStern is NOT" framing. Then `CLAUDE.md`.

---

## 2. Authoritative sources to read (in priority order)

**Product & architecture ground truth (these are maintained + accurate):**
- `AGENTS.md`, `CLAUDE.md` — product intent, scope, conventions.
- `README.md` (repo root) — the canonical repository README.
- `docs/project/CURRENT_STATE.md` — technical snapshot (verified against a live run).
- `docs/project/TEST_RUN_SUMMARY.md` — what actually passed in end-to-end testing (2026-07-09).
- `docs/project/OPEN_FINDINGS_TODO.md` — known gaps/bugs (so you don't document them as done).
- `docs/project/STACK_WALKTHROUGH_PLAIN_ENGLISH.md` — plain-English tour of the 8-service stack.
- `docs/project/PLATFORM_CONSOLE_SPLIT.md` — the founder-console / admin-console split.
- `docs/project/ARCHITECTURE.md`, `PLATFORM_TARGET_ARCHITECTURE.md`, `PRODUCT_BLUEPRINT.md`.
- `docs/project/COMPLIANCE_OPEN_QUESTIONS.md` — open legal questions (document as questions,
  NEVER as legal advice or settled facts).
- `docs/project/ROADMAP.md`, `PRODUCTION_READINESS.md`, `DR_RUNBOOK.md`.
- Audits: `FOUNDER_ONBOARDING_AUDIT.md`, `OPERATOR_CONSOLE_AUDIT.md`,
  `CUSTOMER_MONEY_FLOW_AUDIT.md`, `CUSTOMER_APP_AUDIT.md`.

**Code (verify everything against these — the real behaviour lives here):**
- `platform/api/` — the onboarding backend (Express + Drizzle). Read `src/api/v1/*.routes.ts`
  for the real endpoints (auth = **email OTP only**; separate admin username/password realm;
  customer OTP realm; service-secret `internal` routes).
- `platform/founder-console/`, `platform/admin-console/`, `platform/shared-ui/`,
  `platform/shared-auth/` — the two split Next.js apps + shared packages.
- `anchor-service/control-plane/` — **the real provisioner** (dockerode orchestrator, keygen,
  Friendbot, asset issuance, per-anchor DB + containers, Traefik labels). Read
  `src/provision.ts`, `src/orchestrator.ts`.
- `anchor-template/business-server/` — the per-anchor money engine (SEP-24 on/off-ramp,
  idempotency outbox, at-most-once payout, DIDIT KYC, adapters). Read `src/adapters/*`,
  `src/releases.ts`, `src/poller.ts`, `src/customerApi.ts`, `src/admin.ts`.
- `anchor-template/anchor-client/` — the native customer app (Buy/Sell/KYC/history).
- `anchor-template/console/` — the per-anchor operator console (all 14 modules).
- `anchor-template/aggregator-service/` — registry/quote/routing/health.
- `docker-compose.platform.yml` — the connected stack (services, ports, wiring).
- `deploy/` — Terraform (single-EC2 + RDS pilot) + `pg-init.sql`.
- `mobile/` — inspect and document only what exists; label unbuilt parts as Roadmap.

**Reference docs already in the repo** (Stellar/SEP semantics): `docs/SEP_GUIDE/`,
`docs/Admin_Guide/`, `docs/API_References/`, `docs/ecosystem/`.

> Rule of precedence: **running code > `docs/project/` authored docs > older audits >
> exploratory research notes.** When they conflict, follow the higher tier and note it.

---

## 3. Ground-truth facts you MUST get right (common mistakes)

- **Two anchor codebases exist:** `anchor-service/` (older ANCH factory — but it holds the
  REAL provisioner) and `anchor-template/` (the money-safe USDC single anchor). The factory
  currently launches the hardened `anchor-template/business-server` image. Explain this
  clearly — it confuses everyone.
- **Auth is OTP-only** for founders/operators AND customers (no passwords, no password reset,
  no email-verification flow). Admin is a **separate** username/password demo realm. Three
  realms, host-only cookies, never interchange.
- **Provisioning is real** (keys, Friendbot, on-chain asset, per-anchor Postgres DB + 4
  containers, Traefik host routing) — not simulated. Each anchor = its own DB + keys +
  treasury + asset → that is the multi-tenant isolation story.
- **KYC = universal DIDIT** across all anchors ("verify once, reuse everywhere"), fail-closed;
  mock is dev-only.
- **On-ramp** = DIDIT KYC → Razorpay (real, per-anchor "bring your own rails") → USDC/asset
  delivered on-chain, guarded by a transfer-after-commit **outbox** (no double-spend).
- **Off-ramp** = native "click to send" → memo detection → payout. **Payout is a simulation
  (mock UTR)** today — say so. Also note the known auto-detection gap (`OPEN_FINDINGS_TODO.md`
  #13) as a Roadmap/Known-issue, not as working.
- **Money label:** the UI sometimes hardcodes "USDC" though a per-anchor asset (e.g.
  DIDITTEST) is issued — an open inconsistency (finding #15). Don't present "USDC" as the
  universal unit unless the asset-model decision has landed.
- **Infra:** the working deploy path is `deploy/terraform` (single EC2 + RDS) + the compose
  stack; `anchor-template/infra` (EKS/Helm/ArgoCD) is **authored but not wired** → Roadmap.
- **Secrets architecture:** PSP/signing secret *values* live in AWS Secrets Manager
  (LocalStack in dev) — the DB stores only refs. Document this pattern.

---

## 4. Information architecture to produce

Organize `content/docs/` into clear sections (folders). Use a `meta.json` in each folder to
control ordering and titles (Fumadocs reads it). Suggested tree (adapt to what actually
exists; add pages liberally — "smallest of small things"):

```
content/docs/
  index.mdx                      # What NordStern is / is NOT / who it's for / how to read these docs
  getting-started/
    concepts.mdx                 # Anchor, SEP-1/10/12/24, on/off-ramp, testnet, non-custodial — plain English glossary up front
    architecture-overview.mdx    # The 3 planes; the 8 services; one big diagram + a service table
    local-setup.mdx              # Exact commands to run the whole stack locally (from CURRENT_STATE + STACK_WALKTHROUGH)
    first-anchor-walkthrough.mdx # apply → approve → redeem → provision → live, end to end
  platform/                      # The control plane (how anchors get created)
    platform-api.mdx             # Every endpoint, grouped by realm; request/response shapes; auth model
    founder-console.mdx          # register.* — the founder journey, each screen
    admin-console.mdx            # admin.* — internal review/approve/reject
    control-plane.mdx            # the provisioner: the exact provisioning lifecycle, step by step
    aggregator.mdx               # registry/quote/routing/health, SEP handoff
    multi-tenancy.mdx            # isolation model: per-anchor DB/keys/treasury/cookies + the proofs
  anchor/                        # A single running anchor (the data plane)
    business-server.mdx          # SEP-24 flows, the money outbox, at-most-once payout, adapters
    operator-console.mdx         # all 14 modules, what each shows, what's real vs empty-state
    customer-app.mdx             # Buy/Sell/KYC/history — the end-user experience
    money-flow.mdx               # on-ramp + off-ramp sequence diagrams; idempotency; why money can't be duplicated
  integrations/
    kyc-didit.mdx                # DIDIT: universal KYC, verify-once, session/poll/webhook, propagation
    fiat-rails.mdx               # Razorpay (in) / Cashfree (out); adapter interface; bring-your-own-rails
    rates-and-fees.mdx           # RateProvider, fee tiers, quote engine
    adapters.mdx                 # the swappable-seam pattern (KYC/Deposit/Payout/Rate) + how to add a vendor
    secrets.mdx                  # SecretStore: AWS Secrets Manager / LocalStack, refs vs values
  auth-and-security/
    identity-and-otp.mdx         # 3 realms, OTP flows, sessions, cookies (host-only), refresh/logout
    security-model.mdx           # realm isolation, IDOR protection, service-secret, rate limits
  operations/
    running-the-stack.mdx        # docker-compose services, ports, healthchecks, common failures
    databases.mdx                # 4 DBs, migrations, per-anchor anchordb_<slug>
    backups-and-dr.mdx           # from DR_RUNBOOK
    deployment.mdx               # the deploy/terraform single-EC2+RDS pilot (high level); K8s = Roadmap
    observability.mdx            # logging/health today; metrics = Roadmap (be honest)
  reference/
    sep-glossary.mdx             # SEP-1/10/12/24/38 in plain terms
    api-reference.mdx            # consolidated endpoint reference (all services)
    ports-and-services.mdx       # the canonical table
    compliance.mdx               # open legal QUESTIONS (never advice), from COMPLIANCE_OPEN_QUESTIONS
    roadmap.mdx                  # genuinely-unfinished work only (from ROADMAP + OPEN_FINDINGS_TODO)
    status.mdx                   # honest ✅/🟡/❌ status table per subsystem (from CURRENT_STATE/TEST_RUN_SUMMARY)
    glossary.mdx                 # every term, alphabetical
    faq.mdx
    changelog.mdx                # notable changes (from git history / the audits)
```

You may restructure, but **coverage must be exhaustive**: every service, every screen, every
endpoint, every adapter, every env var that matters, every port, every DB. "Smallest of small
things" = if a new engineer or a founder would ask it, answer it.

---

## 5. Writing standards

- **Start every page with a one-paragraph plain-English "what this is / why you care."**
- **Diagrams:** use Mermaid (Fumadocs supports it) for architecture, sequence (on/off-ramp,
  provisioning, auth), and data-flow. At least one diagram per major section.
- **Show real examples:** real `curl` calls with placeholder secrets, real request/response
  JSON shapes (from the route code), real config snippets. Never invent field names — read them.
- **Status callouts:** use Fumadocs Callout components (`<Callout type="warn">`) to flag
  Roadmap/Known-issue/Simulated items inline so a reader is never misled.
- **Cross-link generously** between pages.
- **Every "how does X work" answer cites the file** where it's implemented.
- **Tone:** confident where the code is solid; explicitly humble where it's a gap. Match the
  honesty of `TEST_RUN_SUMMARY.md`.

---

## 6. Fumadocs mechanics (how to add content)

- Content lives in `content/docs/**.mdx`. Frontmatter schema is `pageSchema` = `title` +
  `description` (both required per page). Example:
  ```mdx
  ---
  title: Platform API
  description: Onboarding backend — auth, applications, provisioning triggers.
  ---
  ```
- **Navigation/order:** add a `meta.json` per folder, e.g.
  ```json
  { "title": "Platform", "pages": ["platform-api", "founder-console", "admin-console", "control-plane", "aggregator", "multi-tenancy"] }
  ```
  Root ordering: a top-level `content/docs/meta.json` listing the section folders in order.
- The landing page is `app/(home)/page.tsx`; update its copy + links to reflect the new IA.
- Search is built in (`app/api/search/route.ts`) — no action needed, just write good headings.
- Fix the boilerplate `README.md` (currently `# .`) and set `metadataBase` (site URL) to clear
  the build warning.
- Verify with `npm run dev` (port 3000) and `npm run build` — the build must pass and every
  `meta.json`-referenced page must exist (no broken nav).

---

## 7. Deliverables

1. A fully rewritten, exhaustive `content/docs/` tree matching §4 (or better).
2. `meta.json` files wiring the navigation in a sensible order.
3. Updated home page (`app/(home)/page.tsx`) + fixed `README.md` + `metadataBase`.
4. Mermaid diagrams for: overall architecture, the 8-service stack, provisioning lifecycle,
   on-ramp sequence, off-ramp sequence, the 3 auth realms, multi-tenant isolation.
5. A `reference/status.mdx` honest status table and a `reference/roadmap.mdx` of genuinely
   unfinished work (do NOT document open findings as done — cross-check `OPEN_FINDINGS_TODO.md`).
6. A short `FINDINGS.md` (repo root of docs-website) listing any doc/code discrepancies you
   found, and any place the code contradicts an older doc.
7. `npm run build` passes with no broken links / missing pages.

## 8. Definition of done

- A brand-new engineer can set up the stack and provision an anchor using only these docs.
- A non-technical founder understands what NordStern does, what they'd get, and the flow.
- No statement describes unbuilt work as built; every simulation/gap is labelled.
- Every service, screen, endpoint, adapter, port, and database is documented.
- No secrets anywhere. Build is green.

Work in the `docs-website/` directory. Read first, plan the tree, then write. Prefer more,
smaller, well-linked pages over a few giant ones.
