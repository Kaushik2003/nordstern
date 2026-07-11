# NordStern Pilot — First Deployment Checklist

> ** 2026-07-09 UPDATE — read this first; it supersedes the stale steps below.**
> The product changed since this checklist was written (see `Review.md`).
> The corrections, now handled by **`infrastructure/docker/production.yml`** + **`.env.prod.example`**:
>
> - **Deploy branch:** `main` (PR #3 merged — has the console split, DIDIT, off-ramp, all fixes).
> - **B2 · Two consoles, not one.** `founder-console` → `register.nordstern.live`,
> `admin-console` → `admin.nordstern.live` (both TLS). The prod compose sets the host
> routers, `CONSOLE_URL=https://register.nordstern.live`, and
> `NEXT_PUBLIC_FOUNDER_URL=https://register.nordstern.live`.
> - **B3 · DIDIT env is REQUIRED.** KYC is universal DIDIT + fail-closed — set
> `DIDIT_API_KEY/WORKFLOW_ID/WEBHOOK_SECRET` in `.env` or provisioned anchors won't boot.
> Smoke test expects the **real DIDIT flow**, not mock KYC.
> - **B4 · Build THREE images** (Phase 2), not one:
> ```
> docker build -t nordstern/business-server:dev anchor-template/business-server
> docker build -t nordstern/anchor-client:dev anchor-template/anchor-client
> docker build -t nordstern/operator-console:dev anchor-template/console
> ```
> - **Bring-up (Phase 5) uses BOTH files:**
> `docker compose -f infrastructure/docker/platform.yml -f infrastructure/docker/production.yml --env-file .env up -d --build`
> (RDS for all DBs; local Postgres + LocalStack are disabled via profiles; real AWS Secrets
> Manager via the instance role; Traefik TLS via Let's Encrypt; no public :5432/:8090.)
> - **DNS (Phase 6):** wildcard `A * → EIP` covers `register.` / `admin.` / `<slug>.` — plus an
> `A @ → EIP`. Reserved slugs (`admin/register/api/console/sep/www`) are now enforced in code.
> - **Cost control (NEW):** `deploy/scripts/{pause,resume,status}.sh` stop/start EC2 + RDS to
> save credits between demos; provisioned anchors auto-resume (RestartPolicy). **Recommended:
> apply close to demo day, pause when idle.**

---

Tick top to bottom. Concrete values for THIS pilot are inlined. Full detail lives in
`README.md § After apply`. Region `ap-south-1`, account `177712846933`, domain
`nordstern.live` (DNS at Hostinger).

## Phase 0 — Pre-flight (done)
- [x] IAM user `nordstern-deploy` + access key; `aws sts get-caller-identity` works
- [x] `terraform.tfvars` written (region, Resend key, `manage_dns=false`)
- [x] `terraform validate` passes; `terraform plan` = **37 to add** (saved `tf.plan`)
- [x] Plan sanity-checked (region / instance / RDS / cost / DNS)

## Phase 1 — Provision infrastructure
- [ ] `terraform apply "tf.plan"` *(from `deploy/terraform/`, ~/.aws mounted)*
- [ ] Record outputs: `ec2_public_ip` (the EIP), `ec2_instance_id`, `rds_address`, `dns_status`
- [ ] **Wait for EC2** → `Running` + status checks 2/2 (~1–2 min)
- [ ] **Wait for RDS** → `Available` (~5–10 min; first create is the slow part)

## Phase 2 — Prepare the host
- [ ] Connect: `aws ssm start-session --target <ec2_instance_id>` → `sudo su - ec2-user`
- [ ] `git clone https://github.com/Kaushik2003/nordstern && cd nordstern`
- [ ] Check out the deployed branch (`feat/platform-infra-and-money-safety` until merged)
- [ ] Build the per-anchor image: `docker build -t nordstern/business-server:dev anchor-template/business-server`

## Phase 3 — Databases
- [ ] Create the platform DBs on RDS (anchordb already exists) — from the host:
      `for db in platformdb controldb aggregatordb; do psql -h <rds_address> -U nordstern_admin -d anchordb -c "CREATE DATABASE $db;"; done`
      *(password: `aws secretsmanager get-secret-value --secret-id nordstern/pilot/database`)*

## Phase 4 — Configuration
- [ ] Build `.env` from Secrets Manager:
      `aws secretsmanager get-secret-value --secret-id nordstern/pilot/platform --query SecretString --output text` → write each key as `KEY=value`
- [ ] Append prod runtime vars to `.env`:
      `NODE_ENV=production`, `ANCHOR_DOMAIN_SUFFIX=nordstern.live`, `ANCHOR_PUBLIC_SCHEME=https`,
      `ANCHOR_TRAEFIK_ENTRYPOINT=websecure`, `ANCHOR_TRAEFIK_CERTRESOLVER=le`,
      `CONSOLE_URL=https://app.nordstern.live`, `ANCHOR_CONFIG_HOST_ROOT=$PWD/anchor-configs`
- [ ] Add `infrastructure/docker/production.yml` overrides (README §5): RDS `DATABASE_URL`s
      (`platformdb`/`controldb`/`aggregatordb`), `platform-api` `NODE_ENV=production` +
      `ADMIN_USERNAME`/`ADMIN_PASSWORD` passthrough, Traefik `websecure`+`le` cert resolver +
      http→https redirect, and **remove** the public `8090` dashboard + `5432` port maps

## Phase 5 — Bring it up
- [ ] `docker compose -f infrastructure/docker/platform.yml -f infrastructure/docker/production.yml --env-file .env up -d --build`
- [ ] **Migrations** run: `platform-migrate` exits `0` against RDS (drizzle push)
- [ ] **Verify containers**: `docker compose ps` — db-less services (api, console, control-plane, aggregator, traefik, secrets? n/a) all `Up`; platform-api `/health` → 200

## Phase 6 — DNS + TLS
- [ ] **Point Hostinger DNS** (hPanel → Domains → nordstern.live → DNS/Nameservers):
      `A * <ec2_public_ip> TTL 300` and `A @ <ec2_public_ip> TTL 300`
      *(leave existing Resend SPF/DKIM records untouched)*
- [ ] Propagation: `dig +short app.nordstern.live` returns the EIP
- [ ] **Wait for HTTPS** — first request per host triggers Let's Encrypt; `curl -I https://app.nordstern.live` → valid cert, 200

## Phase 7 — Smoke tests (real prod flows)
- [ ] **Founder flow**: `/register` submit → received email → `/admin` (real admin creds) approve → approved email + redeem link
- [ ] **Provision anchor**: redeem → provisioning completes → live at `https://<slug>.nordstern.live` (HTTPS) → live email
- [ ] **Customer flow**: `<slug>.nordstern.live/.well-known/stellar.toml` over TLS; OTP login; history/profile load
- [ ] **Buy**: wallet SEP-10 → SEP-24 deposit → mock KYC accepts → on-chain receipt; AP tx `completed`
- [ ] **Sell**: withdrawal initiated → detected (payout simulated on testnet)
- [ ] **Operator flow**: OTP login at `console-<slug>.nordstern.live` → dashboard/treasury/transactions show real data incl. the smoke-test tx

## Phase 8 — After the demo
- [ ] Stop the EC2 instance when idle (bills only EBS while stopped)
- [ ] Do NOT enable mainnet / real PSP — that is a separate go-live gate (AGENTS.md §7)

---
**Rollback / teardown:** `terraform destroy` (deletion protection off, skip-final-snapshot on
by default). Per-anchor secrets under `nordstern/testnet/anchor/*` are app-created and not in
Terraform state — delete separately for a spotless account.
