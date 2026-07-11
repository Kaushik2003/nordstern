# NordStern — Manual Product Test Plan

> **Master QA checklist before the first public deployment.** Every test here is
> grounded in **code that exists today** (audited 2026-07-09). Where a capability
> is missing, mocked, or read-only, it is marked **N/A (does not exist)** or
> ** partial** rather than invented — do not treat those as failures; treat them
> as *known scope*.
>
> This document is executed **manually by the founder** on a local environment.
> Nothing here automates a browser, provisions anything, or inspects logs — it is a
> checklist of **what to click and what you should see**.

---

## How to use this document

1. Bring up the environment per **§0 Global setup**.
2. Work top-to-bottom. Each test has a **Result** cell — fill it: `Pass` / `Fail` /
   `Blocked`, and write the issue in the **Issue found** space.
3. A test's **Priority** tells you what blocks deployment:
   - **P0** — must pass before *any* public deploy (money-safety, auth, isolation).
   - **P1** — important; fix before onboarding a real second anchor.
   - **P2** — polish; can trail deployment.
4. When a test references another (e.g. "requires a provisioned anchor from F-30"),
   run the prerequisite first.
5. Anything marked **N/A** is a feature that does not exist yet — skip it, but do
   **not** delete it: it documents scope boundaries a reviewer/investor may ask about.

**Legend:** works today · partial/known-gap · / **N/A** not built · security-critical

---

## §0 · Global setup & environment (do this first)

| ID | Pri | Steps | Expected | Result / Issue |
|----|-----|-------|----------|----------------|
| ENV-01 | P0 | Build base images and bring up the connected stack: `docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d --build` | All services start; no container in `Restarting` | Pass Fail — ____ |
| ENV-02 | P0 | `curl -s localhost:4000/health` (platform-api), `localhost:3002/health` (control-plane), `localhost:3005/health` (aggregator) | Each returns healthy JSON (`ok`/`up`) | Pass Fail — ____ |
| ENV-03 | P0 | Open platform console `http://localhost:4001` (platform-console container); open Traefik dashboard `http://localhost:8090` | Console landing renders; Traefik dashboard reachable | Pass Fail — ____ |
| ENV-04 | P1 | Confirm a real inbox / mail-catcher is reachable for OTP + approval emails (Resend sandbox or console log fallback) | You can retrieve OTP codes and the approval link | Pass Fail — ____ |
| ENV-05 | P1 | Confirm the Freighter browser extension is installed on a testnet account (customer Buy/Sell needs wallet signing) | Freighter present, set to **Testnet** | Pass Fail — ____ |
| ENV-06 | P2 | Note the admin credential: `ADMIN_USERNAME` / `ADMIN_PASSWORD` from the platform-api env | You can log into `/admin/login` | Pass Fail — ____ |

> **Auth model reminder (verify you understand before testing):** there are **three
> separate identity realms**, each with its own cookie and **no interchange**:
> **Operator/Founder** = email **OTP** (`ns_access`/`ns_refresh`), **Customer** =
> email **OTP** (`ns_customer`), **NordStern Admin** = a single **username/password**
> demo credential (`ns_admin`). **There are no passwords for founders/operators/
> customers, and no password-reset/email-verification flows** — those are **N/A**.

---

## §1 · Founder (business applying to become an Anchor)

**Surfaces:** `platform/console` → `/register` (3-step application wizard),
`/login` (OTP), `/redeem` (activation + live provisioning), `/(app)/overview`
(post-launch home), `/(app)/wallet` (SEP sandbox test tool).
**Backend:** `POST /api/v1/applications`, `GET /anchor-invitations/verify`,
`POST /anchor-invitations/redeem`, `GET /anchor-invitations/status/:jobId`, `/retry`.

### 1.1 Application wizard (`/register`)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| F-01 | P0 | ENV-01..03 | Open `/register`. Complete **Step 1 Business Profile** with valid company name + business email → Next | Advances to Step 2; sidebar marks Step 1 done | P F — ____ |
| F-02 | P0 | F-01 | **Step 2 Product & Rails**: fill product/rails fields → Next | Advances to Step 3 Review | P F — ____ |
| F-03 | P0 | F-02 | **Step 3 Review & Submit**: review, then Submit | "Application Submitted" confirmation screen renders | P F — ____ |
| F-04 | P0 | — | Verify submission hit the API: application now exists (visible later in admin queue, §2) | `POST /applications` returned 201; app appears in admin list | P F — ____ |
| F-05 | P1 | F-01 | On Step 1, leave required fields blank → try Next | Validation blocks advance; clear inline error | P F — ____ |
| F-06 | P1 | F-01 | Enter a malformed business email (`foo@`, `foo`, empty) → Next | Rejected with a friendly message; no submit | P F — ____ |
| F-07 | P1 | F-02 | Advance to Step 2, then click Step 1 in the sidebar | Can navigate **back** to a reached step; entered data retained | P F — ____ |
| F-08 | P1 | F-01 | On Step 1, try clicking Step 3 in the sidebar (a not-yet-reached step) | **Cannot** jump ahead past `furthestStep` | P F — ____ |
| F-09 | P2 | F-03 | After submit, refresh the page | Does not silently re-submit a duplicate; state is sane (see FAIL-09) | P F — ____ |
| F-10 | P1 | F-03 | Submit a **second** application with the same company email | Behaviour is defined (either accepted as new, or de-duped) — record what happens | P F — ____ |
| F-11 | P2 | — | Rapidly submit the wizard many times (rate-limit probe) | `applicationLimiter` throttles; 429 after threshold, friendly copy | P F — ____ |
| F-12 | P1 | F-03 | Read the "Submitted" screen as a first-time founder | Copy explains *what's next* + timeline; no dev jargon, no Stellar terms | P F — ____ |

