# Architectural Decision Records (ADRs)

> **Context:** This document captures the "Why did we build it this way?" for every major architectural decision. It absorbs and expands upon the historical `decision-log.md`.

---

## DEC-001: We are cloning the official Anchor Platform, not building from scratch.
**Decision:** We run the official `stellar/anchor-platform:latest` Docker image instead of writing our own SEP-compliant servers.
**Why we made it:** The Stellar Ecosystem Proposals (SEPs) are complex, strict, and subject to constant updates. Building a custom engine introduces massive liability and technical debt.
**Alternatives considered:** Writing a custom Kotlin or Node.js SEP server.
**Why alternatives were rejected:** The maintenance burden is too high; the SDF already spends millions maintaining the official AP.
**Future implications:** We must conform strictly to the AP's callback contract (`/customer`, `/rate`). If the AP lacks a feature, we must work around it or contribute upstream.

## DEC-002: Real Circle USDC (Treasury Float), No Minting
**Decision:** The anchor does not issue its own proprietary token (like the old `ANCH` test token). It holds a float of real Circle USDC in a treasury account and transfers it.
**Why we made it:** End users want highly liquid, universally accepted stablecoins (USDC), not a bespoke, illiquid anchor token. This simplifies trust for the end user.
**Alternatives considered:** Becoming an active issuer of a localized INR token.
**Why alternatives were rejected:** Requires immense regulatory overhead and bootstrapping liquidity on decentralized exchanges.
**Future implications:** Treasury management and FX pricing (USD ↔ INR via SEP-38) become first-class, mission-critical features of the platform.

## DEC-003: The "Seam" Adapter Architecture
**Decision:** All external dependencies (KYC, Banking, Payouts, FX) must sit behind generic interfaces (`KycProvider`, `PayoutProvider`, etc.) in the `business-server`.
**Why we made it:** The legal and compliance landscape in India is unsettled. We do not know definitively which banking partner or KYC vendor will be optimal, or if different tenants will require different vendors.
**Alternatives considered:** Hardcoding Razorpay and HyperVerge directly into the SEP-24 route logic.
**Why alternatives were rejected:** Refactoring tightly coupled vendor SDKs during a forced migration (e.g., a banking partner drops crypto support) would be disastrous.
**Future implications:** Adding a new integration just requires writing a new class that implements the interface.

## DEC-004: Next.js Client on Live Data (No Mocking)
**Decision:** The operator console (`client/`) fetches real, live data from the `business-server` `/admin` API via a proxy, rather than relying on synthetic mock data.
**Why we made it:** We need to prove the system works operationally, not just visually. A dashboard is useless if it cannot accurately reflect the state of the underlying Anchor Platform database.
**Alternatives considered:** Keeping the high-fidelity Next.js app completely separate as a design prototype and using a basic HTML/React UI for the actual anchor.
**Why alternatives were rejected:** Leads to duplicate work and an unacceptable operator experience. The visual excellence of NordStern is a core value proposition.
**Future implications:** The `client/` app must be shipped alongside the backend in production, likely served via a separate secure domain (e.g., `console.domain.com`).

## DEC-005: Money-Safety & Idempotency Guardrails
**Decision:** The `business-server` actively prevents automatic retries for transactions in `pending_anchor` or `error` states, forcing manual reconciliation.
**Why we made it:** The deposit flow releases USDC to the Stellar network *before* the final database PATCH to `completed`. If that database call fails, the USDC is gone but the system doesn't know it. Blindly retrying the transaction would result in a double-spend.
**Alternatives considered:** Relying on the client to not double-click, or building a massive Kafka-based event sourcing ledger.
**Why alternatives were rejected:** Client-side prevention is unsafe. Kafka is overkill for the MVP.
**Future implications:** ~~We will eventually need to build a robust Transfer-After-Commit or outbox-pattern idempotency ledger in Phase F.~~ **Done — see DEC-007.** This coarse guard is now retained only as a defense-in-depth backstop beneath the outbox.

