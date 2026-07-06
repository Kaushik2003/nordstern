# NordStern — Architecture Notes

Concrete technical map of the working system and the seams that keep it flexible.
Companion to `AGENTS.md`. Where this and the code disagree, fix one of them.

---

## 1. Repository map

```
nordstern/                     # git root; one repo, several subprojects
├─ AGENTS.md / CLAUDE.md        # canonical agent guidance (root)
├─ anchor-service/              # ★ the working anchor MVP (backend + wallet UI + control plane)
│  ├─ docker-compose.yml        # orchestrates db + anchor-platform + business-server + control-plane + frontend
│  ├─ config/                   # Anchor Platform config (anchor-platform.yaml, stellar.toml, assets.yaml, *.mainnet.*)
│  ├─ business-server/          # TS/Express: Platform callbacks + SEP-24 interactive UI + Stellar ops
│  ├─ control-plane/            # TS/Express + Postgres: tenant auth / keypair provisioning (multi-tenant seed)
│  ├─ frontend/                 # Next.js + Freighter: functional wallet + operator dashboard (/anchor/*)
│  ├─ scripts/                  # setup-testnet.mjs, dev.sh, test-deposit.mjs, test-withdrawal.mjs, pg-init/
│  └─ docs/                     # decision-log.md (DL-00x), glossary.md
├─ anchor-platform/             # upstream Stellar AP source (Java/Kotlin) + quick-run/ — REFERENCE ONLY
├─ frontend/                    # NordStern brand system + landing + "Keel" operator console PROTOTYPE (synthetic data)
├─ sep24-reference-ui/          # Stellar's official SEP-24 reference wallet UI — REFERENCE ONLY
└─ docs/                        # Stellar reference docs + independent_research/ + docs/project/ (this)
```

**Two frontends, kept distinct:**
- `anchor-service/frontend` — *functional*. Talks to the live testnet backend via
  `/biz/*` (business-server) and `/cp/*` (control-plane) rewrites; signs with
  Freighter. This is the real wallet/dashboard.
- `frontend/web` ("Keel") — *demo-grade prototype*. Synthetic data, simulated
  actions, high visual fidelity for investor/partner reviews (see `frontend/PRD.md`).
  Do not wire it to live keys; do not downgrade the functional UI to its mock data.

**Two Anchor Platform copies, kept distinct:** see `AGENTS.md` §8. Edit
`anchor-service/config/` to change anchor behavior; read `anchor-platform/` only to
learn the contract.

---

## 2. Service topology (anchor-service)

```
 Third-party Stellar wallet (Lobstr / Vibrant / Freighter)
        │  SEP-1 discovery, SEP-10 auth, SEP-24 deposit/withdraw
        ▼
 ┌──────────────────────┐        Platform API (8085)        ┌──────────────────────┐
 │  Anchor Platform      │  ───────────────────────────────▶ │  business-server      │
 │  (stellar/anchor-      │  ◀───────────────────────────────  │  (TS/Express)         │
 │   platform image)      │        callbacks (→ :3000)         │  - unique_address      │
 │  -s SEP server  :8080  │                                    │  - fee                 │
 │  -p Platform API :8085 │        watches ledger              │  - customer (KYC)      │
 │  -o Observer           │  ◀───── Horizon (testnet) ──────    │  - SEP-24 interactive  │
 └──────────┬────────────┘                                    │  - Stellar mint/send   │
            │ anchordb                                          └───────────┬──────────┘
            ▼                                                                │ Stellar SDK
      ┌───────────┐        controldb        ┌───────────────┐               ▼
      │ Postgres  │ ◀─────────────────────  │ control-plane │        Horizon / Stellar
      │  :5432    │                          │  (TS/Express) │
      └───────────┘                          │  auth/tenants │
            ▲                                 └───────┬───────┘
            │                                         │ /cp/*
      ┌─────┴───────────────────────────────────┐    │
      │ frontend (Next.js) :3001                 │────┘
      │  /anchor/* wallet + operator dashboard   │  /biz/* → business-server
      └──────────────────────────────────────────┘
```

Ports: `db` 5432 · AP SEP server 8080 · AP Platform API 8085 · business-server
3000 · control-plane 3002 · frontend 3001.

### Component responsibilities

- **Anchor Platform** — implements the SEP protocols (SEP-1/10/12/24 active; 6/31/38
  enabled only to satisfy AP bean requirements). Owns transaction state in
  `anchordb`. Runs the **Observer** to watch the ledger for incoming/outgoing
  payments. Calls the business server for decisions it can't make.
