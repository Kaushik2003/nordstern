#!/usr/bin/env bash
# scripts/backup.sh — back up one Postgres database to a timestamped, compressed,
# checksummed dump (R6 M5). Portable: uses pg_dump from PATH, so it works against the
# compose stack, a bare host, or (in prod) a managed instance — only the URL changes.
#
# Usage:  scripts/backup.sh <DATABASE_URL> [OUT_DIR]
#   e.g.  scripts/backup.sh postgres://anchor:anchor@localhost:5432/anchordb ./backups
#
# Prod note: point OUT_DIR at a mount that is shipped off-box (S3/EBS snapshot). The
# dump is custom-format so it supports selective + parallel restore and --clean.
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:?Usage: backup.sh <DATABASE_URL> [OUT_DIR]}}"
OUT_DIR="${2:-${BACKUP_DIR:-./backups}}"
mkdir -p "$OUT_DIR"

DB_NAME="$(printf '%s' "$DB_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/${DB_NAME}_${TS}.dump"

echo "[backup] ${DB_NAME} -> ${FILE}" >&2
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$FILE"

# Checksum sidecar (linux: sha256sum, macOS: shasum) for restore-time integrity checks.
base="$(basename "$FILE")"
( cd "$OUT_DIR" && { sha256sum "$base" 2>/dev/null || shasum -a 256 "$base"; } > "${base}.sha256" )
echo "[backup] size=$(du -h "$FILE" | cut -f1) sha256=$(cut -d' ' -f1 "$FILE.sha256")" >&2

# Emit the dump path on stdout so callers (dr-drill, cron) can capture it.
echo "$FILE"