## DEC-006: ngrok (Reserved Static Domain) as the Dev Public-Ingress Tunnel
**Decision:** Run ngrok as a first-class Docker Compose service that publishes the
business-server on a **reserved static** `*.ngrok-free.dev` domain (set once in
`PUBLIC_BASE_URL`), rather than a hand-started `ngrok` process with an ephemeral URL.
**Why we made it:** Real DIDIT KYC reports its decision **server-to-server via a webhook** —
the source of truth for the KYC gate — and the hosted flow is finished on the user's phone.
`localhost` cannot receive that webhook, so a public HTTPS URL is mandatory in local dev. A
random ngrok URL changes every restart, forcing re-registration of the DIDIT webhook and
`PUBLIC_BASE_URL` each boot (a documented, repeated failure). A reserved domain + a Compose
service makes the URL stable and brings the tunnel up with the rest of the stack.
**Alternatives considered:** Manual `ngrok` per session; Cloudflare Tunnel; deploying the
business-server to a public host for testing.
**Why alternatives were rejected:** Manual/ephemeral tunnels caused the recurring "webhook
not delivered" breakage. A cloud deploy is heavier than needed for local iteration. Cloudflare
Tunnel is a viable equal — ngrok was already in use with a reserved domain.
**Future implications:** This is a **development** ingress only. Production replaces it with a
real domain + TLS (ingress/load balancer). The webhook remains the source of truth; the
browser redirect stays cosmetic (see ARCHITECTURE §5). `NGROK_AUTHTOKEN` is a secret in `.env`;
a reserved domain permits one agent at a time.

## DEC-007: Transfer-After-Commit Outbox for Deposit Releases (realizes DEC-005)
**Decision:** The deposit USDC release runs through a durable local outbox
(`nordstern.deposit_releases`, in `releases.ts`). Intent is committed to Postgres **before**
the Stellar submit; the payment carries a deterministic memo; the send first scans the chain
for an already-landed transfer and **adopts** it instead of re-sending; and a startup +
interval **reconciler** resolves any release left mid-flight by a crash, completing the Anchor
Platform transaction idempotently.
**Why we made it:** DEC-005's guard prevented *automatic* double-sends but dead-ended
partially-completed transfers into manual reconciliation — and because the outcome (that USDC
left, and its hash) was recorded only in the external AP DB *after* the submit, a crash in that
window left funds sent with **no local record and no way to know from the chain** (the payment
carried no memo). The outbox makes the money-move durable, idempotent, and self-healing.
**How it works (invariants):**
- The atomic claim (`INSERT … ON CONFLICT … DO UPDATE … WHERE status='failed'`) is a
  **single-winner lock**: the webview-return and webhook paths can never both send. Uniform
  across every deposit provider (subsumes the Razorpay-only atomic claim for crash-safety).
- The deterministic memo (`generateMemo(txId)`) turns *"did the money leave?"* into a chain
  query (`findTreasuryPayment`), so a retry adopts the prior transfer rather than duplicating it.
- The reconciler waits **longer than a ledger close** (STALE window) before acting, so any
  transfer that truly reached the network is already visible on-chain — re-drive can only
  resubmit transfers that **never** landed. Bounded by `MAX_ATTEMPTS` before manual review.
**Alternatives considered:** Kafka/event-sourcing ledger (overkill, per DEC-005); pre-signed
fixed-sequence transactions for network-level dedupe (fragile across restarts); leaving the
coarse guard as the only protection (dead-ends funds, no recovery).
**Verified (live):** `tsc` clean.
- Outbox state machine — single-winner claim, reclaim/attempt counting, reconcile predicate,
  completed-row exclusion — validated against **Postgres 15**.
- On-chain linchpin — `sendUsdc` memo attach + `findTreasuryPayment` locate/adopt, plus
  wrong-memo and wrong-amount negatives — verified against **real testnet**
  (`scripts/test-idempotency.mjs`).
- Full **crash-after-send recovery** — seed a real on-chain transfer + a `submitting` row with
  no hash, run the reconciler → it adopts the hash, completes the Platform tx, **no double-send**
  — verified against **real testnet + Postgres** with an in-process AP stub
  (`scripts/test-reconcile.mjs`).
- Remaining (lower risk): drive it through the actual **AP container** end-to-end with a literal
  mid-release process kill — the AP interaction is a simple GET/PATCH, already proven against the stub.
**Future implications:** The coarse DEC-005 guard is retained as defense-in-depth (notably for
pre-outbox transactions at upgrade time). Mainnet go-live still requires the remaining Phase F items
(secrets manager, etc.). A high-volume treasury should page `findTreasuryPayment` with a stored
cursor rather than scanning the recent window.

