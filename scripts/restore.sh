#!/usr/bin/env bash
# scripts/restore.sh — restore a custom-format pg_dump backup into a target database
# (R6 M5). Verifies the checksum sidecar first, then restores idempotently.
#
# Usage:  scripts/restore.sh <DUMP_FILE> <DATABASE_URL>
#   e.g.  scripts/restore.sh ./backups/anchordb_20260707T110000Z.dump \
#              postgres://anchor:anchor@localhost:5432/anchordb
#
# DANGER: --clean drops-then-recreates the objects in the dump. Restore into a
# scratch/target DB, or one you intend to overwrite. Always snapshot first in prod.
set -euo pipefail

FILE="${1:?Usage: restore.sh <DUMP_FILE> <DATABASE_URL>}"
DB_URL="${2:-${DATABASE_URL:?target DATABASE_URL required}}"
[ -f "$FILE" ] || { echo "[restore] no such file: $FILE" >&2; exit 1; }

if [ -f "${FILE}.sha256" ]; then
  echo "[restore] verifying checksum…" >&2
  ( cd "$(dirname "$FILE")" \
      && { sha256sum -c "$(basename "$FILE").sha256" 2>/dev/null \
           || shasum -a 256 -c "$(basename "$FILE").sha256"; } )
fi

echo "[restore] ${FILE} -> ${DB_URL}" >&2
# --clean --if-exists makes the restore idempotent even into a previously-used DB.
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DB_URL" "$FILE"
echo "[restore] complete" >&2
