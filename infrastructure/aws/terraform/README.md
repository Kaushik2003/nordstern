# NordStern — Pilot Infrastructure (Terraform)

Infrastructure for a **production-grade hosted testnet pilot**: one EC2 Docker host
running the whole `docker-compose` stack (platform + every provisioned anchor) with
RDS Postgres behind it. Deliberately **not** Kubernetes and **not** hyperscale — that
path exists separately under `anchor-template/infra/terraform` (EKS) for later.

> Terraform provisions **infrastructure only**. It never builds images, deploys the
> app, or moves money. After `apply`, follow **§ After apply** to bring the stack up.

---

## What it creates

- **VPC** — public subnets (the Docker host + Elastic IP) and private subnets (RDS,
  never publicly reachable). No NAT gateway (RDS needs no egress; saves the cost).
- **Security groups** — 80/443 (and optional 22) to the host; 5432 to RDS **from the
  host SG only**.
- **EC2** — a single Amazon Linux 2023 Docker host, IMDSv2-only, bootstrapped with
  Docker + Compose. Reached via **SSM Session Manager** (no inbound SSH by default).
- **Elastic IP** — the stable address `*.nordstern.live` points at.
- **RDS Postgres** — private, encrypted, **automated backups + PITR**, storage
  autoscaling. Master user has `CREATEDB` so the control-plane can create per-anchor
  databases.
- **IAM** — an instance role scoped to exactly what the app needs: read the platform +
  database secrets, manage per-anchor PSP secrets under `nordstern/testnet/anchor/*`,
  write CloudWatch logs, and SSM.
- **Secrets Manager** — a generated platform-secrets bundle (JWT, `MASTER_KEK`, admin,
  Resend) and a DB-connection secret. No secret is ever typed by hand.
- **CloudWatch** — log groups for platform + per-anchor container logs.
- **Route53** — *optional* wildcard + apex records. If DNS is elsewhere, it stays
  hands-off and prints the record to add.

## Folder structure

```
deploy/terraform/
├── README.md                 ← this file
├── versions.tf               ← provider + terraform version pins, (commented) S3 backend
├── providers.tf              ← aws provider + default tags
├── variables.tf              ← all root variables
├── main.tf                   ← wires the six modules
├── outputs.tf                ← IP, RDS endpoint, secret ARNs, DNS status
├── terraform.tfvars.example  ← copy → terraform.tfvars
└── modules/
    ├── networking/           ← VPC, subnets, IGW, routes, security groups
    ├── iam/                  ← EC2 role + instance profile (least privilege)
    ├── secrets/             ← generated platform secrets + DB master password
    ├── database/            ← RDS Postgres (backups + PITR) + connection secret
    ├── compute/             ← EC2, Elastic IP, CloudWatch log groups, bootstrap
    └── dns/                 ← optional Route53 records
```

## Module breakdown

| Module | Owns | Key inputs | Key outputs |
|---|---|---|---|
| `networking` | VPC, public/private subnets, IGW, routes, EC2 + RDS security groups | `vpc_cidr`, `allowed_web_cidrs`, `enable_ssh` | subnet ids, SG ids |
| `iam` | EC2 role + instance profile, least-priv policies | `secrets_prefix/_env`, `project/environment` | `instance_profile_name` |
| `secrets` | Generates + stores platform secrets; generates DB password | `resend_api_key`, `admin_username` | `platform_secret_arn`, `db_master_password` |
| `database` | RDS + subnet group + connection secret | subnet ids, SG id, `db_master_password`, backup/PITR settings | `endpoint`, `secret_arn` |
| `compute` | EC2 host, Elastic IP, CloudWatch log groups, Docker bootstrap | subnet id, SG id, instance profile | `public_ip`, `instance_id`, `log_group_names` |
| `dns` | Optional Route53 wildcard + apex | `manage_dns`, `route53_zone_id`, `target_ip` | `status` |

---

## Prerequisites

- Terraform ≥ 1.5, AWS credentials with rights to create the above.
- (Recommended) a versioned, encrypted **S3 state backend** — Terraform state holds the
  generated secrets. Uncomment the `backend "s3"` block in `versions.tf` before applying
  for real; a laptop-local state is fine only for a throwaway trial.

## Configure & deploy the infra

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in resend_api_key, region, domain…

