# Compliance & Legal — Open Questions

> **This is not legal advice, and nothing here should be treated as settled.**
> NordStern's legal/compliance model is deliberately **unfinalized**. This file
> tracks the open questions that require **qualified Indian fintech/regulatory
> counsel**. Agents and engineers: do **not** resolve these in code. When a task
> forces an assumption, make it a *named, swappable* config/adapter (see
> `ARCHITECTURE.md` §4) and note the assumption here.

Source material: `docs/independent_research/compliance.txt`,
`after-infra-setup.txt`, `offramp.txt`, `KYC_providers.txt`.

---

## How to use this file

- Every item is **OPEN** until counsel signs off. Record the *question*, *why it
  matters technically*, and *what the code currently assumes* — never a legal
  conclusion.
- If you add a feature that depends on a legal choice, add/annotate the relevant
  item and keep the code behind an adapter so the choice can change.
- Status legend: blocks going live · shapes architecture · monitor.

---

## Q1 — Who holds the fiat, and under what license?
Master escrow/nodal account operated by NordStern vs. each anchor holding its own
account vs. a licensed managed-account model. Determines **who is the regulated
entity** and who bears liability for pooled funds.
- *Technical impact:* the banking/custody adapter and whether tenancy maps to real
  bank accounts. *Current assumption:* testnet only, single distribution account,
  **no real fiat custody**.
- **Architectural direction (2026-07-06) — Model A (bring-your-own-rails):** each
  anchor brings and **owns** its Razorpay/Cashfree accounts, its bank, and its USDC
  treasury. NordStern stores the tenant's keys encrypted (per-tenant vault) and
  **orchestrates on the anchor's behalf; money never flows through a NordStern
  account.** The operator dashboard is a **control** surface (view balances, trigger
  the anchor's *own* payouts via *its* keys) — never a **custody** surface. Intent:
  keep NordStern *infrastructure*, not a regulated money-mover. Already reflected in
  the code (per-anchor keys injected per stack; encrypted key vault).
- **Model B (NordStern-managed rails) — FUTURE, counsel-gated, NOT built:**
  NordStern's own master PSP/bank collects & settles, funds pool in a NordStern
  account, and the anchor withdraws its balance. This most likely makes NordStern an
  **RBI-authorized Payment Aggregator + custodian + the registered VDASP** — a
  deliberate licensing step taken only with counsel.
- **Still OPEN for counsel:** whether Model A (holding a tenant's keys + orchestrating
  API calls on their behalf) truly keeps NordStern outside PA / custody / VDASP scope,
  and what registration — if any — the orchestration itself requires. This records the
  *architecture*, not a legal conclusion.

## Q2 — VDA / VDASP classification & FIU-IND registration
Fiat-to-token on/off-ramps may be **Virtual Digital Asset Service Providers**,
triggering **FIU-IND registration** (10-digit FIUREID) and PMLA reporting (CTRs/
STRs). Which entity registers — NordStern or each anchor?
- *Technical impact:* onboarding must capture FIU registration data before hitting
  banking rails; reporting hooks may be needed. *Current assumption:* not
  implemented; flagged as a launch prerequisite.

## Q3 — Custody of customer funds/keys
Are we ever in custody of user funds or private keys? Custody triggers materially
heavier obligations.
- *Technical impact:* end users use **third-party wallets** (non-custodial by
  design); the anchor holds only its own distribution/issuer keys. *Current
  assumption:* **avoid custody** unless counsel approves a model.

## Q4 — Banking partnership shape
Embedded banking vs. bring-your-own-bank vs. BaaS virtual accounts (e.g. Setu/
Cashfree/Open). Banks freeze crypto-adjacent, high-velocity accounts lacking FIU
registration — a real operational risk.
- *Technical impact:* the `Ledger/AccountModel` seam; whether "instant account"
  provisioning is virtual sub-ledger or embedded corporate onboarding. *Current
  assumption:* abstract; no bank hardcoded.

## Q5 — KYC ownership, sharing & data residency
Who is the controller of KYC data? Can it be shared across anchors ("verify once,
use everywhere")? Consent, retention, and residency limits?
- *Technical impact:* the `KycProvider` seam and any shared-KYC store. *Current
  assumption:* mock KYC (`ACCEPTED`) remains the default. A real **surepass**
  (sandbox) provider now exists behind `KycProvider` (DL-009): it stores **only the
  verification outcome** (status), never the raw PAN/Aadhaar, and state is
  in-memory per business-server for now. Before any real (non-sandbox) use, the
  controller/consent/retention/residency questions here must be answered, and a
  durable, access-controlled store designed. Shared-KYC ("verify once") remains a
  future value prop, still gated on this question.

## Q6 — Which licenses enable which flows
Payments, PPI/wallet, cross-border/remittance, and VDA rules may each apply
depending on what flows are offered (retail on/off-ramp vs. B2B remittance payout).
- *Technical impact:* which SEP flows and payout rails we expose per anchor.
  *Current assumption:* SEP-24 retail on/off-ramp on testnet only.

## Q7 — Payout / disbursement rail compliance
Using Cashfree Payouts / RazorpayX for fiat-out has its own KYC, 2FA, and
reporting requirements, and moves **real, largely irreversible** money in
production.
- *Technical impact:* the `PayoutProvider` seam; sandbox-by-default; go-live
  gating. *Current assumption:* **simulated payout**; see `AGENTS.md` §7 and the
  Cashfree skills under `frontend/.claude/skills/` before any live payout work.

---

## Prerequisites before any mainnet / real-money launch
(engineering-visible; **not** a legal checklist — counsel owns the legal one)

- [ ] Q1–Q3 resolved by counsel (custody, fund-holding entity, licensing).
- [ ] FIU-IND registration status captured and enforced in onboarding (Q2).
- [ ] Real KYC provider live behind `KycProvider`, PII handling reviewed (Q5).
- [ ] Payout provider live behind `PayoutProvider` with webhook signature
      verification and backend re-verification (Q7).
- [ ] Network/asset/PSP env swapped to production **deliberately**, no hardcoded
      prod endpoints; go-live checklist surfaced (`AGENTS.md` §7).
