#!/usr/bin/env bash
# Start all services for local development.
# Sources .env.testnet so Docker Compose can substitute ${SIGNING_SECRET} etc.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

if [ ! -f .env.testnet ]; then
  echo "ERROR: .env.testnet not found. Run 'node scripts/setup-testnet.mjs' first."
  exit 1
fi

# Load testnet keypairs into shell so docker compose can substitute them
set -a
source .env.testnet
set +a

echo "Starting Stellar Anchor services..."
docker compose up --build "$@"