terraform init
terraform validate          # must pass
terraform plan -out tf.plan # review — nothing is created yet
terraform apply tf.plan     # only when you're ready
```

Note the outputs: `ec2_public_ip`, `rds_endpoint`, `platform_secret_arn`,
`database_secret_arn`, `dns_status`.

---

## After apply — bring the stack up

Terraform stopped at infrastructure. These steps run **on the box**.

**1. Connect (no SSH needed)**
```bash
aws ssm start-session --target <ec2_instance_id>
sudo su - ec2-user
```

**2. Get the code + build the per-anchor image**
```bash
git clone <your repo> nordstern && cd nordstern
docker build -t nordstern/business-server:dev anchor-template/business-server
```

**3. Create the platform databases on RDS** (the host can reach RDS; anchordb already exists)
```bash
# creds come from the database secret
eval "$(aws secretsmanager get-secret-value --secret-id nordstern/pilot/database \
  --query SecretString --output text | \
  python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"export DBH={d[chr(39)+\"DB_HOST\"+chr(39)]} DBU={d[\"DB_USER\"]} PGPASSWORD={d[\"DB_PASSWORD\"]}")')"
for db in platformdb controldb aggregatordb; do
  psql -h "$DBH" -U "$DBU" -d anchordb -c "CREATE DATABASE $db;"
done
```
*(Or just paste the three `CREATE DATABASE` lines — mirrors `deploy/pg-init.sql`.)*

**4. Build the root `.env` from Secrets Manager + prod values**
```bash
aws secretsmanager get-secret-value --secret-id nordstern/pilot/platform \
  --query SecretString --output text | python3 -c '
import sys,json
d=json.load(sys.stdin)
for k,v in d.items(): print(f"{k}={v}")' > .env

# Append prod runtime config (RDS + HTTPS + real domain):
cat >> .env <<VARS
NODE_ENV=production
DB_HOST=<rds_address>
DATABASE_URL=postgresql://<user>:<pass>@<rds_address>:5432/platformdb
ANCHOR_CONFIG_HOST_ROOT=/home/ec2-user/nordstern/anchor-configs
ANCHOR_DOMAIN_SUFFIX=nordstern.live
ANCHOR_PUBLIC_SCHEME=https
ANCHOR_TRAEFIK_ENTRYPOINT=websecure
ANCHOR_TRAEFIK_CERTRESOLVER=le
CONSOLE_URL=https://app.nordstern.live
VARS
mkdir -p anchor-configs
```

**5. Prod compose overrides** — the committed `infrastructure/docker/platform.yml` targets the
local `db` container and plain HTTP. Add a `infrastructure/docker/production.yml` on the box that:
- repoints every `DATABASE_URL` at the RDS endpoint (`platformdb`, `controldb`,
  `aggregatordb`);
- sets `platform-api` `NODE_ENV=production` and passes `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  (so the fail-closed secrets guard is satisfied);
- adds a Traefik **`websecure` (:443)** entrypoint + a Let's Encrypt cert resolver named
  `le`, an HTTP→HTTPS redirect, and (ideally) DNS-01 wildcard so `*.nordstern.live` gets
  one cert. Example Traefik command additions:
  ```
  --entrypoints.websecure.address=:443
  --entrypoints.web.http.redirections.entrypoint.to=websecure
  --certificatesresolvers.le.acme.email=ops@nordstern.live
  --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
  --certificatesresolvers.le.acme.tlschallenge=true
  ```
  and remove the public `8090` Traefik dashboard + `5432` DB port mappings.

**6. Bring it up**
```bash
docker compose -f infrastructure/docker/platform.yml -f infrastructure/docker/production.yml --env-file .env up -d --build
```

**7. DNS**
- **Route53** (`manage_dns = true`): records already exist — nothing to do.
- **Cloudflare / registrar** (`manage_dns = false`): add the A records printed in the
  `dns_status` output — `*.nordstern.live → <EIP>` and `nordstern.live → <EIP>`. Keep the
  existing Resend SPF/DKIM records.

**8. Smoke tests** (routing smoke tests)
- `https://app.nordstern.live/login`, `/register`, `/admin/login` load over TLS.
- **Founder:** submit → approve in `/admin` → redeem → an anchor goes live at
  `https://<slug>.nordstern.live` → live email arrives.
- **Customer:** `https://<slug>.nordstern.live/.well-known/stellar.toml` served over TLS;
  wallet SEP-10 + SEP-24 deposit → on-chain receipt; AP tx `completed`.
- **Operator:** OTP login at `console-<slug>.nordstern.live`; treasury/transactions load.

---

## Teardown

```bash
terraform destroy
```
Set `db_deletion_protection = false` and `db_skip_final_snapshot = true` (defaults) to
allow a clean pilot teardown. Per-anchor secrets the app created under
`nordstern/testnet/anchor/*` are **not** in Terraform state — delete them separately if
you want a spotless account.

## Cost (rough, pilot)

- EC2 `t3.large` ≈ $0.10/hr — **stop it when not demoing**; a stopped instance bills only
  EBS (~$5/mo for 60 GB gp3).
- RDS `db.t3.small` ≈ $25/mo; storage + backups a few dollars.
- Elastic IP: free while attached to a running instance.
- Comfortably inside a $100 credit for a multi-week pilot if you stop-when-idle.

## Security notes

- Least privilege throughout: RDS is private; the DB SG only admits the host SG; the IAM
  role is scoped to the exact secret paths + log groups the app uses; access is via SSM,
  not open SSH.
- **State contains secrets** — use the encrypted S3 backend for anything shared.
- Mainnet / real money is a **separate go-live gate** (AGENTS.md §7). This stack is
  testnet: keep `secrets_env = "testnet"` and `ANCHOR_PUBLIC_SCHEME`/network on testnet.
