#!/bin/bash
# Restore the pg_dumpall cluster backup from Supabase.
# Runs once at first container startup (Postgres auto-executes files in this dir).
#
# Strategy:
# - The backup is a pg_dumpall plain-SQL dump; pipe through psql.
# - ON_ERROR_STOP=0 so Supabase-cloud-only objects (pgsodium keys, vault,
#   realtime config, etc.) that can't restore in a plain cluster just log
#   warnings instead of aborting the whole restore.
# - The public schema + auth schema (what GoTrue and the app need) load
#   regardless of those failures.

set -u

BACKUP="/backup/db_cluster.backup.gz"

if [ ! -f "$BACKUP" ]; then
  echo "!!! Backup file not found at $BACKUP; skipping restore."
  echo "!!! Mount the backup in docker-compose.yml under the db service."
  exit 0
fi

echo ">>> Restoring cluster backup from $BACKUP"
echo ">>> (Supabase-cloud-only object errors are expected and ignored)"

gunzip -c "$BACKUP" | psql \
  --username="$POSTGRES_USER" \
  --dbname=postgres \
  --set=ON_ERROR_STOP=off \
  --set=client_min_messages=WARNING \
  --quiet \
  2>&1 | grep -vE "^(psql:|SET|CREATE|ALTER|REVOKE|GRANT|COMMENT|INSERT|SELECT|DROP)" | tail -100 \
  || echo ">>> Restore finished (some non-fatal errors above are OK)"

echo ">>> Backup restore complete."
