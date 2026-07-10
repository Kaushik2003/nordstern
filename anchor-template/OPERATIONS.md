# NordStern Standalone Anchor Kit — Operations Playbook

This document describes self-hosting deployment options and operational procedures for managing a production standalone anchor.

---

## 🚀 1. Deployment Options

### Option A: Single VM (Docker Compose) + Managed Database (Recommended for Pilots)
A simple, low-cost architecture matching the Terraform pilot in `deploy/terraform`:
* **Compute**: AWS EC2 (t3.medium) or Google Compute Engine VM running Docker.
* **Database**: AWS RDS Postgres or GCP Cloud SQL (PostgreSQL 15+).
* **Secrets**: AWS Secrets Manager or GCP Secret Manager.
* **SSL/Ingress**: Let's Encrypt with Traefik, Nginx, or Cloudflare Tunnels (Tunnels handle NAT/SSL out of the box).

### Option B: Container Orchestration (ECS / Cloud Run)
For higher availability and horizontal scaling:
* **Compute**: AWS ECS Fargate or Google Cloud Run.
  * Run `anchor-platform` as a service.
  * Run `business-server` as a service.
  * Run `console` and `anchor-client` as front-end services.
* **Database**: Multi-AZ RDS / Cloud SQL.
* **Caching (Optional)**: Redis for rate cache and session tokens.

---

## 🔑 2. Stellar Key Rotation Playbook

Rotating keys is a critical operation. Since the treasury key holds the USDC float (on-chain), rotate it carefully to prevent loss of funds.

### A. Rotating the SEP-10 Signing Key
The SEP-10 signing key is used solely for signing challenge transactions. Rotating it does not affect on-chain funds.
1. Generate a new Stellar keypair for signing.
2. Edit `.env` and update `SIGNING_PUBLIC` and `SIGNING_SECRET`.
3. Re-run `node scripts/setup-testnet.mjs` (or manually run the config renderer) to update `config/stellar.toml`.
4. Restart the `anchor-platform` and `business-server` containers.
5. Verification: Verify you can log in to the Customer app (uses SEP-10 auth).

### B. Rotating the Treasury Key (Float Account)
The treasury account holds the USDC float and requires active trustlines.
1. **Prepare New Account**: Generate a new treasury keypair. Fund it with enough XLM for transaction fees and reserves.
2. **Establish Trustline**: Submit a `changeTrust` transaction for the asset (USDC) from the new treasury account.
3. **Transfer Float**: Send the USDC balance from the old treasury account to the new treasury account.
4. **Update Configuration**: Update `TREASURY_PUBLIC` and `TREASURY_SECRET` in `.env`.
5. **Re-render config**: Re-run the configuration renderer (or `make setup`) to update `config/assets.yaml` with the new `distribution_account` (treasury).
6. **Restart stack**: Restart all services.

---

## 💾 3. Database Backups and Restore

The Postgres `anchordb` is the source of truth for all transaction statuses and local customer identity mappings.

### Backup (pg_dump)
Create a compressed backup file:
```bash
docker compose exec db pg_dump -U anchor -d anchordb -F c -b -v -f /var/lib/postgresql/data/anchordb_backup.dump
```
Copy the dump file out of the volume to secure storage (e.g. AWS S3):
```bash
docker cp $(docker compose ps -q db):/var/lib/postgresql/data/anchordb_backup.dump ./anchordb_backup.dump
```

### Restore (pg_restore)
1. Stop the application services to prevent database writes:
   ```bash
   docker compose stop anchor-platform business-server console anchor-client
   ```
2. Copy the backup file into the db container volume.
3. Run the restore command:
   ```bash
   docker compose exec db pg_restore -U anchor -d anchordb -c -v /var/lib/postgresql/data/anchordb_backup.dump
   ```
4. Restart the services:
   ```bash
   docker compose start
   ```

---

## 🔄 4. Software Updates & Migrations

When updating the Business Server code or pulling a new Anchor Platform release:
1. **Pull Images**: `docker compose pull` (or rebuild custom components: `docker compose build`).
2. **Run Migrations**: The `business-server` runs knex-migrate automatically on startup.
3. **Rolling Updates**: If using ECS or Cloud Run, apply rolling updates to prevent downtime for wallets fetching the `stellar.toml` file.

---

## 🚨 5. Disaster Recovery & Reconciliation

If a transaction gets stuck (e.g., bank payout fails or Stellar transaction drops from the mempool):
1. Locate the stuck transaction ID in the **Operator Console**.
2. **Deposit Re-drive**: If the Stellar USDC payment failed to submit, click **Retry** in the console. The reconciler will verify the status and resubmit safely.
3. **Withdrawal Payout Re-drive**: If Cashfree/Razorpay payout timed out, check the bank statement to verify if funds left the account. If not, click **Retry** to dispatch the transfer again. If funds did leave, click **Force Settle** and input the bank transfer reference ID.