> **N/A here:** dedicated **application-status/waiting page** for the applicant and
> **KYB/licence document upload** — neither exists (`FOUNDER_ONBOARDING_AUDIT` §2).
> The applicant learns of approval via **email**, not an in-app status page. Do not
> write tests expecting a live application-status dashboard for the founder.

### 1.2 Founder OTP sign-in (`/login`)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| F-13 | P0 | ENV-04 | On `/login`, enter your email → request code; retrieve OTP from email; enter it | Signed in; `ns_access`/`ns_refresh` cookies set; land on overview | P F — ____ |
| F-14 | P0 | — | Request OTP for an email that does **not** exist | Response is **always 200** ("code sent") — never reveals account existence | P F — ____ |
| F-15 | P0 | F-13 setup | Enter a **wrong** OTP code | Rejected; no session issued; can retry | P F — ____ |
| F-16 | P1 | — | Request a code, wait past expiry, then enter it | Expired code rejected with clear message (see FAIL-02) | P F — ____ |
| F-17 | P1 | — | Hammer `/auth/otp/request` and `/verify` repeatedly | `authLimiter` throttles (429); brute-force blunted | P F — ____ |
| F-18 | P2 | F-13 | Sign in on first-ever use passing `fullName` | Account created on first verify (`isNew:true`) with that name | P F — ____ |

### 1.3 Activation & real provisioning (`/redeem`)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| F-30 | P0 | Approval link from §2 (A-06) | Open the redeem link; page pre-checks the token (`/verify`) | Token valid → activation form renders with the invited email | P F — ____ |
| F-31 | P0 | — | Open `/redeem` with a **tampered/garbage** token | `verify` fails; page shows invalid/expired, no form | P F — ____ |
| F-32 | P1 | Expired invite | Open a redeem link older than the token TTL (7 days) | Rejected as expired | P F — ____ |
| F-33 | P0 | F-30 | Choose a **subdomain/slug**, branding (name/logo/theme), enter PSP credentials → Redeem | Returns a **jobId**; provisioning begins; no credential ever echoed back | P F — ____ |
| F-34 | P0 | F-33 | Inspect the redeem network response + page for the PSP secret you typed | Secret is **never** returned or displayed (goes to SecretStore) | P F — ____ |
| F-35 | P1 | F-33 | Choose a slug with invalid characters (spaces, uppercase, symbols) | Rejected/normalised with clear rules (see FAIL-12) | P F — ____ |
| F-36 | P1 | An anchor already at slug X | Redeem a second invite requesting slug **X** (duplicate) | Duplicate slug rejected; no half-provisioned collision (FAIL-13) | P F — ____ |
| F-37 | P0 | F-33 | Watch `/status/:jobId`: observe real stages (keygen → "Funding accounts & issuing asset on Stellar" → "Waiting for stack healthy" → completed) | Stages are **genuine** control-plane strings, not a fake progress bar | P F — ____ |
| F-38 | P0 | F-37 completed | On success, the console shows the **live anchor URLs** | Customer URL, Operator Console URL, API/SEP URL are shown and each opens | P F — ____ |
| F-39 | P0 | F-37 done | Verify the anchor is really live: `curl -H "Host:<slug>.anchors.localhost" localhost/.well-known/stellar.toml` | 200 with real SIGNING_KEY + asset | P F — ____ |
| F-40 | P0 | F-37 done | Confirm the aggregator auto-registered it: `curl localhost:3005/anchors` | New anchor present; `current_availability` becomes true after health poll | P F — ____ |

### 1.4 Provisioning failure & recovery

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| F-50 | P0 | Force a failure (e.g. stop control-plane mid-provision, or bad creds) | Redeem → provisioning fails | Job status → `failed` with an **error** surfaced; no orphaned "live" claim | P F — ____ |
| F-51 | P0 | F-50 | Call retry: `POST /anchor-invitations/status/:jobId/retry` (or the UI retry) | Job re-drives; on a healthy env it reaches `completed` | P F — ____ |
| F-52 | P1 | F-50 | After a failed+rolled-back provision, inspect Docker + DBs | Stack removed and `anchordb_<slug>` dropped (rollback clean; idempotent retry) | P F — ____ |
| F-53 | P1 | F-33 in progress | Restart **platform-api** mid-provision | Known gap: platform poller is in-process — control-plane keeps going but the job may stall. Record actual behaviour + whether retry recovers | P F — ____ |
| F-54 | P2 | F-37 | Refresh the status page / close-reopen the browser mid-provision | Status resumes correctly from the server (poll is stateless) | P F — ____ |

### 1.5 Post-launch home & sandbox

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| F-60 | P1 | F-38 | Open `/(app)/overview` as the founder | Renders real data or an honest empty state (no faker) | P F — ____ |
| F-61 | P2 | F-38 | Open `/(app)/wallet` (SEP Sandbox) — run stellar.toml → Friendbot → SEP-10 → interactive | Sandbox test tool works against your slug. **Note:** ships a hardcoded default subdomain/currency — confirm it's overridable and not presented as production founder UX | P F — ____ |

