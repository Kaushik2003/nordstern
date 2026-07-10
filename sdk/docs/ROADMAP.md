# Strategic Roadmap — NordStern Anchor Platform

This roadmap tracks the development phases of the `anchor-template` project, mapping out what is done, what is in progress, and the next milestones. Per executive alignment, we have prioritized building the **Operator Platform** and the **Aggregator Platform** to establish a mature, secure runtime *before* integrating real-money production banking rails.

---

## 🟢 Completed (Phase A - C)

### Phase A: Skeleton & Authentication
- [x] Integrate official `stellar/anchor-platform` Docker image (AP v4.4.0).
- [x] Establish SEP-1 (`stellar.toml`) discovery.
- [x] Establish SEP-10 authentication handshakes.

### Phase B: USDC On-Ramp (Deposits)
- [x] Treasury float funded on Testnet.
- [x] Configure `business-server` to host the SEP-24 Interactive UI.
- [x] End-to-end INR → USDC deposit flow verified.
- [x] Basic mock adapter implemented for fiat collection.
- [x] Zero-amount guardrails implemented for wallet compatibility.

### Phase C: USDC Off-Ramp (Withdrawals)
- [x] Anchor Platform Observer successfully monitoring the ledger.
- [x] User USDC → Treasury transfers correctly detected via memo.
- [x] Business server poller triggers mock payout provider.

---

## 🟡 In Progress (Phase D)

### Phase D: Core Anchor Service & Integration Seams
- [x] `client` Next.js frontend built and reading live `/admin` data.
- [x] Live FX rates via `LiveRateProvider` integrated for SEP-38.
- [x] KYC Adapter Seam established (`MockKycProvider` and `SurepassKycProvider` built).
- [x] Cashfree Payouts (`PayoutProvider`) implemented for real INR disbursal (sandbox).
- [x] Secure Webhook signature verification for Cashfree callbacks.
- [x] Establish fail-closed KYC (DEC-008) and deposit idempotency outbox (DEC-007).
- [x] Resolve withdrawal payout at-most-once safety logic (DEC-009).

---

## 🔵 Next (Phase E - G)

### Phase E: Operator Platform (Highest Priority)
*Goal: Turn the admin console into a complete, secure administration plane for anchor operators.*
- [ ] **Keel UI Convergence**: Fully migrate the high-fidelity console visuals, bento layouts, and styling from the landing/web prototypes into the active client.
- [x] **Operator Authentication & Access Control**: Protect management console screens with secure NextAuth credentials and JWT role scopes.
- [x] **Strategy Config & Policy Engine**: Enable dynamic business rule configuration (min/max bounds, flat fees, percentage rates, emergency pauses).
- [x] **Queues & Case Management**: KYC manual review queues.
- [x] **Treasury & Liquidity Management**: Dashboard tracking reserve float (crypto vs. bank reserves) with low-balance alerts.
- [x] **Developer Surface**: Dynamic API Key generation, webhook configuration, and endpoint health monitors.
- [x] **Analytics**: Operational dashboards plotting transaction success rates, average fill latency, and FX revenue.

### Phase F: Aggregator Platform (Discovery & Routing)
*Goal: Build the core NordStern middleware that connects client wallets to the best-performing anchors.*
- [x] **Anchor Registry**: Capabilities catalog mapping region, asset, and payment rail per anchor.
- [x] **Telemetry-Driven Routing Engine**: Rank anchors using real-time telemetry (actual success rates, speed, fee curves, and FX spreads).
- [x] **Quote Service**: Generate expiring transaction quotes across eligible anchors.
- [x] **Health Service**: Active background synthetic checks on child anchor instances.
- [ ] **Risk Engine**: Shared intelligence screening for transaction velocity spikes and anomalies.

### Phase G: Production Banking & Real Rails
*Goal: Wire live financial rails underneath the proven, secure platform.*
- [ ] **Razorpay UPI Collection**: Integrate real UPI Intent and QR collection APIs.
- [ ] **Cashfree Payouts Production**: Transition to live Cashfree Payout accounts with full webhook-driven status tracking.
- [ ] **Reconciliation & Settlement**: Build automated reconciliation routines to match bank statement reports with ledger transaction states.
- [ ] **Treasury Alarms**: Connect PagerDuty/alerts to float status.
