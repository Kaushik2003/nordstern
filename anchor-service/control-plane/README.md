# Control Plane / Provisioner

The **factory**. Given an approved anchor, it programmatically creates a complete, isolated anchor stack on Stellar and Docker.

## What it is

An Express/TypeScript service (`stellar-anchor-control-plane`, port **3002**) that, on a provision request:

1. **Generates keypairs** — issuer / distribution / signing, encrypted at rest with `MASTER_KEK`.
2. **Issues the asset on Stellar** — Friendbot funding + trustline + issuance (testnet), or wires an external USDC treasury (mainnet).
3. **Generates the Anchor Platform config** — `stellar.toml`, `assets.yaml`, `anchor-platform.yaml` (see `config-gen.ts`).
4. **`CREATE DATABASE anchordb_<slug>`** — an isolated per-anchor money DB.
5. **Launches the container stack** — Anchor Platform + business-server (+ customer app + operator console) through the **Docker Engine API** (`dockerode`) with Traefik routing labels.
6. **Health-gates** the stack, then reports `provisioning → active | error`.

It reads each anchor's PSP credentials from the SecretStore at launch and injects them as env — mirroring what External Secrets Operator does in a Kubernetes target.

## Why it exists

Standing up an anchor by hand — keys, on-chain asset, DB, config, containers, routing — is the repetitive part that NordStern automates. This service is that automation, and the seed of future multi-tenant onboarding.

## Run it independently

```bash
cd anchor-service/control-plane
npm install
npm run dev            # tsx watch on :3002
```

It genuinely launches Docker containers and funds testnet accounts, so it needs the Docker socket, a reachable `controldb`, and the per-anchor images built (`nordstern/business-server:dev`, etc.). In practice, run the whole stack via `../scripts/dev.sh`.

## Required environment

| Variable | Purpose |
|---|---|
| `MASTER_KEK` | 32-byte base64 key that encrypts anchor signing keys at rest (from `anchor-service/scripts/setup-base.mjs`). |
| `DB_*` | `controldb` connection. |
| `DOCKER_NETWORK`, `AP_IMAGE`, `BIZ_IMAGE` | Docker network + images the provisioner launches. |
| `ANCHOR_CONFIG_DIR`, `ANCHOR_CONFIG_HOST_ROOT` | Where generated per-anchor configs are written/bind-mounted. |
| `STELLAR_NETWORK`, `HORIZON_URL`, `NETWORK_PASSPHRASE`, `ASSET_MODEL` | Network + asset config (testnet/self-issued by default). |
| `TREASURY_PUBLIC` / `TREASURY_SECRET`, `EXTERNAL_ASSET_*` | Mainnet USDC treasury (production). |
| `DIDIT_*`, `SECRETS_*`, `AWS_*` | KYC injection + SecretStore reader. |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Hot-reload dev server. |
| `npm run build` / `npm start` | Compile + run. |
| `npm run db:migrate` / `db:migrate:down` | `node-pg-migrate` on `controldb`. |
| `npm run typecheck` | `tsc --noEmit`. |

## Dependencies & interactions

Express · `dockerode` · `@stellar/stellar-sdk` · `pg` (`node-pg-migrate`) · `@aws-sdk/client-secrets-manager`. Driven by the **Platform API** (`:4000`); mounts the Docker socket to launch per-anchor stacks onto the shared `nordstern-net` network; writes each anchor's keys/status to `controldb`. Key files: `orchestrator.ts`, `provision.ts`, `config-gen.ts`.

> Mounting the Docker socket is host-root-equivalent — acceptable for the single-host pilot only. The Kubernetes target replaces it with an API + RBAC + NetworkPolicy model. See [`docs/reference/Readiness.md`](../../docs/reference/Readiness.md).
