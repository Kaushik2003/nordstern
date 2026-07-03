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
**Future implications:** We will eventually need to build a robust Transfer-After-Commit or outbox-pattern idempotency ledger in Phase F.

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