## DEC-008: KYC is Real by Default and Fails Closed
**Decision:** `KYC_PROVIDER` defaults to `didit` (real). The adapter factory (`adapters/index.ts`)
**refuses to start** when a real provider is misconfigured (missing `DIDIT_API_KEY` /
`SUREPASS_TOKEN`), and `MockKycProvider` — which auto-approves every user — runs **only** behind an
explicit `ALLOW_MOCK_KYC=true` acknowledgement and is **forbidden outright on mainnet**.
**Why we made it:** Mock was previously the default, so a fresh or misconfigured deployment
silently approved everyone — the most dangerous possible default for a money/compliance system.
Failing closed (refuse to boot) is strictly safer than failing open (approve all).
**Alternatives considered:** Deleting the mock entirely; keeping mock as the default with a warning.
**Why alternatives were rejected:** Deleting mock breaks the local/testnet dev loop (DIDIT needs
funded credits). A warning on a still-active mock default is too easy to miss. The gated,
mainnet-forbidden escape hatch preserves dev velocity while making mock impossible to hit by accident.
**Verified:** runtime matrix — unset/empty ⇒ didit ⇒ boot refused without key; mock without ack ⇒
refused; mock+ack on testnet ⇒ loads with a loud warning; mock+ack on mainnet ⇒ refused; didit+key ⇒
loads. `tsc` clean.
**Future implications:** The SEP-24 interactive gate already calls DIDIT directly and fails closed
(no verification row ⇒ `NEEDS_INFO`). This aligns the SEP-12 `/customer` callback (the AP's
protocol-level view) with that same real-only posture. The SEP-24 gate is still hardcoded to DIDIT
rather than routing through the `KYC_PROVIDER` factory — a consistency item if a non-DIDIT real
provider is ever used for the interactive flow. The operator manual-review / case-management UI
remains a Phase E item.

## DEC-009: Withdrawal Payout is At-Most-Once (off-ramp mirror of DEC-007)
**Decision:** The withdrawal poller guards every fiat payout with a durable claim in
`nordstern.withdrawal_payouts` (`processing → completed | failed`) and filters transaction status
**client-side** rather than trusting the Anchor Platform's `status` query filter.
**Why we made it:** Two defects compounded into a real off-ramp double-spend risk. (1) The AP
v4.4.0 `GET /transactions?status=…` filter is **silently ignored** — it returns every status
(verified against the running container: a `status=pending_anchor` query returned `completed`,
`error`, `incomplete` rows). (2) The poller had **no local idempotency guard** — it re-disbursed
any withdrawal the query returned, every 10s. With a real payout PSP (Cashfree) that is repeated
real money leaving the treasury — the off-ramp mirror of the deposit double-spend (DEC-005/007).
**Fix:** (a) client-side `status === 'pending_anchor'` filter — never trust an external filter for
a money decision; (b) an **atomic single-winner claim** before any payout, so a re-listed or
crash-replayed withdrawal disburses **at most once**; the payout is recorded `completed` *before*
the AP patch, and a re-listed already-paid withdrawal takes a **self-heal** path that re-patches the
AP without re-paying.
**Verified (live):** `tsc` clean; the re-processing spam stopped immediately after the fix; the
at-most-once claim semantics (fresh→claim, processing→skip, completed→self-heal, failed→reclaim)
verified against the live Postgres.
**Future implications:** A reconciler (like the deposit one) could auto-heal a payout left
processing by a crash mid-disburse; today those are left for manual review (safe — never
re-paid). **The unreliable AP status filter affects any future `listTransactions` caller — always
filter status client-side.**

## DEC-010: Cell-Isolated Helm Stack with Default-Deny Network Policies
**Decision:** We finalized the production Helm chart (`anchor-stack`) with standard Kubernetes components (Deployments, Services, Ingress, PodDisruptionBudgets, and HPA), introduced a dedicated `ServiceAccount` for IRSA configuration on the `business-server`, and enforced a strict default-deny `NetworkPolicy` template across the namespace.
**Why we made it:** As the single anchor template is promoted to production, logical and security boundaries must be absolute. The default-deny policies ensure that pods (AP, business-server, and client) cannot communicate with each other or the internet except through explicit allowed channels (e.g. AP to database, business-server to AP, ingress to pods, and internet egress for blockchain Horizon/PSP/KYC APIs). The `ServiceAccount` isolates the business-server's cluster identities from the default namespace identity.
**Future implications:** Any new pod or helper worker deployed into the anchor namespace must have a corresponding `NetworkPolicy` allow rule written, or it will fail to connect.