---

## §2 · NordStern Internal Admin

**Surface:** `platform/console` → `/admin/login`, `/admin` (Anchor applications
review table). **Backend:** `POST /admin/login`, `GET /admin/applications`,
`POST /admin/applications/:id/approve`, `POST /admin/applications/:id/reject`.

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| A-01 | P0 | ENV-06 | `/admin/login` with the correct admin username/password | `ns_admin` cookie issued; admin table loads | P F — ____ |
| A-02 | P0 | — | `/admin/login` with a wrong password | Rejected ("Invalid admin credentials"); no cookie | P F — ____ |
| A-03 | P0 | — | Hit `/admin` (or `GET /admin/applications`) with **no** admin cookie | Redirected to `/admin/login`; API 401 | P F — ____ |
| A-04 | P0 | Logged-in **operator/founder** cookie only | Try to reach `/admin/applications` with an `ns_access` (operator) cookie | Rejected — operator identity **cannot** cross into admin realm | P F — ____ |
| A-05 | P0 | A-01, F-04 | View the applications queue | All submitted applications listed newest-first with status badges | P F — ____ |
| A-06 | P0 | A-05 | Click **Approve** on a pending application | Status → approved; modal shows the **redeem link/token** (shown once); email dispatched | P F — ____ |
| A-07 | P0 | A-05 | Click **Reject** on a pending application | Status → rejected; no invitation minted; "application update" email sent | P F — ____ |
| A-08 | P1 | A-06 | Copy the redeem link from the modal | Copy works; link matches the founder redeem URL (feeds F-30) | P F — ____ |
| A-09 | P1 | A-06 | Approve the **same** application twice | Second approve is idempotent/blocked — no duplicate live invitation confusion | P F — ____ |
| A-10 | P1 | A-01 | Approve several different applications → onboard multiple anchors | Each yields its own invite; multi-anchor onboarding works serially | P F — ____ |
| A-11 | P1 | A-01 | Click **Sign out** | `ns_admin` cleared; back to `/admin/login`; table no longer reachable | P F — ____ |
| A-12 | P2 | A-05 | With zero applications, view the queue | Honest "No applications yet" empty state | P F — ____ |
| A-13 | P1 | — | Brute-force `/admin/login` repeatedly | `authLimiter` throttles the demo credential | P F — ____ |

> **N/A for the Admin persona (do not test — these do not exist):**
> **Request-changes** transition (only *approve* / *reject* exist), a **document
> viewer** (no KYB upload), and a **Fleet / Health / Monitoring / Logs dashboard**.
> The admin console is an **applications review table only** — there is no
> super-admin fleet view of running anchors. "Provision" and "Retry provisioning"
> are **founder-side** actions (redeem/retry), **not** admin-panel buttons.

---

## §3 · Anchor Operator (per-anchor console)

**Surface:** `anchor-template/console` at `console-<slug>.anchors.localhost` — screens:
`overview, transactions, customers, treasury, compliance, pricing, api-keys,
webhooks, reports, settings, team, activity, audit, credentials, login`.
**Backend:** business-server `/admin/*` (org-scoped `requireOperator`) + platform-api
`/api/v1/*` proxy. **Auth:** operator email **OTP** (same realm as founder).

> **Before testing §3, read the truthfulness caveats** at the end of this
> section — several endpoints historically fabricated data or shipped demo seeds.
> Part of this pass is **verifying those were de-mocked**. If you see suspiciously
> clean demo rows on a brand-new anchor, that is a **Fail** (FAIL-SEED).

### 3.1 Operator sign-in & shell

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| O-01 | P0 | F-38 anchor live | Open `console-<slug>.anchors.localhost/login`; sign in with operator email OTP | Signed in; console resolves its `{orgId, anchorId, role}` via `/anchors/resolve` | P F — ____ |
| O-02 | P0 | — | Hit any `(app)` route with no session | Redirected to `/login`; no data leaks | P F — ____ |
| O-03 | P1 | O-01 | Confirm the console is branded to **this** anchor (name/logo/theme) | Branding matches what was set at provision (F-33) | P F — ____ |

### 3.2 Modules (verify each renders REAL data or an honest empty state)

