# NordStern Documentation Audit Findings

During the audit of the repository codepaths and the rewrite of the documentation site, the following discrepancies, contradictions, and system behaviors were identified.

---

## 1. The Two Anchor Codebases Mismatch
* **Discrepancy:** Older project brief and design notes treated `anchor-service` as the target anchor product, calling the fiat-in step "simulated".
* **Reality:** The codebase has split:
  * `anchor-service` contains the older ANCH token codebase, but holds the **real orchestrator / provisioner engine** (`control-plane/`).
  * `anchor-template` contains the hardened **money-safe USDC anchor** featuring real Razorpay collections, outbox locks, and at-most-once payouts.
* **Contradiction:** The Control Plane provisioner (`provision.ts`) launches the `anchor-service` business-server image, meaning the advanced money-safety and Razorpay integrations of `anchor-template` are **not** present in the dynamically provisioned tenant anchors.

---

## 2. Monolithic vs. Split Platform Consoles
* **Discrepancy:** Former documentation described the platform management as a single Next.js project split by url prefix (`/admin` vs `/register`).
* **Reality:** The console was refactored on July 9, 2026 into two separate Next.js projects: `platform/founder-console` and `platform/admin-console`, designed for independent hosting on distinct subdomains (`register.nordstern.live` and `admin.nordstern.live`).

---

## 3. Webhook Fallback Propagation Gap
* **Discrepancy:** The design for universal KYC described DIDIT status updating the central customer profile via webhook.
* **Reality:** Webhook calls fail in local environments lacking public endpoints. Poller fallback implementation was updated to propagate status changes centrally during polling checks to prevent customer clients from hanging on the verification screen.

---

## 4. Incomplete Operator Console Deployments
* **Discrepancy:** The provisioning script codes the container orchestration for `anchor-client-<slug>` and `operator-console-<slug>`.
* **Reality:** The provisioner database only tracks and checks the health of the Anchor Platform and the Business Server. Operator console containers are not actively tracked or validated per tenant anchor.

---

## 5. Security & Cryptographic Limits
* **Truncated Audit Hashing:** The Business Server audit log (`admin.ts`) SHA-256 hashes the log chain but slices the output to 16 characters. This weakens collision resistance.
* **LocalStack Vault Ephemerality:** Vault storage in LocalStack is volatile. Developer credentials for payment rails (Razorpay/Cashfree) are lost on container restart.
