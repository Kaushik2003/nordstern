# Production Go-Live Gating Checklist

Before deploying the Stellar Anchor Service (`anchor-template`) to a live production environment (Stellar Mainnet with real money movement), the following security, architectural, and operational gates **MUST** be verified and completed.

---

## 0. Status — what has already landed (testnet build)

Several gates are already implemented, and where noted, **live-verified on testnet**. The mechanism exists; each still needs re-verification against the *mainnet* deployment.

| Gate | Status | Reference |
|---|---|---|
| **Deposit-release idempotency** (no double-spend / no stuck funds on crash) | ✅ Built + live-verified on testnet. *Remaining:* drive through the real AP container with a literal mid-release process kill | Transfer-After-Commit outbox + reconciler (**DEC-007**); `scripts/test-idempotency.mjs`, `scripts/test-reconcile.mjs` |
| **Withdrawal payout at-most-once** (no repeated fiat disbursement) | ✅ Built + verified live. Client-side status filter (AP filter is unreliable) + durable payout claim | **DEC-009**; `withdrawal_payouts` guard in `poller.ts` |
| **KYC fail-closed** (no silent mock) | ✅ Real DIDIT is the default; server refuses to boot without real KYC; mock forbidden on mainnet | **DEC-008** |
| **Atomic webhook processing** (DIDIT) | ✅ Dedupe + decision upsert in one DB transaction | `adapters/kyc/didit.ts` `applyWebhook` |
| **Webhook signature verification** (DIDIT / Razorpay / Cashfree) | ✅ HMAC-SHA256, timing-safe compare, replay window checked | `webhooks.ts` |
| **Real verified fiat-in** (Razorpay collection) | ✅ Gated before USDC release | `adapters/deposit/razorpay.ts` |

Everything below is the **remaining** work (infra, secrets, mainnet config, legal) **plus mainnet re-verification of the above**.

---