| ID | Pri | Screen | Steps | Expected | Result / Issue |
|----|-----|--------|-------|----------|----------------|
| O-10 | P0 | Overview | Open Overview | Real treasury (Horizon), tx counts/volume (Platform API), live health; `fiat.bank*` shows **"not connected"** (null, honest) | P F — ____ |
| O-11 | P0 | Transactions | Open Transactions | Real normalized SEP-24 txns; empty state if none | P F — ____ |
| O-12 | P0 | Transactions | On a stuck deposit, click **Retry** | Re-drives `releaseDeposit`; audit recorded; no double-send (see §6 money-safety) | P F — ____ |
| O-13 | P1 | Transactions | Click **Refund** on a transaction | Patches AP → `error`/refunded + audit | P F — ____ |
| O-14 | P0 | Treasury | Open Treasury | Real USDC float/KPIs from Horizon | P F — ____ |
| O-15 | P0 | Treasury | Click **Emergency stop / Pause** | Toggles `strategy.emergencyStop`; subsequent customer Buy is blocked (see C-32) | P F — ____ |
| O-16 | P1 | Treasury | Click **Sweep** | Audit-only action (no bank rail moves funds) — UI must **label it as audit-only**, not imply a real transfer | P F — ____ |
| O-17 | P0 | Pricing & Strategy | View + edit fees/limits (fixed/percent, min/max deposit, max single tx, daily volume, thresholds) → Save | Versioned insert + audit; new values take effect on next quote | P F — ____ |
| O-18 | P0 | Customers | Open Customers | **Verify de-fabrication:** only real derived fields (account id, txCount, lifetime volume, last seen) + real KYC status. **No** hardcoded email/phone/city/tier/risk/matchScore | P F — ____ |
| O-19 | P0 | Compliance | Open Compliance cases | Real `compliance_cases`; **no demo-seeded 4 cases** on a fresh anchor; no synthesized PII | P F — ____ |
| O-20 | P1 | Compliance | Resolve a case (status/note) | Persists + audit | P F — ____ |
| O-21 | P0 | Audit | Open Audit log | Real hash-chained `audit_logs`; **no demo-seeded 5 rows** on a fresh anchor | P F — ____ |
| O-22 | P0 | API Keys | List keys | **Verify list returns MASKED only** (no plaintext secret on list); **no demo-seeded 2 keys** | P F — ____ |
| O-23 | P1 | API Keys | Create a key | Plaintext shown **once** on creation only; then masked | P F — ____ |
| O-24 | P1 | API Keys | Roll / delete a key | Roll returns new plaintext once; delete removes it | P F — ____ |
| O-25 | P1 | Webhooks | Open Webhook deliveries | Historically a hardcoded 3-item mock over an empty real table — **verify it now reads the real (likely empty) table** and shows an honest empty state, not fake deliveries | P F — ____ |
| O-26 | P1 | Reports | Open Reports; try export | Figures computed client-side from summary+transactions; **export button disabled with an explanation** (no CSV endpoint) — not a fake download | P F — ____ |
| O-27 | P1 | Settings | Open Settings | Displays current branding/config **read-only**; **live branding edit is N/A** (set once at provision) — confirm it's not presented as editable-but-broken | P F — ____ |
| O-28 | P1 | Team | Open Team; invite a member; change a role; revoke | platform-api members/invitations endpoints work; roles enforced | P F — ____ |
| O-29 | P1 | Activity | Open Activity | Renders real org/anchor activity or honest empty state | P F — ____ |
| O-30 | P0 | Credentials | Open Credentials; set/replace a PSP credential | Write-only to SecretStore; existing value never displayed back | P F — ____ |

### 3.3 Empty states & permission boundaries

| ID | Pri | Steps | Expected | Result / Issue |
|----|-----|-------|----------|----------------|
| O-40 | P1 | On a brand-new anchor with zero activity, visit **every** module | Each shows an honest empty state — **never** faker/demo rows (FAIL-SEED) | P F — ____ |
| O-41 | P0 | As a non-owner/limited-role member, attempt owner-only actions (roll keys, change roles, edit strategy) | Blocked per `requireRole`/membership; clear "not permitted" | P F — ____ |
| O-42 | P0 | See §5 for **cross-anchor** operator isolation (Operator of anchor A cannot read anchor B) | — | P F — ____ |

> **Truthfulness caveats (from `OPERATOR_CONSOLE_AUDIT`) — these were the known
> fabrications; this pass VERIFIES they're fixed:** `GET /users` fabricated
> PII/tier/risk (O-18); `compliance_cases` (4), `audit_logs` (5), `api_keys` (2)
> shipped as **demo seeds** on fresh anchors (O-19/21/22, O-40); `GET /developer/keys`
> returned **plaintext** on list (O-22); `webhooks/deliveries` was a **hardcoded mock**
> (O-25); no CSV export (O-26); no live branding edit (O-27); `treasury/sweep` is
> audit-only (O-16); `fiat.bank*` is null "not connected" (O-10). **Any of these
> still faking data on a fresh anchor = Fail.**

---

## §4 · Customer (end-user on/off-ramp)

**Surface:** `anchor-template/anchor-client` at `<slug>.anchors.localhost` — screens:
`login, home, buy, sell, verify (KYC), profile, support, transactions, transactions/[id]`.
**Auth:** customer email **OTP** (`ns_customer`). **Money move:** self-custodial —
the customer's **own wallet (Freighter)** signs a "secure confirmation" (SEP-10 under
the hood) to authorise settlement; payment via Razorpay; KYC via DIDIT hosted flow.

### 4.1 Customer OTP, profile, wallets

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| C-01 | P0 | F-38 anchor live, ENV-04 | Open `<slug>.anchors.localhost/login`; request OTP; enter code | Signed in; `ns_customer` cookie set; land on Home | P F — ____ |
| C-02 | P0 | — | Request OTP for a non-existent email | Always 200 ("code sent"); no enumeration | P F — ____ |
| C-03 | P0 | — | Enter a wrong / expired OTP | Rejected; no session | P F — ____ |
| C-04 | P1 | — | Spam `/customer/auth/request-otp` (>20 in 15 min) | `otpLimiter` throttles (429) | P F — ____ |
| C-05 | P1 | C-01 | Open Profile; edit full name / preferences → save | `PATCH /customer/me` persists; reflected on reload | P F — ____ |
| C-06 | P0 | C-01, ENV-05 | Add a linked wallet (address + label) | `POST /customer/wallets` stores it (testnet); appears in list | P F — ____ |
| C-07 | P1 | C-06 | Remove a linked wallet | Deleted; list updates | P F — ____ |
| C-08 | P1 | Two customer accounts | As customer B, try to delete customer A's wallet id | Rejected — wallets are scoped to the authenticated customer | P F — ____ |

