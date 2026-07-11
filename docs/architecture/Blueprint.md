# NordStern — Product Blueprint (canonical UX + product roadmap)

> Four products, not four codebases. Each must feel complete enough to use daily.
> This is the canonical blueprint we build against. Backend-readiness is verified
> against the live code (endpoints cited), because the #1 rule is **maximize reuse of
> the backend we already have** — expose existing APIs before inventing new ones.

**Legend for Backend Readiness:** exists (endpoint live) · partial (endpoint exists
but returns some mock/hardcoded fields, or needs scoping) · missing (no endpoint).

**Verified backend inventory (2026-07-07):**
- **platform/api** `/api/v1`: `auth` (register, verify-email, login, refresh, logout, forgot/reset-password, me) · `organizations` (create, list, get, projects, invitations/accept) · `applications` (create, list, approve) · `anchor-invitations` (verify, redeem, status/:jobId, status/:jobId/retry) · `.../credentials` (get, put/:provider, rotate, delete — PSP creds via SecretStore) · `anchors/resolve` · `apiKeys` (list, create, revoke) · `invitations` (team: list, create, revoke) · `members` (list, patch role, delete) · `auditLogs` (list). Provisioner drives control-plane.
- **control-plane** `:3002`: `auth` (register, login) · anchors (create, list, get, status, provision, patch, delete) · admin (list anchors, patch) · config (`/:anchorId`, `/:anchorId/alerts` get/inject/resolve).
- **business-server `/admin`** (17, now `requireOperator`-gated): transactions, summary, users, compliance/cases (+resolve), compliance/audit, developer/keys (CRUD +roll), developer/webhooks/deliveries, strategy (get/post = versioned pricing/spread), transactions/:id/retry, transactions/:id/refund, treasury/sweep, treasury/pause. Plus SEP flows: `/customer` (SEP-12), `/rate`, `/sep24/*` interactive, `/webhooks/*` (didit + razorpay, HMAC-verified), walletApi. Adapters present: KYC didit/mock, deposit razorpay/upi/mock, payout cashfree/mock, rate cmc/mock.
- **aggregator `:3005`**: anchors (list, register) · quote (create, get) · route · health · capabilities · transactions/start.
- **Frontends today:** `platform/console` (onboarding: register, login, verify-email, forgot/reset, overview, wallet, redeem). `anchor-template/console` (operator: overview, credentials only). `anchor-template/anchor-client` (customer: signup, login, onboarding, dashboard, transactions, anchors, rules, settings).

---
---

# PRODUCT 1 — Business Onboarding

## 1. Product vision
The **Stripe Atlas of Stellar anchors**: a fintech founder goes from "I want to launch an INR anchor" to a **live, branded, on-chain anchor with real PSP credentials** without touching Stellar, Docker, or KYC plumbing. It should feel like a guided, trustworthy control-tower — every step visibly de-risked, nothing that reads as "crypto."

## 2. User personas
- **Founder/CTO (primary)** — technical enough to bring a PSP + bank relationship, wants the SEP/KYC/treasury stack handled. Judges us on trust and time-to-live.
- **Compliance lead (secondary)** — needs to see what data is collected, where funds sit, who's regulated.
- **Ops engineer (secondary)** — will wire PSP webhooks and DNS.

## 3. User journey (end-to-end)
Landing → Register org → Application (business + compliance intake) → **NordStern review/approve** → Invitation email → Redeem (claim the anchor) → Branding → PSP credentials → Domain selection → **Launch (provision)** → Live confirmation → hand-off to Operator Console.

## 4. Information architecture
```
nordstern.live (marketing)
  /register            create org + owner
  /verify-email
  /login /forgot /reset
  (app)
    /overview          org home → anchors + application status
    /apply             multi-step application wizard
    /anchors/:id
       /redeem         claim invitation → provisioning progress
       /branding       name, accent, logo, legal URLs
       /credentials    PSP/KYC keys (write-only, SecretStore)
       /domain         subdomain selection + DNS verify
       /launch         review → provision → live
    /team              invite members (roles)
    /billing           (future)
```

