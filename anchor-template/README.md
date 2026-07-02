# NordStern Anchor Template

The **canonical, production-oriented single anchor** for an **INR ↔ USDC** flow, built
on the official [Stellar Anchor Platform](https://github.com/stellar/anchor-platform)
(`stellar/anchor-platform:latest`, v4.4.0) image. This is a green-field project
(distinct from the parked `../anchor-service/` factory) whose goal is one complete,
well-built anchor that later becomes the template we provision from.

> **The anchor does NOT issue USDC.** USDC is issued by Circle. This anchor holds a
> USDC **float** in its treasury and *transfers* real USDC on deposit / receives it
> back on withdrawal. That makes **treasury + FX (INR/USD) quoting** first-class —
> unlike a mint-your-own-token model.

## Architecture (who owns what)

- **Anchor Platform** (official image, roles `-s -p -o`) owns the SEP protocols
  (SEP-1/10/12/24; 6/31/38 enabled only to satisfy AP bean requirements), the
  transaction state machine, and the Observer that watches the ledger.
- **business-server** (TS/Express, the only code we own) answers the two decisions
  the AP delegates in v4.4.0 — `GET/PUT/DELETE /customer` (SEP-12 KYC) and
  `GET /rate` (SEP-38 FX) — hosts the SEP-24 interactive UI, moves USDC, and
  advances transaction status via the Platform API.

  > AP v4.4.0 has **no** `/unique_address` or `/fee` callback — verified against the
  > upstream source (`callback/` has only Customer + Rate integrations).

## Ports

| Service          | Port | Role                                        |
|------------------|------|---------------------------------------------|
| `db` (Postgres)  | 5432 | `anchordb` (Anchor Platform state)          |
| `anchor-platform`| 8080 | SEP server — wallets/users talk here        |
| `anchor-platform`| 8085 | Platform API — the business server talks here |
| `business-server`| 3000 | Callbacks + SEP-24 interactive + Stellar ops |

## Quick start (testnet)

```bash
cd anchor-template
node scripts/setup-testnet.mjs   # gen signing + treasury keys, fund via Friendbot,
                                 # add USDC trustline, render config, write .env
docker compose up --build        # bring up db + anchor-platform + business-server
```

- **`.env` does not exist until you run the setup script** — that's the first thing
  to check if the stack won't start.
- Verify: `curl http://localhost:8080/.well-known/stellar.toml` and
  `curl http://localhost:3000/health`.

## Build phases

- **Phase A — Skeleton (this):** stack boots against USDC; SEP-10 auth + SEP-24
  interactive reachable; `/customer` mocked (`ACCEPTED`).
- **Phase B — USDC on-ramp + treasury:** fund a USDC float; real USDC transfer on
  deposit with reserve checks; INR/USD FX via SEP-38 `/rate`.
- **Phase C — USDC off-ramp:** Observer detects returned USDC by memo; mock payout.
- **Phase D — Real adapters (sandbox):** KYC, UPI deposit, Cashfree/RazorpayX payout,
  real FX — behind mock-first adapter seams.
- **Phase E — Treasury + console (live data).**
- **Phase F — Go-live hardening (gated on legal/compliance).**

Testnet/sandbox is the default; anything that moves real money is a deliberate,
gated config swap. USDC testnet issuer is in config and must be re-verified after
each quarterly testnet reset.