### 4.2 KYC (`/verify`)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| C-20 | P0 | C-01 | Open Verify; check status | `GET /customer/kyc/status` shows current (unverified initially) | P F — ____ |
| C-21 | P0 | C-20 | Start KYC → completes the **DIDIT hosted** flow | `POST /customer/kyc/start` returns hosted URL; after DIDIT webhook, status → approved | P F — ____ |
| C-22 | P0 | C-21 | Confirm the client can **only read** status, never self-declare | No client path sets KYC to approved; only the DIDIT-signed webhook (server) does | P F — ____ |
| C-23 | P1 | KYC rejected in DIDIT | Complete DIDIT with a rejecting outcome | Status → not approved; Buy remains blocked (C-31) | P F — ____ |
| C-24 | P1 | Customer verified on anchor A | Sign in to a **different** anchor as the same customer | Central profile KYC is reused (cross-anchor "verify once") — confirm status carries per the propagation design | P F — ____ |

### 4.3 Buy (on-ramp)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| C-30 | P0 | C-01 | Open Buy; type an amount | Live quote updates (`/biz/api/quote?side=buy`): INR amount + rate, debounced | P F — ____ |
| C-31 | P0 | KYC not approved | Try to proceed past amount | Blocked with a "verify first" prompt (KYC gate) | P F — ____ |
| C-32 | P0 | Operator set Emergency stop (O-15) | Try to Buy | Blocked by strategy gate; friendly "temporarily unavailable" | P F — ____ |
| C-33 | P0 | KYC approved, ENV-05 | Confirm → **connect wallet** → **authorise** ("Confirm securely in your wallet") | Freighter prompts to sign; on sign, a settlement session is obtained (no Stellar jargon shown) | P F — ____ |
| C-34 | P0 | C-33 | Proceed to **Pay** → Razorpay checkout → complete test payment | `startBuy` returns paymentUrl; payment succeeds; HMAC verify server-side | P F — ____ |
| C-35 | P0 | C-34 | Watch **Processing** | Status polls advance: awaiting_payment → payment_received → processing → completing → **Money added** | P F — ____ |
| C-36 | P0 | C-35 done | See the **receipt / done** screen | Shows amount added, plain-language confirmation; no memo/hash/testnet leaking on the main view | P F — ____ |
| C-37 | P0 | C-34 | Attempt to **double-submit / double-click** the pay/confirm, or re-drive | Exactly **one** settlement; the outbox/idempotency guard prevents a double credit (see §6) | P F — ____ |
| C-38 | P1 | C-30 | Enter amount below min or above max/limits | Rejected per strategy limits with a clear message | P F — ____ |
| C-39 | P1 | C-33 | Cancel the wallet signature / decline in Freighter | Flow aborts cleanly; no partial transaction; can retry | P F — ____ |
| C-40 | P1 | C-34 | Cancel/close the Razorpay checkout without paying | No credit; transaction stays awaiting/cancelled; recoverable | P F — ____ |

### 4.4 Sell (off-ramp)

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| C-50 | P0 | C-01, wallet with token | Open Sell; type amount | Live quote (`side=sell`) updates | P F — ____ |
| C-51 | P0 | C-50 | Proceed → authorise → follow **instructions** (send token with memo) | `startSell` returns instructionsUrl; treasury address + memo presented as a simple instruction | P F — ____ |
| C-52 | P0 | C-51 | Send the token; observe detection | Observer detects the incoming payment by memo | P F — ____ |
| C-53 | P0 | C-52 | Watch payout | Fiat payout is **mock** (no live Cashfree creds) — confirm it does **not** claim a real bank transfer; **at-most-once** payout guard holds (no double payout) | P F — ____ |
| C-54 | P1 | C-51 | Send a **wrong memo** / wrong amount | Not mis-credited; handled/flagged, not silently lost | P F — ____ |

### 4.5 History, support, session

| ID | Pri | Preconditions | Steps | Expected | Result / Issue |
|----|-----|---------------|-------|----------|----------------|
| C-60 | P0 | C-35 | Open Transactions list | `/biz/customer/transactions` scoped to this customer; shows real txns | P F — ____ |
| C-61 | P0 | C-60 | Open a transaction detail `[id]` | Correct amounts/status in customer language; advanced (memo/hash) tucked away | P F — ____ |
| C-62 | P0 | Two customers with txns | As customer B, request customer A's transaction id via URL | 404/forbidden — history is customer-scoped, no leakage | P F — ____ |
| C-63 | P2 | C-01 | Open Support | Renders (contact/help). Record whether it's static or wired | P F — ____ |
| C-64 | P0 | C-01 | Log out | `ns_customer` cleared; protected screens redirect to login | P F — ____ |
| C-65 | P1 | C-01 | Close browser, reopen `<slug>...` | Session persists within cookie lifetime; expired → re-login (see SEC-08) | P F — ____ |
| C-66 | P1 | C-01 | Open Buy and Home in **two tabs**; act in both | No state corruption across concurrent tabs | P F — ____ |

