# NordStern — Product Acceptance Criteria (Deployment Gates)

> **The deployment decision is based solely on this list.** These are the **P0**
> gates distilled from [`MANUAL_PRODUCT_TEST_PLAN.md`](./MANUAL_PRODUCT_TEST_PLAN.md).
> Each gate maps to specific test IDs there. **Every gate must be ✅ before the first
> public deployment.** A single ❌ is a no-go.
>
> Scope of this deployment: **testnet, single production anchor (or a small hand-
> onboarded set), non-custodial.** Mainnet/real-money go-live is a separate, later
> gate (see AGENTS.md §7) and is **out of scope** here.

---

## How to read this

- ✅ = verified pass · ❌ = fail (blocks deploy) · ⏳ = not yet tested
- Each gate cites the authoritative test IDs. If those pass, the gate passes.
- "Fill in" the status column as you complete the test plan.

---

## Gate 1 — Founder can complete onboarding end-to-end

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 1.1 | A founder can submit a business application via the 3-step wizard | F-01…F-04 | ⏳ |
| 1.2 | A founder can sign in with email OTP (no password) | F-13, F-15 | ⏳ |
| 1.3 | A valid invitation redeems and the activation form works | F-30, F-33 | ⏳ |

## Gate 2 — An anchor actually provisions (real, not simulated)

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 2.1 | Redeem triggers **real** provisioning with genuine stage progress | F-37 | ⏳ |
| 2.2 | The anchor serves live SEP-1/10 (`stellar.toml` + signable challenge) | F-39 | ⏳ |
| 2.3 | The anchor auto-registers with the aggregator and becomes available | F-40 | ⏳ |
| 2.4 | On failure, the job fails cleanly, rolls back, and **retry recovers** | F-50, F-51, F-52 | ⏳ |
| 2.5 | The founder sees the 4 live URLs and each opens (customer, console, API, SEP) | F-38 | ⏳ |

## Gate 3 — NordStern admin can review & decide

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 3.1 | Admin login works and is throttled | A-01, A-13 | ⏳ |
| 3.2 | Admin can approve (mint invite) and reject applications | A-06, A-07 | ⏳ |
| 3.3 | Admin surface is **unreachable** without the admin cookie | A-03 | ⏳ |

## Gate 4 — A customer can buy successfully (the money-in flow)

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 4.1 | Customer signs in with email OTP | C-01, C-03 | ⏳ |
| 4.2 | Customer completes KYC via DIDIT; status is server-truth only | C-21, C-22 | ⏳ |
| 4.3 | Buy: quote → wallet confirm → Razorpay → **money added** end-to-end | C-30, C-33, C-34, C-35, C-36 | ⏳ |
| 4.4 | Customer can see their receipt and transaction history | C-60, C-61 | ⏳ |

## Gate 5 — Money cannot be duplicated or lost 🔒

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 5.1 | Deposit retry never double-sends (outbox single-winner + adopt) | FAIL-06 | ⏳ |
| 5.2 | A crash mid-release is reconciled (no double-spend, no stuck-forever) | FAIL-07 | ⏳ |
| 5.3 | Withdrawal payout is at-most-once | FAIL-08 | ⏳ |
| 5.4 | Double-click / double-submit yields exactly one settlement | C-37, FAIL-10 | ⏳ |
| 5.5 | Cancelled payment never credits | FAIL-16 | ⏳ |
| 5.6 | NordStern never pools customer funds (non-custodial invariant) | SEC-13 | ⏳ |

## Gate 6 — Multi-tenant isolation holds 🔒

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 6.1 | Each anchor shows only its own brand/theme/logo | MT-01, MT-02 | ⏳ |
| 6.2 | Operator sessions and data do not cross anchors | MT-03, MT-04, MT-05 | ⏳ |
| 6.3 | Treasuries, keys, and API keys are per-anchor and isolated | MT-06, MT-07, MT-10 | ⏳ |
| 6.4 | Customer data/history never leaks across anchors | MT-12, C-62 | ⏳ |
| 6.5 | Cookies are host-scoped (no cross-anchor session bleed) | MT-08, SEC-05 | ⏳ |

## Gate 7 — Authentication & authorization are sound 🔒

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 7.1 | The three realms (admin/operator/customer) never interchange | SEC-01, SEC-02, SEC-03, A-04 | ⏳ |
| 7.2 | ID tampering / IDOR is blocked everywhere | SEC-07 | ⏳ |
| 7.3 | OTP never leaks account existence; wrong/expired codes rejected | F-14, C-02, FAIL-01, FAIL-02 | ⏳ |
| 7.4 | Sessions expire and refresh correctly; logout truly ends access | SEC-08, SEC-09, C-64 | ⏳ |
| 7.5 | Invitations are single-use | SEC-10 | ⏳ |
| 7.6 | KYC cannot be self-declared by the client | SEC-12, C-22 | ⏳ |

## Gate 8 — No secrets ever exposed 🔒

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 8.1 | PSP credentials are write-only; never echoed on redeem or in the console | F-34, O-30 | ⏳ |
| 8.2 | API-key secrets appear only once on create/roll, never on list | O-22, O-23 | ⏳ |
| 8.3 | Signing/distribution/issuer seeds are encrypted and never surfaced | MT-10, SEC-06 | ⏳ |

## Gate 9 — No fabricated data on any surface

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 9.1 | A fresh anchor ships **zero** demo seeds (compliance/audit/keys/customers) | FAIL-SEED, O-40 | ⏳ |
| 9.2 | Customers/compliance show only real derived fields (no fake PII/tier/risk) | O-18, O-19 | ⏳ |
| 9.3 | Webhooks/Reports show honest empty/disabled states, not mocks | O-25, O-26 | ⏳ |
| 9.4 | Aggregator registry contains no demo `globex`/`acme` rows | FAIL-SEED-AGG | ⏳ |

## Gate 10 — Trustworthy product surface (money-grade UX) 🔒

| # | Criterion | Tests | Status |
|---|-----------|-------|--------|
| 10.1 | No Stellar/blockchain jargon leaks into customer-facing screens | UX-03 | ⏳ |
| 10.2 | Amounts, confirmations, and receipts are clear — "I'd trust this with money" | UX-08 | ⏳ |
| 10.3 | Emergency stop / strategy limits actually gate customer Buys | O-15, C-31, C-32, C-38 | ⏳ |

---

## Explicitly OUT of scope for this gate (do not block on these)

These are known, documented limitations — they are **not** deployment blockers for a
testnet, hand-onboarded, non-custodial pilot, but they **must** be gated separately
before mainnet/real-money go-live:

- Real fiat **off-ramp payout** (Sell payout is mock — no live Cashfree creds).
- **Mainnet / real money**, production TLS, public domain, Kubernetes
  (`anchor-template/infra` authored but not wired).
- Live FX (aggregator uses a hardcoded rate).
- Automated test coverage (this plan is the manual substitute for the pilot).
- Bank-integration figures (balances/settlement) in the operator console.

> **Go/No-Go rule:** Gates 1–10 all ✅ → cleared for the **testnet pilot deploy**.
> Any 🔒 gate ❌ → **hard stop**, regardless of everything else. Real-money go-live
> requires the separate checklist in **AGENTS.md §7** and the Cashfree skills.
