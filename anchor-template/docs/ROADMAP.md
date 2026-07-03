# Roadmap

> **Context:** This document tracks the strategic phases of the `anchor-template` project, mapping out what is done, what is being worked on, and where the project is heading.

---

## 🟢 Completed (Phase A - C)

**Phase A: Skeleton & Authentication**
- [x] Integrate official `stellar/anchor-platform` Docker image.
- [x] Establish SEP-1 (stellar.toml) discovery.
- [x] Establish SEP-10 authentication handshakes.

**Phase B: USDC On-Ramp (Deposits)**
- [x] Treasury float funded on Testnet via DEX path payments.
- [x] `business-server` configured to host SEP-24 Interactive UI.
- [x] End-to-end INR → USDC deposit flow verified.
- [x] Basic mock adapter implemented for fiat collection.
- [x] Zero-amount guardrails implemented for wallet compatibility.

**Phase C: USDC Off-Ramp (Withdrawals)**
- [x] Anchor Platform Observer successfully monitoring the ledger.
- [x] User USDC → Treasury transfers correctly detected.
- [x] Business server poller triggers mock payout provider.

---

## 🟡 In Progress (Phase D)

**Phase D: Operator Productization & Real Rails**
- [x] `client` Next.js frontend built and reading live `/admin` data.
- [x] Live FX rates via `LiveRateProvider` integrated for SEP-38.
- [x] KYC Adapter Seam established (`MockKycProvider` and `SurepassKycProvider` built).
- [x] Cashfree Payouts (`PayoutProvider`) implemented for real INR disbursal.
- [x] Secure Webhook signature verification for Cashfree callbacks.
- [ ] Migrate `client` authentication (NextAuth/JWT).
- [ ] Integrate real UPI Intent / Collection API into the `DepositProvider`.

---

## 🔵 Next (Phase E & F)

**Phase E: The "Keel" Convergence**
- [ ] Fully converge the `client` dashboard with the advanced "Keel" visual prototypes.
- [ ] Implement Treasury management UI (to manually rebalance the Fiat/Crypto pools).
- [ ] Implement compliance/case management views for KYC reviews.
- [ ] Provide real `/transaction` (more_info_url) deep links for users.

**Phase F: Go-Live Hardening (Mainnet)**
- [ ] Finalize legal custody and banking models.
- [ ] Move secrets to AWS Secrets Manager / Vault.
- [ ] Implement a true Idempotency Ledger (Transfer-After-Commit) to eliminate double-spend risk during server crashes.
- [ ] Switch to Mainnet configs and real Circle USDC issuer.
- [ ] Establish Kubernetes/ECS infrastructure for scale.

---

## 🟣 Future (Control Plane & SaaS)

- **Multi-Tenancy:** Promote the architecture from a single anchor to a SaaS platform managing dozens of anchors.
- **Tenant Provisioning:** Automate the generation of `stellar.toml`, keypairs, and database schemas per tenant.
- **Shared KYC Network:** "Verify once, use across all NordStern anchors" (pending regulatory approval).
