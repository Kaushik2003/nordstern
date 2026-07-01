# NordStern — Roadmap

Phased plan from **one working anchor** to **multi-anchor infrastructure**.
Companion to `AGENTS.md` §10. Each phase assumes the seams built in earlier phases
(see `ARCHITECTURE.md` §4). **Do not skip ahead** — finishing one real end-to-end
flow beats scaffolding the whole SaaS.

Legend: ✅ done · 🚧 in progress · ⬜ not started.

---

## Phase 0 — Foundation: one anchor on testnet
*Goal: a single anchor we operate, proving the SEP-24 loop, structured to
generalize later.*

- ✅ Anchor Platform (SEP-1/10/12/24) running via Docker against testnet.
- ✅ business-server implements Platform callbacks (`unique_address`, `fee`,
  `customer`) and SEP-24 interactive UI.
- ✅ Deposit mints `ANCH` to the user's Stellar wallet end-to-end.
- ✅ Withdrawal: Observer detects the returned `ANCH` payment by memo.
- ✅ control-plane skeleton (auth/tenants/config/admin) + Postgres.
- ✅ Functional wallet + operator dashboard (`anchor-service/frontend`).
- 🚧 KYC and fiat in/out are **mocked** — acceptable for Phase 0.

**Exit criteria:** deposit and withdrawal complete on testnet from a real wallet;
decisions recorded in `anchor-service/docs/decision-log.md`.

---

## Phase 1 — Real rails behind adapters (still sandbox/testnet)
*Goal: replace mocks with real providers without letting vendors leak into core
flow logic. Everything stays sandbox.*

- ⬜ Define adapter interfaces: `KycProvider`, `DepositProvider`, `PayoutProvider`
  (mock impl remains the default).
- ⬜ **KYC:** HyperVerge (or Signzy) behind `KycProvider`; wire SEP-12 to real
  verification status; store the minimum PII (respect Q5).
- ⬜ **UPI deposit:** `upi://pay` intent (mobile) + QR fallback (desktop) in the
  SEP-24 webview; backend verification of payment before mint.
- ⬜ **Fiat payout:** Cashfree Payouts / RazorpayX behind `PayoutProvider`
  (sandbox); real **webhook signature verification** + backend re-verification;
  release fiat on Observer match. Follow `frontend/.claude/skills/` + `AGENTS.md` §7.
- ⬜ Fee/spread quoting in the `fee` callback (replace the `0` stub).

**Exit criteria:** a full deposit and withdrawal each run through real *sandbox*
providers end-to-end, mock still selectable via config.

---

## Phase 2 — Operator productization
*Goal: make the anchor operable by a real business.*

- ⬜ Converge the functional dashboard with the "Keel" console design
  (`frontend/PRD.md`): treasury, money-in/money-out, KPIs — on **live** data.
- ⬜ Operator-configurable spread/fees/limits (writes to config safely).
- ⬜ Transaction operations: search, detail, retry/refund handling, reconciliation.
- ⬜ Compliance/trust views: KYC status, reserves/backing, AML flags.
- ⬜ Developer surface: API keys, webhook config, endpoint health.

**Exit criteria:** an operator can run day-to-day money movement from the console
without touching the CLI.

---

## Phase 3 — Multi-anchor infrastructure
*Goal: promote the single anchor into a template others can be onboarded onto.*

- ⬜ Real tenancy in `control-plane`: scope assets, keypairs, transactions, and
  config by tenant id (the seam left in Phases 0–2).
- ⬜ Per-anchor keypair provisioning and isolated config.
- ⬜ Subdomain-based launch so anchors don't configure their own domain.
- ⬜ Shared-KYC ("verify once, use across anchors") — **gated on Q5** in
  `COMPLIANCE_OPEN_QUESTIONS.md`.
- ⬜ We still onboard anchors deliberately (not instant public self-serve).

**Exit criteria:** a second anchor can be stood up from the template with config
only, no new bespoke code.

---

## Phase 4 — Go-live hardening
*Goal: real money, responsibly. Gated on legal resolution.*

- ⬜ Legal prerequisites resolved with counsel (Q1–Q3, Q6:
  `COMPLIANCE_OPEN_QUESTIONS.md`); FIU-IND handling in place (Q2).
- ⬜ Banking/custody model chosen and implemented behind the banking seam (Q4).
- ⬜ Mainnet config path validated; deliberate env swap, no hardcoded prod
  endpoints; go-live checklist surfaced (`AGENTS.md` §7).
- ⬜ Production infra: move off Docker Compose (k8s or similar), monitoring,
  alerting, incident runbooks, key management/rotation.

**Exit criteria:** a real, licensed anchor moves real INR ↔ Stellar with counsel
sign-off and operational safeguards.

---

## Standing rules across all phases
- Testnet/sandbox is the default; real money is a gated, deliberate act.
- New external dependencies go behind adapters with mock defaults.
- Keep the tenant seam even while there is one anchor.
- This product is B2B anchor infrastructure — not an exchange, wallet, or token
  sale (`AGENTS.md` §1).
