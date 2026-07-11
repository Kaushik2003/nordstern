# Deployment-Prep Review — testnet pilot (2026-07-09)

> Assessment done **before** `terraform apply`. The infrastructure is in good shape; the
> **existing `Checklist.md` has drifted** — it was written before the console split,
> universal DIDIT KYC, and the money-path work. This doc lists what's ready and the
> **blockers to close first**, so the pilot deploy reflects the real product.
>
> **Nothing here runs `terraform apply` — that stays gated on an explicit "apply".**

---

## Ready (infrastructure — Terraform)

- **Modular, least-privilege Terraform** (networking / iam / secrets / database / compute /
  dns). Region `ap-south-1`, account `177712846933`, domain `nordstern.live` (DNS at
  Hostinger, `manage_dns=false`).
- **Compute:** single `t3.large` (8 GB — floor for the AP JVMs), Amazon Linux 2023,
  user-data installs Docker + compose + git + CloudWatch agent; **SSM access (no SSH)**.
- **Database:** RDS `db.t3.small`, private subnet, encrypted, 7-day backups, deletion
  protection off / skip-final-snapshot (pilot).
- **Secrets:** module generates the platform + DB secrets into Secrets Manager
  (`nordstern/pilot/*`); the app's per-anchor PSP secrets are app-created (not in TF state).
- **Plan saved** (`tf.plan`, ~37 resources); `terraform.tfvars` written (Resend key present,
  git-ignored). `validate` + `plan` pass.

This layer can be applied as-is. The gaps below are all **app / config**, on the host.

---

## Blockers to close BEFORE deploying (app-layer drift)

### B1 · Deploy the RIGHT branch (biggest one)
The checklist says deploy `feat/platform-infra-and-money-safety` (that's **merged** as PR #2).
But **everything from today** — the console split, universal DIDIT KYC, KYC reuse, native
off-ramp + hands-free detection, the reaper, all money-path fixes — lives on
**`refactor/split-platform-console` (PR #3, NOT on `main`)**. Deploying `main` would ship a
**month-old product**.
**Action:** merge PR #3 to `main` first (preferred), or check out that branch on the host.

### B2 · Console split not reflected in the checklist/prod config
The checklist assumes ONE `platform-console` at `app.nordstern.live`. Reality now:
- `founder-console` → **`register.nordstern.live`** (:4001, build ctx `./platform`)
- `admin-console` → **`admin.nordstern.live`** (:4002, build ctx `./platform`)
**Actions:**
- Prod Traefik overrides must add **two** host routers (`register.` + `admin.`) with TLS, not
  one `app.` router.
- `CONSOLE_URL` (platform-api) → `https://register.nordstern.live` (approval/redeem emails).
- admin-console build arg `NEXT_PUBLIC_FOUNDER_URL=https://register.nordstern.live`.
- DNS: the wildcard `A * → EIP` covers `register./admin./<slug>.` — but see B5.

### B3 · Universal DIDIT KYC is now fail-closed → prod MUST supply DIDIT creds
KYC now defaults to **didit** for every provisioned anchor and **fails closed** without creds
(the business-server throws on boot if `DIDIT_API_KEY` is missing). The control-plane injects
`DIDIT_*` into each anchor — compose already passes them through (`${DIDIT_API_KEY}` etc.), so
**the prod `.env` MUST define** `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`.
The checklist's Phase 4 env list omits them, and its smoke test still says "mock KYC accepts"
— both stale. Without these, **provisioned anchors won't boot**.
**Action:** add the 3 DIDIT vars to the prod `.env` (from Secrets Manager, not committed);
update the smoke test to expect the real DIDIT flow. *(DIDIT resolves by polling, so no public
webhook is strictly required for the happy path — but set the webhook for robustness.)*

### B4 · The provisioner needs 4 images; the checklist builds 1
`orchestrator.ts` launches per anchor: `stellar/anchor-platform:latest` (pulled) +
`nordstern/business-server:dev` + **`nordstern/anchor-client:dev`** + **`nordstern/operator-console:dev`**.
The checklist Phase 2 builds only `business-server`. On a fresh host the client/console images
won't exist → provisioning launches an incomplete anchor (no customer app / operator console).
Dockerfiles exist for all three.
**Action (host, Phase 2):** build all three:
```
docker build -t nordstern/business-server:dev  anchor-template/business-server
docker build -t nordstern/anchor-client:dev     anchor-template/anchor-client
docker build -t nordstern/operator-console:dev  anchor-template/console
```

### B5 · RESOLVED 2026-07-09 — Slug reservation now enforced
Reserved slugs (`admin`, `register`, `console`, `api`, `sep`, `www`, `app`, `auth`, `docs`,
`nordstern`, …) are rejected at **both** layers: platform-api redeem (founder path, friendly
error) and control-plane direct provisioning (defense-in-depth). Verified live. Commit `39a3858`.
Files: `platform/api/src/lib/slug.ts` (`RESERVED_SLUGS`/`isReservedSlug`),
`anchor-service/control-plane/src/provision.ts`.

---

## Known caveats (acceptable for a testnet pilot — do NOT "fix" by going to prod rails)

- **Off-ramp fiat payout is simulated** (mock UTR). Real Cashfree = separate mainnet gate.
- **Everything is testnet** (Friendbot, per-anchor minted asset). No real money.
- **Docker-socket mount** on control-plane = large privilege surface (documented; K8s later).
- **KYC-webhook propagation fragility** (finding #6) — works via poll on the happy path.
- **USDC label** cosmetic inconsistency (#15) — real values, wrong unit label in some views.
- **No metrics / thin audit** — logging + health only.

## Explicitly NOT in this deploy (separate go-live gate — AGENTS.md §7)
Mainnet, real PSP disbursement, live FX, the EKS/Helm/ArgoCD path (`anchor-template/infra`,
authored-not-wired).

---

## Recommended order

1. **Merge PR #3 → `main`** (B1). Re-`terraform plan` if any infra file changed (it didn't).
2. Close **B5** (reserved slugs) — small code change, real safety.
3. Update the **prod `.env` + `infrastructure/docker/production.yml` overrides** for B2 (two consoles) + B3
   (DIDIT vars). Update Phase 2 to build **3 images** (B4).
4. Refresh `Checklist.md` to match (two consoles, DIDIT smoke test, 3 image builds).
5. **Then** `terraform apply "tf.plan"` — only on your explicit go-ahead.

## Cost note
`t3.large` + `db.t3.small` + EIP ≈ a few USD/day while running; **stop the EC2 when idle**
(bills only EBS). `terraform destroy` for full teardown (per-anchor app secrets deleted
separately).
