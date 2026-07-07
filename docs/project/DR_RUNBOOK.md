# NordStern — Disaster Recovery Runbook (R6 M5)

> The recovery path that must exist **before** any money or tenant database is
> migrated (M4.2+). Backup + restore are real scripts, proven by an executed drill
> that also runs in CI on every PR.

## Guiding principle
**Never migrate a money database without a tested backup and a proven restore.**
The `dr-drill` CI check enforces this continuously: if backup or restore ever breaks,
CI goes red.

## What holds money / tenant data

| Database | Owner | Contains |
|---|---|---|
| `anchordb` (schema `nordstern`) | business-server | **money**: `deposit_releases`, `withdrawal_payouts`, KYC, payments |
| `controldb` | control-plane | tenants, provisioning, anchor secrets refs |
| `nordstern_platform` | platform/api | orgs, users, anchors, applications, `secret_refs` |
| _AWS Secrets Manager_ | SecretStore | PSP/banking **secret values** (NOT in Postgres — see reconciliation) |

## Targets (proposed; ratify with ops)
- **RPO** (max data loss): ≤ 15 min in prod (WAL/PITR or 15-min dump cadence). Dev: per-run.
- **RTO** (max downtime): ≤ 30 min for a single-DB restore.

## Tooling
- **`scripts/backup.sh <DATABASE_URL> [OUT_DIR]`** — `pg_dump` custom-format (compressed,
  selective/parallel-restore capable) + SHA-256 sidecar. Portable across compose/host/prod.
- **`scripts/restore.sh <DUMP_FILE> <DATABASE_URL>`** — verifies checksum, then
  `pg_restore --clean --if-exists`.
- **`scripts/dr-drill.sh <SCRATCH_DATABASE_URL>`** — the self-verifying drill (seed → backup
  → destroy → restore → assert money data intact).

## Backup procedure (per database)
```bash
scripts/backup.sh postgres://anchor:anchor@<host>:5432/anchordb  /backups/anchordb
scripts/backup.sh postgres://…/controldb            /backups/controldb
scripts/backup.sh postgres://…/nordstern_platform   /backups/platform
```
**Scheduling:** run the above from cron / a K8s CronJob at the RPO cadence, writing to
a mount that is shipped off-box (S3, EBS snapshot). `backup.sh` is the reusable unit —
scheduling is environment-specific and lives in deploy config, not here. In prod prefer
managed automated backups + PITR (RDS/Aurora) in addition to logical dumps.

## Restore procedure
```bash
# 1. Snapshot the current (damaged) DB first — never restore over the only copy.
scripts/backup.sh <DATABASE_URL> /backups/pre-restore
# 2. Restore the chosen dump.
scripts/restore.sh /backups/anchordb/anchordb_<ts>.dump <DATABASE_URL>
# 3. Reconcile secrets (below), then bring services up and verify money tables.
```

## Secret-store reconciliation (critical, easy to miss)
Credential **values** live in AWS Secrets Manager, not Postgres — the DB stores only
`secret_refs` (pointers + key names). Therefore:
- A DB restore brings back the **refs**, not the values.
- **Prod:** values are durable + versioned in Secrets Manager; nothing to restore — the
  restored refs resolve against the still-present secrets. Confirm each ref's `secret_path`
  still exists post-restore.
- **Dev/LocalStack:** LocalStack community is **ephemeral** — secret values are lost on
  restart. After a dev restore, **re-provision** credentials for affected anchors.

## Order of restore
`nordstern_platform` / `controldb` (control plane) → `anchordb` (per-anchor money) →
reconcile secrets → start services → verify.

## Executed drill evidence (proof the path works)
`scripts/dr-drill.sh` run against a real Postgres 15 (client == server 15):
```
== 1. seed representative money + tenant data ==
   seeded: deposits=2 withdrawals=1 digest=2f9cccf50c5826be8aac6c14f93ddcad
== 2. BACKUP (scripts/backup.sh) ==
[backup] moneydb -> …/moneydb_20260707T111142Z.dump  (sha256 d16e47…)
== 3. DISASTER: destroy the money data ==
   money tables destroyed ✓
== 4. RESTORE (scripts/restore.sh) ==
   moneydb_…dump: OK   (checksum verified)
== 5. VERIFY money data intact ==
   restored: deposits=2 withdrawals=1 digest=2f9cccf50c5826be8aac6c14f93ddcad
== ✅ DR DRILL PASSED: money data fully recovered ==
```
The pre- and post-restore content digests are **identical** → byte-for-byte recovery.
This same drill runs as the **`dr-drill`** CI check on every PR.

## What M5 does NOT yet include (future)
- Automated off-box shipping (S3) + retention/rotation policy — wire in R7 (K8s/AWS).
- Point-in-time recovery (WAL archiving) — comes with managed Postgres in R7.
- Backup encryption at rest — provided by the storage layer (S3 SSE / EBS) in prod.

## M4.2 gate
Business-server (money DB) migrations may proceed **only** after: this runbook's
restore procedure is exercised against a business-server-shaped DB and the `dr-drill`
check is green. ✅ The drill above already proves restore of `deposit_releases` /
`withdrawal_payouts` shaped data.
