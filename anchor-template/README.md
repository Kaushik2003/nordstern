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

| Service | Port | Role |
|------------------|------|---------------------------------------------|
| `db` (Postgres) | 5432 | `anchordb` (Anchor Platform state) |
| `anchor-platform`| 8080 | SEP server — wallets/users talk here |
| `anchor-platform`| 8085 | Platform API — the business server talks here |
| `business-server`| 3000 | Callbacks + SEP-24 interactive + Stellar ops + `/admin` API |
| `client` | 3001 | Next.js operator console / management frontend (live data) |
| `ngrok` | 4040 | Public HTTPS tunnel → business-server (DIDIT webhooks + hosted-flow redirect); inspector on 4040 |

## Quick start (testnet)

```bash
cd anchor-template
node scripts/setup-testnet.mjs   # gen signing + treasury keys, fund via Friendbot,
                                 # add USDC trustline, render config, write .env
node scripts/fund-treasury.mjs   # swap treasury XLM → USDC on the testnet DEX
                                 # (seeds the USDC float; Circle's web faucet also works)
docker compose up --build        # bring up db + anchor-platform + business-server
```

- **`.env` does not exist until you run the setup script** — that's the first thing
  to check if the stack won't start.
- **KYC (DIDIT) needs the tunnel.** Set `NGROK_AUTHTOKEN` in `.env`
  ([get one](https://dashboard.ngrok.com/get-started/your-authtoken)) and stop any host
  `ngrok` (`pkill ngrok`) before `up` — the reserved static domain in `PUBLIC_BASE_URL`
  allows one agent. DIDIT reports the KYC decision via a **webhook** to that public URL
  (the source of truth); `localhost` can't receive it. Real KYC is the **default** and
  fails closed — for local dev without DIDIT, set `KYC_PROVIDER=mock ALLOW_MOCK_KYC=true`
  (auto-approves everyone; dev-only; refused on mainnet) to skip the tunnel.
- Verify: `curl http://localhost:8080/.well-known/stellar.toml` and
  `curl http://localhost:3000/health` (shows the treasury USDC float).
- Smoke tests: `node scripts/test-handshake.mjs` (Phase A) and
  `node scripts/test-deposit.mjs` (Phase B — real INR→USDC on-ramp). On a machine
  where 3000/5432 are taken, run the stack with `BIZ_HOST_PORT` / `DB_HOST_PORT`
  and pass `BIZ_URL=http://localhost:<port>` to the test scripts.

## Build phases

- **Phase A — Skeleton :** stack boots against USDC; SEP-10 auth + SEP-24
  interactive reachable; `/customer` mocked (`ACCEPTED`).
- **Phase B — USDC on-ramp + treasury :** USDC float funded; real USDC transfer on
  deposit with a reserve check; INR/USD FX applied to `amount_in` (mock RateProvider).
  INR declared as an off-chain `iso4217:INR` asset.
- **Phase C — USDC off-ramp :** user returns USDC with a memo → AP Observer detects
  it → withdrawal poller disburses INR (mock payout) → completed. Admin API added.
- **Client (console) :** Next.js operator frontend (`client/`) on live data —
  treasury float, KPIs, and the transaction ledger.
- **Phase D — Real adapters (sandbox), behind mock-first seams:**
  - slice 1 — **live FX** (`FEE_PROVIDER=live`, no-key feed w/ fallback) + real
    **SEP-38 `/rate`** (validated by the AP) + **KYC** as a `KycProvider` seam
    (mock default, Surepass real impl gated on `SUREPASS_TOKEN`).
  - slice 2 — **Cashfree Payouts** adapter with async webhook status (HMAC-SHA256
    verified, backend re-verified) + **UPI deposit intent/QR** (`qrcode`) in the
    SEP-24 interactive flow.
- **Phase F — Go-live hardening (gated on legal/compliance).**

Testnet/sandbox is the default; anything that moves real money is a deliberate,
gated config swap. USDC testnet issuer is in config and must be re-verified after
each quarterly testnet reset.
