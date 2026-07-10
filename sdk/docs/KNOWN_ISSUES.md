# Known Issues & Technical Debt

> **Context:** This document tracks bugs, architectural limitations, and temporary hacks that must be addressed before this anchor can be considered production-ready.

---

## 🏗️ Technical Debt

- **✅ RESOLVED — Transaction Idempotency (double-spend on crash):** The deposit release
  now runs through a durable Transfer-After-Commit **outbox** (`nordstern.deposit_releases`,
  `releases.ts`): intent is committed to Postgres *before* the Stellar submit, the payment
  carries a deterministic memo so a landed transfer is found on-chain and adopted (never
  re-sent), and a startup + interval reconciler self-heals anything left mid-flight by a
  crash. Atomic single-winner claim proven against Postgres 15. See **DEC-007**.
  - *Verified live:* on-chain memo attach + reconciliation lookup on **real testnet**
    (`scripts/test-idempotency.mjs`) and full **crash-after-send recovery** on testnet + Postgres
    with an AP stub (`scripts/test-reconcile.mjs`). *Remaining (lower risk):* drive it through the
    real AP container with a literal mid-release process kill before mainnet.

- **Mock Providers:** KYC no longer defaults to mock — it defaults to **real DIDIT and fails closed** (DEC-008); mock auto-approve is a gated dev-only opt-in (`ALLOW_MOCK_KYC=true`, forbidden on mainnet). The `DepositProvider` still defaults to `mock` (the `razorpay` provider *does* verify real collection; `mock`/`upi` do not), and `PayoutProvider` defaults to `mock`. 

## 🚧 Limitations

- **Single Tenant Only:** The `anchor-template` is currently hardcoded for a single anchor operator. The `stellar.toml` is static, the database is unified, and the secrets are global. Moving to the SaaS Control Plane requires rewriting these to be tenant-aware.
- **No Client Authentication (intentional for the template):** The Next.js dashboard (`client/`) on port `3001` has no login — opening it *is* the anchor's console. This is a deliberate decision for the single-anchor **template**: access control belongs to the per-business replication/deployment layer (network isolation, private ingress, or the platform control plane that stamps out anchors), not baked into every copy. Before any anchor is exposed on a public network, its deployment must front the console with access control (private network / VPN / SSO at the ingress). Do **not** treat the open console as production-ready public exposure.
