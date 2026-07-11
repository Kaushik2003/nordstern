# Business Server

The **per-anchor money runtime** — the code that owns the *business*, not the protocol. One instance runs per provisioned anchor.

## What it is

An Express/TypeScript service (`anchor-template-business-server`, port **3000**, image `nordstern/business-server:dev`) that answers the decisions the Stellar Anchor Platform delegates:

- **Callbacks** — `unique_address` (deposit address), `fee` (quotes), `customer` (KYC).
- **SEP-24 interactive webview** — the hosted deposit/withdraw experience wallets open.
- **Money movement** — mint/send on Stellar and drive transaction status via the Platform API.

It contains the **money-safety core**: an idempotent deposit-release outbox, a treasury-reserve guardrail, at-most-once withdrawal payout, and fail-closed KYC. External dependencies (KYC, deposit-in, payout, FX rate, fee) are **swappable adapters with mock defaults** under `src/adapters/`.

## Why it exists

The Anchor Platform speaks SEP-1/10/12/24, but it delegates every business decision. This service is those decisions — and the place where money actually moves, so it is the most safety-critical code in the repo.

## Run it independently

```bash
cd anchor-template/business-server
npm install
npm run dev            # tsx watch on :3000
```

Needs a Postgres `anchordb_<slug>` (it migrates its own `nordstern` money schema on start) and env describing the asset/treasury/network. In production it is launched **per anchor by the control-plane**, not by hand.

## Required environment

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (3000). |
| `ASSET_CODE`, `ASSET_ISSUER_PUBLIC`, `TREASURY_PUBLIC` | The anchor's asset + treasury. |
| `PLATFORM_API_URL` | Where to drive transaction status / propagate KYC. |
| `IS_MAINNET` | Network gate (testnet by default). |
| `PROVIDERS` | Which KYC/payout/deposit adapters to use (mock by default). |
| DB + signing/PSP creds | Injected by the control-plane from the SecretStore at launch. |

See [`anchor-template/.env.example`](../.env.example).

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Hot-reload dev server. |
| `npm run build` / `npm run start:prod` | Compile + run `dist/`. |
| `npm run db:migrate` / `db:migrate:down` | `node-pg-migrate` on the per-anchor money DB. |
| `npm test` | **Vitest money-flow suites** (deposit release + withdrawal payout) against **Testcontainers Postgres 15** — Docker required. |
| `npm run typecheck` | `tsc --noEmit`. |

## Dependencies & interactions

Express · `@stellar/stellar-sdk` · `pg` (`node-pg-migrate`). Receives callbacks from its sibling **Anchor Platform** container; calls the **Platform API** to advance status and propagate KYC decisions; is the source image cloned per anchor by the **control-plane**. Its money-flow tests are a required CI gate (`tests.yml`).
