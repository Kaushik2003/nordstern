# NordStern Pilot — First Deployment Checklist

Tick top to bottom. Concrete values for THIS pilot are inlined. Full detail lives in
`README.md § After apply`. Region `ap-south-1`, account `177712846933`, domain
`nordstern.live` (DNS at Hostinger).

## Phase 0 — Pre-flight (done)
- [x] IAM user `nordstern-deploy` + access key; `aws sts get-caller-identity` works
- [x] `terraform.tfvars` written (region, Resend key, `manage_dns=false`)
- [x] `terraform validate` passes; `terraform plan` = **37 to add** (saved `tf.plan`)
- [x] Plan sanity-checked (region / instance / RDS / cost / DNS)

## Phase 1 — Provision infrastructure
- [ ] `terraform apply "tf.plan"`  *(from `deploy/terraform/`, ~/.aws mounted)*
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
- [ ] Add `docker-compose.prod.yml` overrides (README §5): RDS `DATABASE_URL`s
      (`platformdb`/`controldb`/`aggregatordb`), `platform-api` `NODE_ENV=production` +
      `ADMIN_USERNAME`/`ADMIN_PASSWORD` passthrough, Traefik `websecure`+`le` cert resolver +
      http→https redirect, and **remove** the public `8090` dashboard + `5432` port maps

## Phase 5 — Bring it up
- [ ] `docker compose -f docker-compose.platform.yml -f docker-compose.prod.yml --env-file .env up -d --build`
- [ ] **Migrations** run: `platform-migrate` exits `0` against RDS (drizzle push)
- [ ] **Verify containers**: `docker compose ps` — db-less services (api, console, control-plane, aggregator, traefik, secrets? n/a) all `Up`; platform-api `/health` → 200

## Phase 6 — DNS + TLS
- [ ] **Point Hostinger DNS** (hPanel → Domains → nordstern.live → DNS/Nameservers):
      `A   *      <ec2_public_ip>   TTL 300`  and  `A   @   <ec2_public_ip>   TTL 300`
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