## DEC-011: GitOps App-of-Apps & OIDC-Backed External Secrets
**Decision:** We established a centralized GitOps workflow using the ArgoCD App-of-Apps pattern, driven by a parent `cell-bootstrap` Application pointing to a `bootstrap-stack` Helm chart. Additionally, we wired the External Secrets Operator (ESO) to a dedicated IAM role backed by the EKS OIDC provider trust relationship, mapping AWS Secrets Manager directly into the EKS namespace.
**Why we made it:** Managing individual cell operators manually does not scale. The App-of-Apps Helm chart allows us to parameterize and deploy all cluster addons (ALB controller, cert-manager, external-secrets, external-dns, Karpenter, and Prometheus) in the correct order using Sync Waves (addons first, configs second, applications last). Using OIDC-backed IAM roles for Service Accounts (IRSA) for ESO ensures that our applications read secrets from AWS Secrets Manager dynamically without ever persisting AWS credentials inside the Git repository or Helm charts.
**Future implications:** Adding a new cluster addon or provisioning a new anchor requires modifying the `bootstrap-stack` configuration rather than writing imperative Kubernetes commands.

## DEC-012: Multi-Tenant SaaS Orchestration & Aggregator Design
**Decision:** We adopted a modular, decoupled SaaS Control Plane architecture incorporating schema-based database isolation, a stateful Temporal/Step Functions provisioning saga, strict separation of business logs and Git state, Kubernetes Gateway API routing, and a dedicated API Aggregator Service.
**Why we made it:** As detailed in [SAAS_ORCHESTRATION_DESIGN.md](file:///Users/manobendramandal/Desktop/code/nordstern/docs/project/SAAS_ORCHESTRATION_DESIGN.md), this design resolves critical scaling limits expected when running 100+ tenant anchors:
1. *Schema-based Postgres isolation* avoids connection pool exhaustion and database resource sprawl.
2. *Stateful workflow sagas* prevent partial failures from rendering resources orphaned or un-resumable.
3. *Strict separation of Git and business DB* keeps user PII and KYC logs out of Git history.
4. *Gateway API* provides cleaner role boundaries than standard Ingress controllers.
5. *Aggregator layer* ensures transaction routing is telemetry-driven and decoupled from mobile app wallets.
**Future implications:** This design governs the Phase-2 and Phase-3 implementations. Local development templates must follow these boundaries.

## DEC-013: Strategic Roadmap Prioritization (Operator & Aggregator Platforms First)
**Decision:** We pivoted the roadmap sequencing to prioritize building a robust, secure, and authenticated Operator Platform (Phase 2) and Aggregator Service (Phase 3) ahead of integrating live production banking and payment rails (Phase 4).
**Why we made it:** Retrofitting security structures (RBAC, NextAuth/JWT, session encryption, and audit logs) and policy engines (Strategy Engine limits/fees config) onto an un-hardened and un-monitored runtime introduces severe vulnerability and technical debt. By building the Operator Platform and Aggregator engine first:
1. We establish a complete, secure administration plane for audits and manual compliance approvals before real money is routed.
2. We create a fully testable, demo-ready SaaS architecture using testnet USDC and mock/sandbox payment adapters.
3. We isolate high-risk payment integrations (Razorpay/Cashfree) until the operational management shell around them is solid.
**Future implications:** Active development shifts to Phase E (Operator Platform), focusing on authentication, the Strategy Engine, and UI convergence, followed by Phase F (Aggregator) and Phase G (Production Banking).

## DEC-014: Decoupled API Aggregator Platform Service
**Decision:** We implemented the standalone Aggregator Service (`aggregator-service`) in the stack containing its own isolated PostgreSQL schema (`aggregator`), scoring Routing Engine, and background poller.
**Why we made it:** The aggregator acts as the single point of entry for SDK clients and partner integrations. By isolating the aggregator's database schemas (anchors registry, capability tables, quote caches, and routing scoring decisions) from any individual anchor runtime database, we ensure that:
1. No single anchor's failure blocks routing discovery for other anchors.
2. Clients never communicate directly with anchors, maintaining full structural flexibility for cell provisioning.
3. All routing decisions are explainable and logged for compliance auditing.
**Future implications:** Client applications interface with the central Aggregator on port `3005` to create quotes and start transactions, which then seamlessly proxies requests and redirects to the chosen anchor cell.