## 5. Feature inventory
- **Must:** register/verify/login; application wizard; approval → invitation → redeem; branding; PSP credential capture; provisioning with live progress; go-live confirmation; team invites.
- **Should:** domain selection + DNS-verify UX; application status timeline; resend/retry; KYB document upload; sandbox-vs-live toggle.
- **Nice:** billing/usage; multi-anchor per org dashboards; self-serve plan tiers.

## 6. UX problems today
1. **Approval is a public bypass** — `POST /applications/:id/approve` has no `requireAuth`/`requireRole` (`applications.routes.ts:35`). Anyone can approve → provision. **Disqualifying for a money product.**
2. Application collects a thin profile; no KYB/diligence step before a money-moving stack is granted.
3. Post-approval is bare status polling — no "your anchor is live: domain, keys, next steps" concierge.
4. No visible trust indicators (who's regulated, where funds sit, testnet vs mainnet) at decision points.
5. Redeem/branding/credentials/domain exist as backend concepts but are thin/absent in the console UI.

## 7. Proposed improvements (prioritized)
1. **Gate approval** with `requireAuth`+`requireRole` (NordStern reviewer). *(hours)*
2. **Application wizard** with KYB intake + document upload, mapped to the existing `applications` model.
3. **Redeem → provisioning progress** screen driven by the **real** `anchor-invitations/status/:jobId` (+ retry) — genuine lifecycle strings, not spinners.
4. **Branding + Credentials + Domain** screens over existing endpoints (see readiness).
5. **Go-live confirmation** with the anchor's home domain, asset, and Operator Console link.

## 8. Backend readiness
| Feature | Status | Evidence / note |
|---|---|---|
| Register / verify / login / password reset | | `auth.routes.ts` full set |
| Org + membership + roles | | `organizations`, `members`, `invitations` |
| Application create/list | | `applications` POST/GET |
| Application **approve** | | exists but **unauthenticated** — must gate, not build |
| KYB document upload | | no endpoint; add to application model |
| Invitation → redeem → provision | | `anchor-invitations` verify/redeem/**status/:jobId**/**retry** — real job lifecycle |
| Provisioning lifecycle (keygen→Friendbot→issue→containers→health→aggregator-register) | | control-plane provision + `provisioner.service` |
| Branding (name, accent, logo, legal URLs) | | provisioner `branding` map → orchestrator `brandEnv`; anchor create takes `branding` |
| PSP/KYC credentials (write-only) | | `credentials` get/put/rotate/delete → **SecretStore** (never in DB) |
| Domain selection | | home_domain derived from slug at provision; no chooser/DNS-verify endpoint |
| Emails (verify, approval, invitation, live) | | mailer exists (`lib/mailer` resend/console); verify-email wired; approval/invite/live templates to add |
| Billing | | none (out of pilot scope) |

## 9. Implementation roadmap (independently shippable)
- **P0.1** Gate `applications/:id/approve` (auth+role). *(the one blocking security fix)*
- **B1.1** Application wizard (business + compliance intake over `applications`).
- **B1.2** Redeem + live provisioning-progress screen (over `anchor-invitations/status/:jobId` + retry).
- **B1.3** Branding screen (over provisioner branding map).
- **B1.4** Credentials screen (over `credentials` CRUD → SecretStore) with write-only masking.
- **B1.5** Go-live confirmation + Operator Console hand-off.
- **B1.6** Emails: approval, invitation, live (mailer templates).
- **B1.7** *(should)* Domain chooser + DNS-verify.
- **B1.8** *(nice)* KYB upload; billing.

**Friction points to design out:** anonymous approval (fix first); "dead air" after approval; unclear who holds funds / regulatory posture (add trust panel); credential entry with no confirmation the keys are stored safely (show SecretStore write-only confirmation, never echo secrets).

---
---

# PRODUCT 2 — Operator Console HIGHEST PRIORITY

## 1. Product vision
The **anchor operator's cockpit** — opened every morning like a bank ops dashboard. First screen answers: *Is money flowing? Is anything stuck? Is my float healthy? Anything needs me?* The defining insight: **the money backend already exists (17 endpoints); the console is 2 pages.** This product is mostly **building screens over live, now-authenticated APIs** — the highest ROI in the repo.

## 2. Personas & primary users
- **Anchor operations manager (primary)** — works the transaction/compliance queue daily.
- **Treasury/finance (primary)** — watches float, settlement, sweeps.
- **Compliance officer (primary)** — reviews KYC cases, reads audit trail.
- **Developer (secondary)** — API keys, webhooks, pricing config.

## 3. User journey
Login (platform `ns_access`) → **Dashboard** (health + pending) → drill into **Transactions** → act on a stuck one (retry/refund) → clear **Compliance** cases → check **Treasury** float → adjust **Pricing** → done. Correlate anything via the new `X-Request-Id` / tx-id logs.

## 4. Information architecture
```
console.<anchor>  (per-anchor, branded)
  /overview            Dashboard
  /transactions        ledger + detail (retry/refund)
    /deposits  /withdrawals   (filtered views)
  /customers           users + KYC status
  /compliance          case queue + resolve, audit
  /treasury            float, settlement, sweep/pause
  /pricing             spread/fees/limits (strategy)
  /developers          API keys, webhooks deliveries
  /reports             volume, settlement exports
  /settings            branding, team, notifications, support
```

## 5. Feature inventory
- **Must:** Dashboard; Transactions ledger + retry/refund; Compliance queue + resolve; Treasury float + sweep/pause; API keys; Pricing/fees/limits.
- **Should:** Customers/KYC view; Webhook deliveries; Reports/exports; Notifications/alerts; Audit log view; Team members.
- **Nice:** Branding self-edit; Support inbox; per-metric drilldowns; saved filters.

## 6. Modules (purpose · data · backend available · backend to build · UX)

| Module | Purpose | Data shown | Backend available | Still required | UX note |
|---|---|---|---|---|---|
| **Dashboard** | "Is everything OK?" | treasury USDC/XLM, counts, volume, pending, rate | `/admin/summary` | replace hardcoded fields (bankBalance, uptimes, reserved) with real/derived | Traffic-light health; pending>N alert |
| **Transactions** | ledger + act | id, kind, status, amounts, memo, dest, stellarTx, timestamps | `/admin/transactions` | — | filter by status/kind; detail drawer |
| **Deposits / Withdrawals** | filtered flows | same, filtered | (filter `/admin/transactions`) | — | tab views |
| **Retry / Refund** | unstick money | action result | `/admin/transactions/:id/retry`, `/refund` | — | confirm modal; show audit entry |
| **Customers** | who transacts + KYC | users + KYC status | `/admin/users` | per-customer detail/history | link to their txns |
| **Compliance** | work KYC/AML | case queue + hash-chained audit | `/admin/compliance/cases`, `/resolve`, `/compliance/audit` | — | queue with resolve reasons |
| **Treasury** | float + settlement | USDC/XLM balance, sweep/pause | summary + `/treasury/sweep`, `/pause` | real bank/settlement figures (now mock) | pause = big red switch; sweep confirm |
| **Settlement** | fiat in/out reconcile | inflow/settlement | `/summary.fiat` partly mock | real reconciliation source | derive from reconciler tables |
| **Webhooks** | delivery health | delivery log | `/admin/developer/webhooks/deliveries` | — | status + replay (future) |
| **API Keys** | dev access | keys, scopes, live flag | `/admin/developer/keys` CRUD +roll | — | reveal-once on create/roll |
| **Pricing / Fees / Limits** | spread & limits | versioned strategy JSON | `/admin/strategy` get/post (versioned) | limits also in assets.yaml (config) | versioned editor + diff |
| **Reports** | volume/exports | roll-ups | derive from transactions/summary | CSV export endpoint | client-side export first |
| **Notifications / Alerts** | what needs me | alerts | control-plane `config/:anchorId/alerts` (inject/resolve) | surface into console | bell + list |
| **Audit Logs** | who did what | hash-chained log | `/admin/compliance/audit` | — | filter by actor/action |
| **Team Members** | operator access | org members + roles | platform `members` | scope to anchor | invite/role UI |
| **Branding / Settings / Support** | self-manage | brand map | provisioner branding (set at launch) | runtime edit endpoint | link support email |

## 7. UX problems today
1. **Only 2 pages (overview, credentials)** against 17 live money endpoints — the console can't run an anchor.
2. `/summary` has **hardcoded fields** (bankBalance `1420500.00`, uptimes `99.98%`, reserved) — a demo lie waiting to happen; must be real or clearly labeled.
3. No transaction detail / retry-refund UI, no compliance queue, no treasury controls — all backend-ready, no surface.
4. Alerts exist at the control-plane but are invisible to operators.

## 8. Backend readiness summary
**Overwhelmingly ** — 14 of ~18 modules map to a live endpoint. The work is **frontend + de-mocking `/summary`**, not backend. Only genuinely missing: CSV **reports export** (), per-customer detail (), runtime branding edit (). This is the reuse jackpot.

## 9. Implementation roadmap (each independently shippable)
- **P1.1 Dashboard** — real `/admin/summary`, de-mock the hardcoded fields, health traffic-lights, pending alert.
- **P1.2 Transactions** — ledger + filters + detail drawer over `/admin/transactions`.
- **P1.3 Transaction actions** — retry/refund with confirm + audit echo.
- **P1.4 Compliance** — case queue + resolve + audit viewer.
- **P1.5 Treasury** — float + sweep/pause (guarded, confirm modals).
- **P1.6 Pricing/Fees/Limits** — versioned strategy editor.
- **P1.7 API Keys + Webhooks** — reveal-once keys, delivery log.
- **P1.8 Customers/KYC** — users list + status; per-customer detail (needs ).
- **P1.9 Alerts/Notifications** — surface control-plane alerts.
- **P1.10 Reports** — client-side export first, then CSV endpoint.
- **P1.11 Team/Settings/Branding** — access + self-edit.

---
---

# PRODUCT 3 — Customer-facing Anchor

## 1. Product vision
Feels like **Ramp / MoonPay / Cash App** — a polished INR↔USDC on/off-ramp where **the customer barely knows Stellar exists**. "Buy" and "Sell" in INR; wallet/Stellar details are plumbing. Two delivery surfaces: the **SEP-24 interactive webview** (opened by third-party wallets) and the **branded anchor web app** (`anchor-client`).

## 2. Personas
- **Retail on-ramper** — has INR, wants USDC in their wallet. Cares about speed, fees, trust.
- **Off-ramper** — has USDC, wants INR in their bank. Cares about payout time + limits.
- **Wallet user** (SEP-24) — arrives via Lobstr/Vibrant; sees only the interactive flow.

## 3. User journey
Landing → sign up / wallet connect → **KYC** (once) → **Buy** (enter INR → see USDC + fee quote → pay via UPI → progress → USDC delivered → receipt) or **Sell** (enter USDC → INR quote → send USDC w/ memo → bank payout → receipt) → History.

## 4. Information architecture
```
<anchor>.app  (branded)
  /                landing (buy/sell CTA)
  /signup /login
  /onboarding      KYC (SEP-12 / didit)
  (app)
    /dashboard     balance + buy/sell entry
    /buy           amount → quote → UPI pay → progress
    /sell          amount → quote → send USDC → payout
    /transactions  history + receipts + status
    /settings      profile, limits, support
SEP-24 webview (served by business-server /sep24/interactive) — the wallet path
```

## 5. Feature inventory
- **Must:** auth; KYC; buy (deposit) with live quote + UPI; sell (withdraw) with payout; transaction progress; receipts; history; error/loading/empty states.
- **Should:** limits display; FAQ/support; mobile-first polish; trust indicators (regulated, funds custody, "powered by NordStern").
- **Nice:** saved bank/UPI; recurring buys; price alerts.

## 6. UX problems today
1. Fiat in/out and KYC are **mocked by default** (mock adapters; auto-approve KYC). Real adapters (didit, razorpay, upi, cashfree) exist but aren't go-live wired.
2. `anchor-client` reads as an engineering demo (raw statuses, "anchors"/"rules" pages expose plumbing) rather than a fintech app.
3. No polished progress/receipt/error/empty states; Stellar concepts leak (memo, addresses).

## 7. Proposed improvements (prioritized)
1. **Buy/Sell as the whole product** — hide Stellar; INR-first amounts; live quote from `/rate`.
2. **Real UPI deposit** (razorpay/upi adapter + verified webhook — now on the hardened runtime) behind the go-live gate.
3. **Progress + receipt + error/empty/loading** states modeled on Ramp/MoonPay.
4. **KYC once** via didit, with clear status.
5. **Trust bar** (regulated posture, funds custody, powered-by).

## 8. Backend readiness
| Feature | Status | Evidence |
|---|---|---|
| SEP-24 deposit (on-ramp, mint/transfer) | | business-server `sep24.ts`, interactive UI, releases outbox |
| SEP-24 withdrawal (off-ramp detection) | | poller detects USDC + memo |
| Live quote / rate | | `/rate`, adapters/rate (cmc/mock) |
| KYC (SEP-12) | | `/customer` + didit adapter exist; **mock auto-approve default** |
| Real UPI deposit (fiat-in) | | razorpay/upi adapters + HMAC webhook exist; not go-live wired |
| Real payout (fiat-out) | | cashfree adapter + payout guard exist; not go-live wired |
| Transaction history/status | | `/admin/transactions` + SEP-24 tx state; customer BFF proxies biz |
| Multi-anchor discovery/routing | | aggregator quote/route/capabilities/transactions/start |
| Receipts | | derive from transaction; no receipt endpoint |
| Limits display | | assets.yaml limits; expose via `/rate` or strategy |

## 9. Implementation roadmap
- **C1.1 Buy flow** — INR amount → `/rate` quote → SEP-24 deposit → progress (mock PSP first).
- **C1.2 Sell flow** — USDC amount → quote → withdrawal + memo → payout progress.
- **C1.3 Progress/receipt/error/empty/loading** states (design system).
- **C1.4 KYC once** (didit) with status surface.
- **C1.5 History + receipts.**
- **C1.6 Go-live PSP wiring** (real UPI-in + payout, gated per AGENTS §7).
- **C1.7 Trust bar + FAQ/support + mobile polish.**

---
---

# PRODUCT 4 — NordStern Operations (internal)

## 1. Product vision
The **AWS Console / Stripe-internal** for our fleet: run 10 → 50 → 100 anchors with confidence. Approve businesses, watch fleet health + treasury, drive the provisioning queue, retry failures, respond to incidents. Today this is done by hand (`docker ps`, raw DB, aggregator API) — **there is no NordStern super-admin surface or role.**

## 2. Personas
- **NordStern ops/SRE (primary)** — fleet health, provisioning, incidents.
- **NordStern reviewer/compliance (primary)** — business approvals, anchor suspension.
- **NordStern finance (secondary)** — treasury across anchors, billing.

## 3. User journey
Review application → approve (KYB) → watch provisioning queue → confirm live → monitor fleet health/treasury → get alerted on a stuck anchor → drill into logs → retry/suspend → resolve incident.

## 4. Information architecture
```
admin.nordstern (staff-only, super-admin role)
  /approvals          application review queue → approve/reject
  /fleet              all anchors: status, health, treasury, pending
    /anchors/:id      detail: health, logs, alerts, actions
  /provisioning       queue + retry failed
  /treasury           cross-anchor float
  /compliance         cross-anchor case overview
  /incidents          alerts + runbook links
  /analytics          volume, growth, per-anchor
  /billing            usage (future)
  /audit              staff actions
```

## 5. Feature inventory
- **Must:** super-admin role; application approvals; fleet overview (status/health); provisioning queue + retry; anchor detail + logs.
- **Should:** cross-anchor treasury; alerts/incidents; anchor suspension; compliance overview; analytics.
- **Nice:** billing; automated diligence; SLA dashboards.

## 6. UX problems today
1. **No super-admin role** — RBAC is org-scoped only (`owner/admin/member/billing`, `constants.ts:11`). No NordStern-level surface.
2. Approvals are the unauthenticated bypass (shared with Product 1's fix).
3. Fleet visibility = manual `docker ps` + aggregator + DB.

## 7. Proposed improvements (prioritized)
1. **Super-admin role + staff surface** (new role dimension, reuse existing auth).
2. **Approvals queue** over `applications` (gated).
3. **Fleet overview** composed from **existing** control-plane anchors list + per-anchor `/health` + aggregator `/health` + `/admin/summary` + new structured logs.
4. **Provisioning queue + retry** over control-plane list/status + `anchor-invitations/status/:jobId/retry` (real).
5. **Incidents** over control-plane alerts (`/:anchorId/alerts`).

## 8. Backend readiness
| Feature | Status | Evidence |
|---|---|---|
| Application approvals | | `applications` approve exists — **gate it** |
| Super-admin role/surface | | org RBAC only; add staff role dimension |
| Fleet: anchor list + status | | control-plane anchors list/get/status; aggregator `/anchors` |
| Anchor health | | per-anchor `/health`, aggregator `/health`, `/admin/summary` |
| Provisioning queue + **retry** | | control-plane provision/status; `anchor-invitations/status/:jobId/retry` |
| Treasury (cross-anchor) | | per-anchor summary exists; aggregate view to build |
| Alerts / incidents | | control-plane `config/:anchorId/alerts` inject/resolve |
| Anchor suspension | | control-plane patch/delete exist; "suspend" semantics to add |
| Compliance overview | | per-anchor compliance endpoints; aggregate to build |
| Logs | | structured JSON + `X-Request-Id` (Phase 4) per anchor |
| Analytics | | derive from summaries/aggregator |
| Billing | | none |

## 9. Implementation roadmap
- **N1.1 Super-admin role + staff shell** (auth reuse; new role).
- **N1.2 Approvals queue** (over `applications`, gated).
- **N1.3 Fleet overview** (compose control-plane + aggregator + per-anchor health/summary).
- **N1.4 Anchor detail + logs** (health, alerts, structured logs).
- **N1.5 Provisioning queue + retry** (over real lifecycle + retry).
- **N1.6 Incidents/alerts** (over control-plane alerts).
- **N1.7 Cross-anchor treasury + compliance overview** (aggregate).
- **N1.8 Suspension** (patch/delete semantics).
- **N1.9 Analytics; N1.10 Billing** (later).

---
---

# Cross-product build order (recommendation)

1. **P0.1** Gate `applications/:id/approve` + org-scope `/admin` auth — *last money/provisioning holes; hours.*
2. **Product 2 (Operator Console) P1.1→P1.6** — *highest ROI + demo impact; screens over live APIs.*
3. **Product 4 (NordStern Ops) N1.1→N1.5** — *fleet control; mostly composition of existing endpoints.*
4. **Product 3 (Customer) C1.1→C1.5** — *polish the on/off-ramp; then C1.6 go-live PSP (gated).*
5. **Product 1 (Onboarding) B1.1→B1.6** — *funnel already works; polish + emails + KYB.*

**Guiding constraints honored:** every "must" maps to an existing endpoint wherever one exists; new backend is limited to the genuinely- items (KYB upload, reports CSV, receipts, super-admin role, billing) plus de-mocking `/summary`. No backend redesign.