- **business-server** — *our business logic*. Answers Platform callbacks:
  - `POST /callbacks/unique_address` → returns the distribution address + a
    deterministic memo (derived from the transaction id).
  - `POST /callbacks/fee` → fee quote (currently `0`).
  - `GET/PUT/DELETE /callbacks/customer` → SEP-12 KYC (currently a stub that
    always returns `ACCEPTED`).
  - Hosts the **SEP-24 interactive** HTML at `/sep24/interactive` and completes it
    at `/sep24/interactive/complete`.
  - Performs Stellar ops with `@stellar/stellar-sdk` (build/sign/submit, trustline,
    payment) and advances transaction status via Platform API `PATCH`.
- **control-plane** — seed of the multi-tenant SaaS: JWT/bcrypt auth, tenants,
  config, admin, backed by `controldb`. Not yet a real tenancy boundary.
- **frontend** — wallet connect (Freighter) + `/anchor/*` operator pages
  (signup, login, onboarding, dashboard, transactions, rules, admin, settings).

---

## 3. SEP-24 flows as implemented

### Deposit (on-ramp) — ✅ works on testnet, fiat-in simulated
1. Wallet does SEP-10 auth → JWT; `POST /sep24/transactions/deposit/interactive`.
2. AP returns the interactive URL → business-server `/sep24/interactive` renders a
   form (currently a **placeholder "wire to ACME Test Bank" screen — no real fiat**).
3. On confirm → `/sep24/interactive/complete`: status → `pending_anchor`, then
   `sendAnch()` mints/sends `ANCH` from the distribution account to the user's
   Stellar address, then status → `completed` with amounts + stellar tx hash.
4. Page `postMessage`s completion so the wallet closes the webview.

### Withdrawal (off-ramp) — ✅ detection works, fiat-out simulated
1. Wallet auths and starts a withdrawal; interactive page shows the distribution
   address + required **memo** and asks the user to send `ANCH` back.
2. On confirm → status `pending_user_transfer_start` with the memo stored.
3. The **Observer** matches the incoming `ANCH` payment by memo and the anchor
   would release fiat — **currently simulated, no PSP wired.** This is where a
   `PayoutProvider` (Cashfree Payouts / RazorpayX) plugs in.

---

## 4. The swappable seams (why the system stays flexible)

Because the legal model is open (`COMPLIANCE_OPEN_QUESTIONS.md`), every external
dependency is an **adapter with a mock default**. Program to the interface; keep
vendors out of core flow logic. These interfaces are now **implemented** in
`business-server/src/adapters/` (they used to be aspirational) and are selected
per anchor via `*_PROVIDER` env injected by the orchestrator.

| Seam              | Interface           | Default (mock)                       | Real impl status                        |
|-------------------|---------------------|--------------------------------------|-----------------------------------------|
| KYC / AML         | `KycProvider`       | `ACCEPTED`                           | **surepass (sandbox) implemented** (DL-009); HyperVerge/Signzy later |
| Fee               | `FeeProvider`       | `0`                                  | spread/fee from `tenant_config` later    |
| Fiat-in (deposit) | `DepositProvider`   | "wire" placeholder screen            | UPI collection (`upi://pay` / QR) later  |
| Fiat-out (payout) | `PayoutProvider`    | simulated release on Observer match  | Cashfree Payouts, RazorpayX later        |
| Banking / custody | (ledger — later)    | single distribution account, testnet | nodal/escrow · BYO-bank · managed        |
| Tenancy           | anchor = own stack  | —                                    | **real: control-plane factory** (DL-005) |

### The anchor factory (DL-005/006)

Multi-anchor is now real: the **control-plane is an orchestrator** that provisions
an **isolated stack per anchor** — its own Anchor Platform container, business-server
container, `<slug>.anchors.127.0.0.1.sslip.io` subdomain (Traefik) for zero-config
wildcard routing, encrypted keypairs (DL-007), generated AP config (DL-008), and
`anchordb_<slug>`. An operator owns many anchors and manages them from the console.
The base `docker-compose.platform.yml` runs only shared infra (db + traefik +
control-plane + platform-api); anchors are created at provision time via the Docker
Engine API. Secrets are encrypted at rest, not
plaintext.

Guidelines:
- **Network & asset are config, not code** — testnet/`ANCH` today; mainnet/real
  asset is a config swap gated per `AGENTS.md` §7.
- **Money moves are async + idempotent** — match by memo, drive by status; never
  blind-retry a fund movement on 5xx (check status first).
- **Leave the tenant seam even while building one anchor** — assume assets, keys,
  and transactions will one day be scoped by tenant id.

---

## 5. Where to make common changes

- Change anchor SEP behavior / limits / asset → `anchor-service/config/*`.
- Change deposit/withdraw business logic → `anchor-service/business-server/src/`.
- Add KYC / payout / UPI → add an adapter + mock, wire it in the business server;
  do **not** call a vendor SDK directly from the flow.
- Operator UI (functional) → `anchor-service/frontend/app/anchor/*`.
- Demo console visuals → `frontend/web` (per `frontend/PRD.md`).
- Record consequential decisions → `anchor-service/docs/decision-log.md` (`DL-00x`).