---

## §5 · Multi-tenant isolation (the core white-label claim)

**Goal:** prove that multiple provisioned anchors are fully isolated — brand, data,
sessions, treasury, keys — with **zero cross-tenant leakage**. Traefik routes each
anchor by **Host** (`<slug>.anchors.localhost`); each has its own `anchordb_<slug>`,
keys, and SecretStore refs.

**Setup MT-00 (P0):** provision **four** anchors via the full flow (§2→§1.3):
`mizupay`, `zen`, `orbita`, `nova` — each with a **distinct** name, logo, and theme.

| ID | Pri | Steps | Expected | Result / Issue |
|----|-----|-------|----------|----------------|
| MT-01 | P0 | Open each customer app `<slug>.anchors.localhost` | Each shows its **own** brand name, logo, theme — never another's | P F — ____ |
| MT-02 | P0 | Open each operator console `console-<slug>...` | Correct per-anchor branding + data | P F — ____ |
| MT-03 | P0 | Log into MizuPay operator console; then in the same browser open Zen's console URL | Zen requires its **own** login; MizuPay's session does **not** authorise Zen | P F — ____ |
| MT-04 | P0 | As MizuPay operator, try to hit Zen's business-server `/admin/*` (via URL/API) | Org-scoped `requireOperator` blocks — no cross-anchor admin data | P F — ____ |
| MT-05 | P0 | Compare transactions/customers across two anchors | No transaction, customer, or compliance row bleeds between anchors (separate DBs) | P F — ____ |
| MT-06 | P0 | Compare treasuries | Each anchor has a **distinct** treasury account/float; funds never shared | P F — ____ |
| MT-07 | P0 | Create an API key in MizuPay; try to use it against Zen | Key is anchor-scoped; rejected by Zen | P F — ____ |
| MT-08 | P0 | Inspect cookies for two anchor apps open at once | Cookies are host-scoped; a customer signed into MizuPay is **not** signed into Zen | P F — ____ |
| MT-09 | P1 | Compare Reports/Settings per anchor | Figures + config reflect only that anchor | P F — ____ |
| MT-10 | P1 | Inspect each anchor's signing/distribution/issuer keys | Distinct per anchor; encrypted at rest (`anchor_secrets`, AES-GCM); never exposed in UI/API | P F — ____ |
| MT-11 | P1 | Set Emergency stop on MizuPay | Only MizuPay Buy is paused; Zen/Orbita/Nova unaffected | P F — ____ |
| MT-12 | P0 | As a **customer** of MizuPay, try to view Zen customer data / transactions | Fully isolated; no cross-anchor customer leakage | P F — ____ |

> **Aggregator seed check (FAIL-SEED-AGG, P1):** `GET localhost:3005/anchors`
> historically seeds demo rows `globex` + `acme` (available=false, fake domains).
> Confirm whether these still appear; they must not be presented as real anchors.

---

## §6 · Failure, recovery & money-safety scenarios (cross-cutting)

The money-safety guarantees live in `anchor-template/business-server` (Transfer-After-
Commit **outbox** + reconciler for deposits, **at-most-once** withdrawal payout). These
tests prove **money cannot be duplicated or lost** across crashes and retries.

| ID | Pri | Scenario | Steps | Expected | Result / Issue |
|----|-----|----------|-------|----------|----------------|
| FAIL-01 | P0 | Wrong OTP | Enter a bad code on any OTP login | Rejected; no session; retryable (F-15/C-03/A-02) | P F — ____ |
| FAIL-02 | P0 | Expired OTP | Use a code after its TTL | Rejected as expired; new code required | P F — ____ |
| FAIL-03 | P1 | Network timeout | Kill network mid-quote / mid-submit | Graceful error + retry; no stuck spinner forever | P F — ____ |
| FAIL-04 | P1 | Refresh mid-flow | Refresh during Buy processing (C-35) | State recovered from server; no double credit | P F — ____ |
| FAIL-05 | P1 | Browser close mid-flow | Close during processing; reopen | Transaction resumes/settles correctly | P F — ____ |
| FAIL-06 | P0 | **Deposit double-send** | Trigger release, then retry (operator retry O-12, or reconciler) for the same tx | **Exactly one** on-chain transfer — outbox single-winner claim + adopt-existing prevents a second (`releases.ts`) | P F — ____ |
| FAIL-07 | P0 | **Crash mid-release** | Stop business-server between send and completion; restart | Reconciler resolves: adopts the landed transfer or re-drives a never-landed one — no double-spend, no stuck-forever | P F — ____ |
| FAIL-08 | P0 | **Withdrawal double-payout** | Re-drive a withdrawal payout | At-most-once guard: no second payout | P F — ____ |
| FAIL-09 | P1 | Duplicate application submit | Re-submit the wizard / refresh after submit (F-09/F-10) | No confusing duplicate that breaks the admin queue | P F — ____ |
| FAIL-10 | P0 | Double-click pay/confirm | Rapidly double-click the customer confirm/pay | Idempotent — one settlement only (C-37) | P F — ____ |
| FAIL-11 | P1 | Wallet disconnected | Disconnect Freighter mid-Buy | Clear prompt to reconnect; no partial state (C-39) | P F — ____ |
| FAIL-12 | P1 | Invalid slug | Redeem with a malformed slug (F-35) | Rejected with rules; no half-provision | P F — ____ |
| FAIL-13 | P0 | Duplicate slug | Redeem two invites for the same slug (F-36) | Second rejected; no container/DB name collision | P F — ____ |
| FAIL-14 | P1 | Provisioning timeout | Let a provision hang past health timeout | Job → failed with error; retry available (F-50/51) | P F — ____ |
| FAIL-15 | P1 | Service restart | Restart control-plane / aggregator / platform-api individually | Each recovers; running anchors keep serving SEP; record any stalled job (F-53) | P F — ____ |
| FAIL-16 | P0 | Payment cancelled | Abandon Razorpay checkout (C-40) | No credit; transaction not falsely completed | P F — ____ |
| FAIL-17 | P1 | KYC rejected | DIDIT returns reject (C-23) | Buy stays blocked; status honest | P F — ____ |
| FAIL-SEED | P1 | Demo-seed check | On a **fresh** anchor, inspect compliance/audit/api-keys/customers | **No** seeded demo rows anywhere (O-40) | P F — ____ |

