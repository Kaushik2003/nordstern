# Current State of the Repository

> **Context:** Describes exactly what works, what doesn't, what is stubbed, and what is ready for production as of the current timestamp.

---

## 🟢 What Works (End-to-End)

- **Anchor Platform Engine:** The official `stellar/anchor-platform` container is successfully running on testnet and correctly executing SEP-1 (Discovery), SEP-10 (Auth), SEP-24 (Interactive Flow), and SEP-38 (Quotes).
- **Deposits (On-Ramp):** A user can open a testnet wallet (e.g., Demo Wallet), authenticate, receive a live FX quote, and successfully have USDC minted/transferred to their wallet.
- **Withdrawals (Off-Ramp):** A user can send USDC back to the anchor's treasury with a unique memo. The AP Observer successfully detects the transaction and updates the status to `pending_anchor`.
- **Live FX Quotes:** The `LiveRateProvider` correctly fetches real-time USD ↔ INR exchange rates from public APIs.
- **Client Dashboard:** The Next.js operator console running on port `3001` successfully pulls live transaction and treasury data from the `business-server` via the `/admin` API.
- **Cashfree Webhooks:** The `/payout-webhook` endpoint successfully validates Cashfree HMAC-SHA256 signatures and advances transaction states.

---

## 🟡 What is Stubbed / Incomplete

- **KYC Verification:** The `business-server` contains a `SurepassKycProvider`, but by default, it uses a `MockKycProvider` that auto-approves all users. Real KYC credential gating and manual review flows are not yet wired.
- **Fiat Collections (UPI):** The interactive deposit UI displays a generated QR code (via `qrcode` library), but it is not yet tied to a live Cashfree/Razorpay Payment Gateway link that actively listens for the user's payment. It is a simulated "click to confirm" step.
- **Client Authentication:** The Next.js dashboard currently lacks a login screen. Anyone who can access Port 3001 can view the anchor's data.

---

## 🔴 What is NOT Production Ready

> [!CAUTION]
> **This stack is strictly a Sandbox/Testnet environment.** Do NOT point it to Mainnet without addressing the following:

- **Idempotency:** The `business-server` transfers USDC *before* successfully updating the Anchor Platform database. If the database update fails, the USDC is gone but the transaction is stuck.
- **Secrets Management:** Keys are stored in local `.env` files.
- **Infrastructure:** It is currently running in a local `docker-compose` setup. Production requires a robust orchestrator (Kubernetes/ECS), load balancing, and a managed PostgreSQL database (e.g., RDS).
- **Legal/Compliance:** The exact banking relationship (Nodal vs Escrow) and custody model must be finalized by legal counsel before real money touches the system.