## 1. Secrets & Credentials Hardening
In local development and testnet, secrets are read from local `.env` files. In production, these must be decoupled from the runtime container image and injected securely:
- [ ] **Centralized Secret Manager:** Migrate all secrets (`DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `RAZORPAY_API_KEY`, `RAZORPAY_WEBHOOK_SECRET`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, database passwords) to **AWS Secrets Manager** or **HashiCorp Vault**.
- [ ] **IAM Role Access:** Provision minimal IAM policies (Role-Based Access Control) to allow only specific containers to query the Secret Manager at startup.
- [ ] **No Secrets on Disk:** Verify that no credentials are written to configuration files, logs, or stored in git history.
- [ ] **Key Rotation Policy:** Define a standard schedule and procedure for rotating API keys and webhook signing secrets.

---

## 2. Infrastructure & Network Isolation
The operator console (`client`) is designed to run in a trusted template environment without built-in authentication:
- [ ] **Operator Console Shielding:** The Next.js dashboard (`client/` on port `3001`) must **NEVER** be exposed to the public internet. It must reside inside a private VPC subnet accessible only via:
  - Corporate VPN (e.g. AWS Client VPN)
  - Zero-Trust Network Access / SSO (e.g. Cloudflare Access, Google Identity-Aware Proxy)
- [ ] **TLS Termination:** Ensure SSL/TLS is terminated at the load balancer (ALB) or gateway router (Traefik) with custom certificates. Do not route plain HTTP.
- [ ] **Rate Limiting:** Place rate-limiting rules on external-facing endpoints (like the SEP callbacks and webhook endpoints) at the gateway layer to mitigate denial-of-service attempts.

---

## 3. Stellar Mainnet Configuration Swap
Testnet settings and account credentials must be safely swapped for production networks:
- [ ] **Network Passphrase:** Change the Stellar Network Passphrase to the public global network:
  `Public Global Stellar Network ; IIF ; 2015`
- [ ] **Horizon Endpoint:** Update the Horizon URL to point to production Horizon servers:
  `https://horizon.stellar.org` (or a private, redundant Horizon node).
- [ ] **On-Chain Keypairs:** Swap issuer and distribution keypairs for mainnet accounts. Ensure the issuer account has its signers configured and keys secured in a hardware security module (HSM) or secure custody solution.
- [ ] **Production Asset Issuer:** This build already uses `USDC`, but against a **testnet** issuer (`ASSET_ISSUER_PUBLIC` in `.env`). Swap it for the **mainnet Circle USDC issuer**, and re-establish the treasury trustline + float against that issuer. Update `stellar.toml` / `assets.yaml` metadata.
- [ ] **Real-provider adapter check (no mocks in prod):** Assert `KYC_PROVIDER` ∈ {didit, surepass} with `ALLOW_MOCK_KYC` **unset** (DEC-008 forbids mock on mainnet), `DEPOSIT_PROVIDER=razorpay`, `PAYOUT_PROVIDER=cashfree`, and `FEE_PROVIDER` a real FX source — not `mock`. A mainnet boot must fail if any money-path adapter is a mock.
- [ ] **Treasury float sizing & reserve alarms:** Fund the mainnet treasury with real USDC and set reserve-floor alerts (`assertTreasuryReserve` already blocks over-release, but low-float should page before it starts rejecting deposits).

---

## 4. Webhook & Transaction Security
- [x] **Deposit-release idempotency:** The USDC release is a Transfer-After-Commit outbox (`releases.ts`, DEC-007) — intent is durably recorded before the Stellar submit, the send is idempotent via an on-chain memo scan, and a reconciler self-heals crashes. *Mainnet gate:* re-run the crash → recover proof against the mainnet AP container.
- [x] **Atomic Webhook Operations:** DIDIT's dedupe + decision upsert run in one DB transaction (`applyWebhook`). Razorpay's release path is guarded by the idempotent outbox (its dedupe is best-effort, not load-bearing). *Verify Cashfree payout-webhook handling holds the same property before mainnet.*
- [x] **Timing-Safe Signatures:** `crypto.timingSafeEqual` is enforced on DIDIT, Razorpay, and Cashfree HMAC headers (`webhooks.ts`). Re-verify after any handler change.
- [x] **Replay Protection:** DIDIT timestamp header is rejected outside a ±300s window. *Gate:* confirm equivalent freshness checks on every mainnet webhook source.
- [ ] **Mainnet re-verification:** Re-run all of the above against production vendor accounts (live Razorpay/Cashfree/DIDIT keys) — sandbox signatures and payload shapes can differ from production.

---

## 5. Database & Operational Resiliency
- [ ] **Point-in-Time Recovery (PITR):** Enable automated daily backups and write-ahead log archiving (PITR) for the PostgreSQL databases (`anchordb` and `controldb`).
- [ ] **Ledger Observer Monitoring:** Establish Prometheus/Grafana alerts to monitor the latency of the Stellar Ledger Observer. If the observer falls behind the ledger tip, alert engineering immediately to avoid status reconciliation delays.
- [ ] **Database Separation:** Verify that the platform control plane DB (`controldb`) remains physically or logically isolated from the Anchor Platform's internal DB (`anchordb`).

---

## 6. Legal, Compliance & Banking Gates
*The legal model must be fully aligned before initiating mainnet operations. The following are open regulatory questions requiring specialist counsel:*
- [ ] **FIU-IND Registration:** Register the operating entity as a Virtual Digital Asset Service Provider (VDASP) under the Financial Intelligence Unit - India (PMLA compliance).
- [ ] **Escrow & Escrow-Agent Structure:** Finalize the nodal/escrow banking relationship structure:
  - *Option A:* NordStern holds the nodal escrow.
  - *Option B:* The partner anchor business brings their own bank escrow accounts.
- [ ] **KYC Data Consent:** Verify that user consent forms align with the Indian Digital Personal Data Protection (DPDP) Act, detailing how KYC records are captured, shared with Didit/Surepass, and stored.
- [ ] **Anti-Money Laundering (AML) Rules:** Implement transaction monitoring rules and threshold check flags for high-value deposits/withdrawals.
