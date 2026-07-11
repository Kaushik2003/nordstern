# Contributing to NordStern

Thanks for your interest in NordStern. This guide covers how the repo is organized, how to get a local environment running, and the conventions every change must follow.

## Repository layout

```
apps/            landing · docs · mobile        (+ platform consoles, anchor-template frontends)
services         platform-api · control-plane · aggregator · business-server
packages/        design-system · shared-ui · shared-auth
templates        anchor-template/config          (cloned per anchor at provision time)
infrastructure/  docker/ · aws/ · scripts/
docs/            project/ (authored) · saved Stellar references
```

There is **no top-level build** — each subproject has its own tooling. Work inside the relevant one. See the [root README](README.md#repository-structure) for the full map.

## Getting started

```bash
git clone https://github.com/manovHacksaw/nordstern.git
cd nordstern/anchor-service
node scripts/setup-base.mjs   # one-time: writes .env.base (MASTER_KEK + config dir)
./scripts/dev.sh              # builds per-anchor images + brings up infrastructure/docker/platform.yml
```

Prerequisites (Docker, Node ≥ 20, npm, git) and the full flow are in the [README](README.md#local-development-one-command). To run a single service standalone, see [Running individual services](README.md#running-individual-services).

## Conventions

- **Read [`AGENTS.md`](AGENTS.md) first** — it is the canonical guidance for humans and coding agents and overrides assumptions. `CLAUDE.md` imports it.
- **Respect the seams.** To add a KYC provider, payout rail, or UPI method, extend the *adapter interface* with a working mock default and put the vendor behind it — never scatter vendor SDK calls through core flows.
- **Keep testnet/sandbox the default** and gate anything that moves real money ([AGENTS.md §7](AGENTS.md)).
- **Match the surrounding stack** — TS/Express + Stellar SDK for backend services, App-Router Next.js for frontends.
- **Migrations, not runtime DDL** — schema changes are versioned and must apply to a fresh database (the `db` CI check enforces this).
- **Never present legal/compliance conclusions as settled** — document open questions in [`docs/reference/Compliance.md`](docs/reference/Compliance.md).

## Before you open a PR

- `npm run typecheck` (and `npm run build` where it exists) in each workspace you touched.
- `npm test` for money-flow or secret logic (`anchor-template/business-server`, `platform/api`) — these run against real Postgres/LocalStack via Testcontainers, so Docker must be running.
- **CI must be green.** Six GitHub Actions workflows gate every PR: build/typecheck, DB migration apply-to-fresh, `docker build` for changed images, gitleaks + artifact hygiene, money-flow tests, and the DR drill. Missing `lint`/`test` scripts are skipped, never faked.
- Record consequential architectural decisions in `anchor-service/docs/decision-log.md` (`DL-00x`) or an ADR under `docs/architecture/`, and update the README / `AGENTS.md` when reality changes.

## Commit & PR style

- Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`) scoped to the area, e.g. `feat(control-plane): …`.
- Keep PRs focused; a structural move and a behavior change should be separate PRs.

## Reporting issues

Open a GitHub issue with clear reproduction steps, the affected component, and logs where relevant. For anything security-sensitive, email `security@nordstern.live` rather than filing publicly.
