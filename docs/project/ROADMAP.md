# NordStern — Project Roadmap

Phased plan from **one working anchor** to **multi-anchor infrastructure**. This roadmap reflects the prioritization pivot to establish a secure **Operator Platform** and the central **Aggregator Engine** before integrating live production banking rails.

Legend: ✅ done · 🚧 in progress · ⬜ not started.

---

## Phase 0 — Foundation: one anchor on testnet
*Goal: A single anchor we operate, proving the SEP-24 loop, structured to generalize later.*

- ✅ Anchor Platform (SEP-1/10/12/24) running via Docker against testnet.
- ✅ business-server implements Platform callbacks (`customer`, `rate`) and SEP-24 interactive UI.
- ✅ Deposit mints `ANCH` (and testnet `USDC`) to the user's Stellar wallet end-to-end.
- ✅ Withdrawal: Observer detects the returned payment by memo.
- ✅ Functional wallet + basic operator dashboard (`anchor-template/client`).
- ✅ Fail-closed KYC gates (DEC-008) and deposit idempotency outbox (DEC-007).
- ✅ Withdrawal payout at-most-once safety logic (DEC-009).

**Exit criteria:** Deposit and withdrawal complete on testnet; safety/idempotency guards verified.

---

## Phase 1 — Cell Infrastructure & GitOps
*Goal: Containerize the anchor stack and establish reproducible cell deployments.*

- ✅ Multi-stage Dockerfiles (`infra/docker/`) for production-ready business-server and client console.
- ✅ Terraform scripts mapping VPC, EKS cluster, RDS Aurora DB, and ECR.
- ✅ Helm chart (`anchor-stack`) with default-deny NetworkPolicies and ServiceAccount templates.
- ✅ ArgoCD App-of-Apps setup to bootstrap addons (ALB, cert-manager, external-secrets, Karpenter, Prometheus).
- ✅ IAM role wiring linking EKS OIDC to AWS Secrets Manager.

**Exit criteria:** Chart validation lints pass, and cell configuration is ready to bootstrap.

---

## Phase 2 — Operator Platform (Highest Priority)
*Goal: Turn the admin console into a complete, secure administration plane for anchor operators.*

- ⬜ **Keel UI Convergence**: Migrate the premium dashboard layouts, bento screens, and styles from the `frontend/web/` prototypes.
- ⬜ **Authentication & RBAC**: Integrate NextAuth/Auth.js with JWT rotation, session management, and operator role enforcement.
- ⬜ **Strategy Engine**: Implement config-driven rule validations for fee cards, velocity limits, minimum/maximum limits, and operating hours.
- ⬜ **KYC & Case Management Queue**: Interface for compliance officers to manually review, approve, or reject KYC files.
- ⬜ **Treasury & Reserve Monitor**: Real-time tracking of reserve float (crypto vs. bank reserves) with low-balance warning alerts.
- ⬜ **Audit Logs**: Database audit logs for tracking all operator interactions.

**Exit criteria:** An operator can run day-to-day transaction approvals, review KYC, and alter fee strategies securely.

---

## Phase 3 — Aggregator Platform
*Goal: Build the core NordStern middleware that connects client wallets to the best-performing anchors.*

- ⬜ **Anchor Registry**: Capability registry mapping region, asset, and payment rail per anchor.
- ⬜ **Telemetry Routing Engine**: Dynamically ranks anchors based on real-time success rates, speed, fee curves, and FX spreads.
- ⬜ **Quote Multiplexer**: Multiplex SEP-38 FX quotes across eligible anchors.
- ⬜ **Health & Telemetry Monitor**: Background synthetics checks on child anchor instances.

**Exit criteria:** Wallets can query the Aggregator API for optimal routing coordinates and handoff tokens.

---

## Phase 4 — Production Banking & Real Rails
*Goal: Wire live financial rails underneath the proven, secure platform.*

- ⬜ **Razorpay UPI Collection**: Integrate real UPI Intent and QR collection APIs.
- ⬜ **Cashfree Payouts Production**: Transition to live Cashfree Payout accounts.
- ⬜ **Reconciliation & Settlement**: Build automated reconciliation routines to match bank statement reports with ledger transaction states.
- ⬜ **Mainnet Config Swap**: Switch EKS cells to the public global Stellar network and Circle USDC issuer.

**Exit criteria:** Real INR moves to Stellar mainnet under counsel-approved compliance structures.
