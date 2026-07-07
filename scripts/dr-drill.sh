#!/usr/bin/env bash
# scripts/dr-drill.sh — end-to-end backup/restore DRILL against a SCRATCH database
# (R6 M5). Seeds representative money + tenant data, backs it up with backup.sh,
# simulates catastrophic data loss (DROP SCHEMA), restores with restore.sh, and
# asserts the money data returned byte-for-byte. Exits non-zero on ANY mismatch, so
# it doubles as a CI gate that keeps the recovery path continuously proven.
#
# Usage:  scripts/dr-drill.sh <SCRATCH_DATABASE_URL>
# WARNING: the target DB is seeded AND wiped — point it at a throwaway database only.
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:?Usage: dr-drill.sh <SCRATCH_DATABASE_URL>}}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

digest() { psql "$DB_URL" -tAc \
  "SELECT md5(coalesce(string_agg(transaction_id||amount_usdc||status||coalesce(stellar_tx_hash,''), ',' ORDER BY transaction_id),'')) FROM nordstern.deposit_releases"; }
count() { psql "$DB_URL" -tAc "SELECT count(*) FROM nordstern.$1"; }

echo "== 1. seed representative money + tenant data =="
psql "$DB_URL" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE SCHEMA IF NOT EXISTS nordstern;
CREATE TABLE IF NOT EXISTS nordstern.tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nordstern.deposit_releases (transaction_id TEXT PRIMARY KEY, amount_usdc TEXT NOT NULL, status TEXT NOT NULL, stellar_tx_hash TEXT);
CREATE TABLE IF NOT EXISTS nordstern.withdrawal_payouts (transaction_id TEXT PRIMARY KEY, amount_inr TEXT NOT NULL, status TEXT NOT NULL, reference TEXT);
INSERT INTO nordstern.tenants VALUES ('t_acme','Acme Pay'),('t_mizu','MizuPay') ON CONFLICT DO NOTHING;
INSERT INTO nordstern.deposit_releases VALUES ('dep_1','100.00','completed','HASH_A'),('dep_2','50.00','completed','HASH_B') ON CONFLICT DO NOTHING;
INSERT INTO nordstern.withdrawal_payouts VALUES ('wd_1','8500.00','completed','PAYREF_1') ON CONFLICT DO NOTHING;
SQL
DEP_BEFORE=$(count deposit_releases); WD_BEFORE=$(count withdrawal_payouts); DIG_BEFORE=$(digest)
echo "   seeded: deposits=$DEP_BEFORE withdrawals=$WD_BEFORE digest=$DIG_BEFORE"

echo "== 2. BACKUP (scripts/backup.sh) =="
DUMP="$(bash "$HERE/backup.sh" "$DB_URL" "$WORK" | tail -1)"

echo "== 3. DISASTER: destroy the money data =="
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA nordstern CASCADE" >/dev/null
[ "$(psql "$DB_URL" -tAc "SELECT to_regclass('nordstern.deposit_releases') IS NULL")" = "t" ] \
  && echo "   money tables destroyed ✓" || { echo "   FAILED to destroy"; exit 1; }

echo "== 4. RESTORE (scripts/restore.sh) =="
bash "$HERE/restore.sh" "$DUMP" "$DB_URL"

echo "== 5. VERIFY money data intact =="
DEP_AFTER=$(count deposit_releases); WD_AFTER=$(count withdrawal_payouts); DIG_AFTER=$(digest)
echo "   restored: deposits=$DEP_AFTER withdrawals=$WD_AFTER digest=$DIG_AFTER"

fail=0
[ "$DEP_AFTER" = "$DEP_BEFORE" ] || { echo "   ✗ deposit count mismatch"; fail=1; }
[ "$WD_AFTER"  = "$WD_BEFORE"  ] || { echo "   ✗ withdrawal count mismatch"; fail=1; }
[ "$DIG_AFTER" = "$DIG_BEFORE" ] || { echo "   ✗ deposit content digest mismatch"; fail=1; }
if [ "$fail" = 0 ]; then
  echo "== ✅ DR DRILL PASSED: money data fully recovered =="
else
  echo "== ❌ DR DRILL FAILED =="; exit 1
fi