---

## §7 · Security checks ( manual validation)

| ID | Pri | Area | Steps | Expected | Result / Issue |
|----|-----|------|-------|----------|----------------|
| SEC-01 | P0 | Realm isolation | Take an `ns_access` (operator) cookie; call admin + customer routes | Rejected by both — realms never interchange (A-04) | P F — ____ |
| SEC-02 | P0 | Customer isolation | With an `ns_customer` cookie, call operator `/admin/*` and platform `/organizations/*` | Rejected — customer can't reach operator/admin surfaces | P F — ____ |
| SEC-03 | P0 | Admin isolation | With `ns_admin`, try operator/customer money endpoints | Rejected — admin realm is review-only | P F — ____ |
| SEC-04 | P0 | Tenant isolation | Cross-anchor operator + customer probes | Fully blocked (MT-04/05/12) | P F — ____ |
| SEC-05 | P0 | Cookie scope | Inspect each cookie's Host/SameSite; confirm host-only, not shared across subdomains inappropriately | Cookies scoped so anchor A's session ≠ anchor B (MT-08) | P F — ____ |
| SEC-06 | P0 | Secret exposure | Grep every API response + page for PSP secrets, signing seeds, plaintext API-key secrets on list | **None** ever exposed (F-34, O-22, O-30, credentials write-only) | P F — ____ |
| SEC-07 | P0 | URL/API tampering | Change org/anchor/tx/customer/wallet ids in URLs and API calls to another tenant's/user's | Authorization blocks every attempt (IDOR-proof) | P F — ____ |
| SEC-08 | P0 | Session expiration | Let an access token expire; act; then let refresh expire | Access auto-refreshes via `/auth/refresh`; once refresh dies → forced re-login | P F — ____ |
| SEC-09 | P1 | Browser back after logout | Log out, press browser Back to a protected page | No cached protected data usable; redirected to login | P F — ____ |
| SEC-10 | P1 | Invitation token reuse | Redeem an invitation twice | Single-use — second redeem rejected | P F — ____ |
| SEC-11 | P1 | Rate limits | Exercise auth/application/provision/poll limiters | Each throttles (429) at its threshold | P F — ____ |
| SEC-12 | P0 | KYC self-declaration | From the customer client, attempt to set KYC=approved directly | Impossible — only the service-secret internal route (post DIDIT webhook) can (C-22) | P F — ____ |
| SEC-13 | P1 | Non-custodial invariant | Confirm no NordStern-controlled account ever pools customer funds | Money path is wallet ⇄ anchor treasury ⇄ rails only; platform/aggregator never touch funds | P F — ____ |

---

## §8 · UX review (ask these on EVERY screen)

For each surface — Landing, Founder register/redeem/overview, Admin, Operator console
(all modules), Customer app (all screens) — record Yes/No + notes:

| ID | Pri | Question | Result / Notes |
|----|-----|----------|----------------|
| UX-01 | P1 | Can a **first-time fintech founder** understand this screen without help? | Y N — ____ |
| UX-02 | P1 | Can a **non-technical customer** understand this screen? | Y N — ____ |
| UX-03 | P0 | Does anything expose **Stellar / blockchain** terms (USDC, memo, trustline, tx hash, testnet, SEP-24, account G...)? | None Leaks — ____ |
| UX-04 | P1 | Does anything expose **developer terminology** (jobId, slug, API paths, JSON)? | None Leaks — ____ |
| UX-05 | P1 | Does anything feel **unfinished** (placeholder text, dead buttons, TODO)? | N Y — ____ |
| UX-06 | P1 | Any **inconsistency** (spacing, tone, brand colours, button styles)? | N Y — ____ |
| UX-07 | P1 | Any **unnecessary friction** (extra clicks, unclear next step)? | N Y — ____ |
| UX-08 | P0 | Would I **trust this with money**? (clarity of amounts, confirmations, receipts) | Y N — ____ |
| UX-09 | P2 | Do **error states** read like a product (not a stack trace)? | Y N — ____ |
| UX-10 | P2 | Do **empty states** guide the next action (not just "no data")? | Y N — ____ |

**Known jargon-leak hotspots to scrutinise (from `CUSTOMER_MONEY_FLOW_AUDIT`):** the
server-rendered SEP-24 webview historically leaked `USDC`, `memo`, treasury `address`,
`trustline`, `transaction hash`, `testnet`, `SEP-24`. The native customer app should
have replaced these — UX-03 is where you confirm it.

