# Customer money flow — audit (Milestone 2, before code)

> Trace of the real on/off-ramp path, the backend reused, state transitions, blockchain
> leaks, and the backend seams a native fintech UI needs. Verified against the
> business-server SEP-24 code, 2026-07-08.

## The path today

```
Wallet (SEP-10 auth) ─┐
                      ▼
  POST /sep/deposit|/sep/withdraw (walletApi → AP SEP server /sep24/transactions/*/interactive)
                      ▼  returns { url, id }  ← interactive URL + transaction_id
  GET /sep24/interactive?transaction_id=…  ── SERVER-RENDERED HTML (the "webview")
        ├─ strategy gate (emergencyStop / maintenanceMode / min-max)
        ├─ KYC gate: getStatus(account) !== 'ACCEPTED' → DIDIT hosted flow
        ├─ amount form → POST /sep24/interactive/amount (stores amount)
        ├─ DEPOSIT: rate.quote() → deposit.createOrder() (Razorpay) → embedded Checkout
        │            → POST /sep24/razorpay/verify (HMAC + re-check) → release
        └─ WITHDRAW: show treasury address + memo → POST /sep24/interactive/complete
                      ▼
  POST /sep24/interactive/complete  ── moves money (releaseDeposit / marks withdrawal)
                      ▼
  Razorpay webhook (independent truth) · DIDIT webhook (KYC truth)
                      ▼
  GET /sep24/transaction?id=…  ── SERVER-RENDERED HTML detail (status, amounts, memo, hash)
```

**Everything the customer sees today is server-rendered HTML inside the business-server.**
It is functional but it is the engineering webview — the exact surface we must replace.

## Backend endpoints (reused as-is)
| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /sep/auth`, `GET /sep/auth` | SEP-10 challenge + token | wallet signature |
| `POST /sep/deposit` `/sep/withdraw` | start SEP-24 interactive → `{url,id}` | SEP-10 token |
| `POST /sep24/interactive/amount` | store entered amount | tx-scoped |
| `POST /sep24/razorpay/verify` | verify Razorpay payment (HMAC) | tx-scoped |
| `POST /sep24/interactive/complete` | release/mark money movement | KYC re-checked server-side |
| `POST /sep24/kyc/session`, `GET /sep24/kyc/status` | DIDIT session + status (by account) | tx-scoped |
| `GET /sep/tx/:id`, `GET /sep24/transaction` | one transaction | SEP-10 token / tx id |
| `/webhooks/razorpay`, `/webhooks/didit` | payment + KYC truth (HMAC) | signature |

## State transitions (SEP-24 → customer language)
| Real status | Customer sees |
|---|---|
| `incomplete` | Getting started |
| `pending_user_transfer_start` | Waiting for your payment |
| Razorpay paid / `pending_anchor` | Payment received · Verifying payment |
| release in progress | Processing transfer |
| `pending_stellar` | Completing transaction |
| `completed` | Done ✓ |
| `error` / `expired` | Couldn't complete (support) |
| `refunded` | Refunded |

## Blockchain terminology leaking into the UI today (all in the webview)
`USDC`/asset code as the unit, `memo` (required, shown), treasury Stellar `address`, `trustline`
("Add a USDC trustline"), Stellar `transaction hash`, `testnet`, `SEP-24`, transaction IDs.
All must be hidden (or moved under "Advanced details").

## Backend gaps / seams for a NATIVE fintech UI

1. **Settlement is SEP-10 wallet-authenticated.** To start a deposit/withdrawal today the
   *wallet* signs a SEP-10 challenge. A native, wallet-less "Buy" therefore needs a
   **customer-session-authenticated settlement API** on the business-server: the customer
   is authenticated by their **platform email-OTP session** (`ns_customer`, which the
   business-server can verify — same JWT secret, `typ:'customer'`), and their **linked
   wallet** is the destination. This is the "smallest secure interface" and keeps the model
   non-custodial (wallet = destination, not identity). **New backend — Milestone 2b.**
2. **Customer-scoped history needs the same session auth.** `GET /sep24/transaction` is tx-id
   scoped; there is no "my transactions" list without SEP-10. → honest empty state until 2b.
3. **KYC is account-keyed and not propagated centrally.** DIDIT `vendor_data` = Stellar
   account; the `/webhooks/didit` decision updates `nordstern.kyc_verifications` (server-side
   truth) but nothing tells the **central customer profile**. → **build now (2a)**: customer
   starts KYC tied to their **customer id**; the webhook propagates the decision
   server-to-server to platform-api; the client can never self-declare. See below.
4. Razorpay **order creation** happens inside the interactive HTML render — a native Buy needs
   an explicit "create order" step in the settlement API (2b).

## Build plan
- **2a — KYC done right (this increment):** platform-api internal endpoint (service-secret
  auth) to set a customer's KYC status; business-server propagates the DIDIT webhook decision
  to it, keyed by customer id. Client only ever *reads* status. No fake DIDIT, no self-declare.
- **2b — Customer settlement API + native Buy/Sell/Processing/Receipt/History:** business-server
  customer endpoints (session-auth) for quote → create order → verify → status → history, then
  the Next fintech screens over them. Larger; follows 2a.

## KYC 2a — the secure interface
```
Customer app  ──(ns_customer session)──▶  business-server  POST /customer/kyc/start
   → creates DIDIT session, vendor_data = "customer:<customerId>", returns hosted URL
Customer completes DIDIT (hosted)
DIDIT ──(HMAC webhook)──▶ business-server /webhooks/didit  (server-side truth)
   → applyWebhook + propagate: POST platform-api /internal/customers/kyc
        headers: x-service-secret            ← only a secret holder can set status
        body: { customerId, status }
platform-api  → customers.kyc_status = mapped(status)
Customer app polls  GET /api/v1/customer/kyc/status   (already exists) → shows result
```
Guarantees: the client never sets its own status; only the business-server (holding the
service secret) can, and only after DIDIT's signed webhook.
