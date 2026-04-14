#!/bin/bash
# Nuke + re-restore the local Postgres volume. Use when the DB is in a bad
# state or you want a clean slate from the backup.
set -euo pipefail

cd "$(dirname "$0")/.."

echo ">>> Stopping stack and removing the db-data volume..."
docker compose down -v

echo ">>> Bringing the stack back up (will re-run init scripts)..."
docker compose up -d

echo ">>> Tailing db logs (Ctrl-C when you see 'database system is ready')..."
docker compose logs -f db