---

## §9 · Investor demo rehearsal (timeboxed)

**Target: one clean pass in ≤ 12 minutes.** Rehearse until it's muscle memory.

| ID | Pri | Beat | Time | What to show | Result / Issue |
|----|-----|------|------|--------------|----------------|
| DEMO-01 | P0 | Landing | 0:30 | Open the landing site — the positioning ("launch a compliant anchor without building the stack") | P F — ____ |
| DEMO-02 | P0 | Founder applies | 1:30 | `/register` 3-step wizard → "Application Submitted" | P F — ____ |
| DEMO-03 | P0 | Admin approves | 1:00 | `/admin` → Approve → copy redeem link | P F — ____ |
| DEMO-04 | P0 | Activate + provision | 2:30 | `/redeem` → slug/branding/creds → **real** provisioning stages → "Anchor is live" + URLs | P F — ____ |
| DEMO-05 | P0 | Anchor is live | 0:30 | Open the fresh customer app + operator console (own brand) | P F — ____ |
| DEMO-06 | P0 | Customer buys | 2:30 | Customer OTP → (KYC if needed) → Buy → wallet confirm → Razorpay → **Money added** | P F — ____ |
| DEMO-07 | P0 | Settlement visible | 0:30 | Customer receipt + Transactions | P F — ____ |
| DEMO-08 | P0 | Operator sees it | 1:00 | Operator console → Transactions shows the customer's deposit; Treasury moved | P F — ____ |
| DEMO-09 | P1 | Reports | 0:30 | Operator Reports/Overview rollups | P F — ____ |
| DEMO-10 | P1 | Isolation punchline | 1:00 | Show a **second** anchor with different brand + separate data | P F — ____ |

### Demo risks (mitigate before presenting)

| Risk | Why it bites | Mitigation |
|------|--------------|------------|
| Provisioning slow/flaky live | Real Docker + Friendbot + health polling can take minutes | Pre-provision a spare anchor; have DEMO-04 as "here's one I prepared" fallback |
| Testnet reset wiped keys/asset | Testnet resets quarterly (DL-003) | Re-run setup before the demo; verify F-39 the morning of |
| OTP email delivery lag | Demo stalls waiting for a code | Use a fast mail-catcher or pre-seed the account; know the log fallback |
| Freighter not on testnet | Buy signature fails | ENV-05 checked; wallet funded via Friendbot |
| Razorpay sandbox hiccup | Payment step stalls | Have test card details ready; know the cancel/retry path |
| Off-ramp looks "fake" | Payout is mock (C-53) | Frame Sell honestly as detection + simulated payout; lead with Buy |
| Demo-seed / fake rows appear | Historic seeds (FAIL-SEED) | Verify O-40 on the demo anchor beforehand |
| Aggregator shows `globex`/`acme` | Seed rows | Confirm FAIL-SEED-AGG; hide or remove before showing the registry |
| Cross-tenant confusion | Two anchors, one browser | Use separate browser profiles/incognito per anchor |

---

## Appendix A · Explicitly NOT APPLICABLE (features that do not exist)

Do **not** write or expect tests for these — they are documented scope boundaries,
not failures:

- **Passwords / password reset / email verification** for founders, operators, or
  customers — the platform is **OTP-only** (`auth.routes.ts`, `customer.routes.ts`).
- **Application "request changes"** transition — admin has only **approve** / **reject**.
- **KYB / licence document upload & viewer** — no backend (`FOUNDER_ONBOARDING_AUDIT`).
- **Founder application-status / waiting page** — approval is communicated by email.
- **Admin Fleet / Health / Monitoring / Logs dashboard** — the admin console is an
  applications review table only.
- **Live branding/settings editing** in the operator console — branding is set once at
  provision; Settings is read-only (`OPERATOR_CONSOLE_AUDIT` gap 5).
- **CSV/report export endpoint** — Reports are computed client-side; export is disabled.
- **Real fiat off-ramp payout** — Sell payout is **mock** (no live Cashfree creds).
- **Bank balance / reserved / daily-settlement** figures — no bank integration (null).
- **Production TLS / public domain / K8s** — dev runs Traefik `:80` on `.localhost`;
  `anchor-template/infra` (EKS/Helm/ArgoCD) is authored but **not wired to runtime**.

## Appendix B · Known data-truthfulness risks to re-verify (were fabricated once)

These were real fabrications called out in prior audits; this test pass **verifies
they are fixed** (see linked tests). If any still fakes data → **Fail**:

| Item | Old behaviour | Verify in |
|------|---------------|-----------|
| Customers `/users` PII/tier/risk | Hardcoded fakes | O-18 |
| Compliance cases | 4 demo seeds + synthesized PII | O-19 |
| Audit log | 5 demo seeds | O-21 |
| API keys | 2 demo seeds + **plaintext on list** | O-22 |
| Webhook deliveries | Hardcoded 3-item mock | O-25 |
| Aggregator registry | Seeds `globex` + `acme` | FAIL-SEED-AGG |
| Aggregator FX | Hardcoded `FX_RATE_INR_USDC` (~88.5) | note during C-30/C-50 |

---

*Grounded in a full repository audit on 2026-07-09. When a feature ships or a gap is
closed, update this plan and `PRODUCT_ACCEPTANCE_CRITERIA.md` in the same change.*
