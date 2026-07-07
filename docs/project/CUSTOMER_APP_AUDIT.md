# Customer App — audit, journey & rebuild plan

> Phase 1 (audit) + Phase 2 (journey) + Phase 3 (engineering-UI removal plan), before
> writing Phase 4 code. Grounded in `anchor-template/anchor-client` and the business-server
> SEP-24 backend, verified 2026-07-07.

## Headline finding

**There is no customer buy/sell app today.** `anchor-template/anchor-client` (the image
`nordstern/anchor-client:dev` provisioned per anchor) is actually three non-customer things:

1. **Root `/`** — a **Freighter + XDR wallet demo** (connect wallet, sign SEP-10 challenge,
   build XDR payment/trustline, memos). Pure blockchain engineering demo.
2. **`/anchor`** — a **marketing/landing page for the anchor factory** ("SEP servers run for
   you", "create your operator account", "watch it provision").
3. **`/anchor/(app)/*` + `/anchor/onboarding` + `/anchor/admin`** — an **operator/provisioning
   console** (`lib/cp` = control-plane client: register, login, createAnchor, provision,
   alerts). This duplicates the platform console + operator console.

The **real customer money backend exists** — but on the **business-server** (SEP-24
interactive + KYC + Razorpay), not in this app. So the Customer App is a **fresh build over
existing endpoints**, replacing the demo/provisioning UI.

## Phase 1 — Feature matrix

| Feature | Backend exists | UI exists | Mocked? | Production-ready? |
|---|---|---|---|---|
| **Customer login (email/phone)** | ❌ (identity is the **Stellar wallet via SEP-10**, no customer account system) | wallet-connect demo only | n/a | ❌ — **backend decision needed** |
| **KYC** | ✅ `POST /sep24/kyc/session` (didit), `GET /sep24/kyc/status` | ❌ (no customer KYC screen) | mock provider by default; real didit available | 🟡 backend real, UI missing |
| **Buy / deposit (on-ramp)** | ✅ `GET /sep24/interactive`, `POST /sep24/interactive/amount` (quote), `POST /sep24/razorpay/verify` (UPI), `POST /sep24/interactive/complete` (release) | SEP-24 interactive webview (functional, not fintech-polished) | Razorpay real / mock default | 🟡 backend real, UI is a webview |
| **Sell / withdraw (off-ramp)** | ✅ `POST /sep/withdraw`, poller payout, `GET /sep/tx/:id` | minimal | payout mock by default | 🟡 backend real, UI missing |
| **Quote / rate** | ✅ `/rate`, `interactive/amount` returns quote | inside webview | mock rate default | 🟡 |
| **Transaction status / progress** | ✅ `GET /sep24/transaction`, `GET /sep/tx/:id` | raw status | — | 🟡 real data, engineering presentation |
| **History** | ✅ (same tx endpoints) | ❌ (no customer history screen) | — | ❌ UI missing |
| **Receipts** | ❌ (derive from transaction) | ❌ | — | ❌ |
| **Profile** | ❌ (no customer account) | ❌ | — | ❌ backend decision needed |
| **Support / FAQ** | ❌ | ❌ | — | ❌ (static content ok) |
| **Home dashboard** | ✅ (balance/history from tx endpoints) | ❌ | — | ❌ UI missing |

### Blockchain terms exposed to users today (must go)
Freighter, XDR, trustline, memo, SEP-10/24, XLM, "Stellar anchor", asset issuer, distribution
account, testnet, Horizon — **55 occurrences** in customer JSX. All are engineering vocabulary.

### Unfinished / misplaced flows
- The whole `/anchor/*` provisioning console does not belong in the customer app.
- Buy works only inside the SEP-24 **webview** opened by a third-party wallet — there is no
  standalone consumer app flow.
- No customer account, so no login/profile/history-by-user.

## Phase 2 — The customer journey (mapped to real endpoints)

Designed around the customer, not Stellar. Every step maps to an existing backend call
(gaps flagged **[GAP]**):

```
Visit MizuPay            → branded landing (reuse per-anchor branding env)
   ↓
Login / Sign up          → [GAP] customer account (email/phone) — see decision below
   ↓
Complete KYC             → POST /sep24/kyc/session → hosted didit → GET /sep24/kyc/status
   ↓
Choose Buy or Sell       → simple two-button home
   ↓
Enter amount (INR)       → POST /sep24/interactive/amount  → live quote (fees hidden in rate)
   ↓
Bank payment (UPI)       → Razorpay UPI intent/QR → POST /sep24/razorpay/verify
   ↓
Processing               → poll GET /sep24/transaction (friendly status labels)
   ↓
Completed                → POST /sep24/interactive/complete settles; success screen
   ↓
Receipt                  → [GAP] render from transaction data (no receipt endpoint)
   ↓
History                  → GET /sep24/transaction list, fintech styling
```

Sell mirrors this: amount → confirm → `POST /sep/withdraw` → "we're paying your bank" →
poll `GET /sep/tx/:id` → completed → receipt.

**Vocabulary translation (what the customer sees):**
| Instead of | Show |
|---|---|
| Deposit / mint / release | **Buy** / "money added" |
| Withdrawal / burn | **Sell** / "cash out" |
| USDC / asset / trustline | **Balance** (₹ or "USD balance") |
| SEP-10 auth / Freighter | **Log in** |
| Memo / transaction hash / XDR | (hidden; "Reference" only in an optional advanced view) |
| Horizon / testnet / issuer | (never shown) |

### ⭐ Product decision needed (surface before Phase 4 build)
**Customer identity model.** Today identity = Stellar wallet (SEP-10). A Revolut-style app
needs a login. Options:
- **A. Custodial-lite account (email/OTP)** — NordStern/anchor holds a managed Stellar
  account per customer; customer never sees a wallet. Best UX, **requires new customer-auth
  + account backend**, and touches the custody question (§5 compliance).
- **B. Wallet-connect, prettified** — keep SEP-10 wallet auth but hide the mechanics behind
  "Continue with wallet". No new backend; least fintech-like; still assumes the user has a
  Stellar wallet.
- **C. Hybrid** — email login for the app shell + KYC + history, wallet only at settlement.

This choice gates Login/Profile/History-by-user. KYC, Buy, Sell, Payment, Processing,
Receipt can be built against the real SEP-24 backend **regardless** of the choice.

## Phase 3 — Engineering UI to remove / replace

| Remove | Replace with |
|---|---|
| Root Freighter/XDR wallet demo (`app/page.tsx`) | Branded customer landing → Login/Buy |
| `/anchor` factory landing | (delete from customer app — belongs to platform console) |
| `/anchor/(app)/*` + `/anchor/onboarding` + `/anchor/admin` provisioning console | (delete — this is operator/NordStern work, already built elsewhere) |
| `lib/cp` control-plane client, `lib/freighter`, XDR endpoints usage | SEP-24/KYC/Razorpay client (`lib/anchor` over `/biz/sep24/*`) |
| Raw status strings, memos, tx hashes, "trustline", "XLM" | friendly status steps, hidden references, ₹/balance |

## Phase 4 — Build plan (screens → real endpoints)
1. **Shell + branding + Home** (balance + Buy/Sell) — tx endpoints.
2. **KYC** — `/sep24/kyc/session` + `/kyc/status`, hosted flow, friendly states.
3. **Buy** — amount → quote (`interactive/amount`) → UPI (`razorpay/verify`) → complete.
4. **Processing + Completed + Receipt** — poll `/sep24/transaction`, success + receipt.
5. **Sell** — `/sep/withdraw` → payout polling.
6. **History + Transaction details** — tx endpoints, fintech styling.
7. **Profile + Support/FAQ** — (Profile gated on identity decision; Support is static).
8. **Polish (Phase 5)** — Revolut/Ramp-grade: motion, empty/loading/error states, mobile-first.

## Backend gaps to close (documented, not faked)
- Customer account/auth (identity decision A/C) — **new backend**.
- Receipt rendering endpoint (or derive client-side from transaction).
- Profile data (depends on account model).
Everything else (KYC, buy, sell, quote, payment, processing, history) reuses **existing**
business-server SEP-24 endpoints.
