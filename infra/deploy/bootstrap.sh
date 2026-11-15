#!/usr/bin/env bash
# Labor — first run on a fresh VPS.
# Run AFTER `git clone` + `cp .env.example .env` (filled in), and with the TLS
# certificate in infra/nginx/certs. Idempotent: safe to re-run.
# Later releases go out with infra/deploy/deploy.sh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "==> ERROR: .env not found. Copy .env.example and fill in secrets first." >&2
  exit 1
fi

COMPOSE="docker compose -f infra/docker-compose.yml"

echo "==> 1/5  Photo volume"
# External in the compose file, so compose never creates it. On a moved server,
# restore the old /storage files into it before the site goes live.
docker volume inspect labor_backend_storage >/dev/null 2>&1 || docker volume create labor_backend_storage

echo "==> 2/5  Pulling and building images"
$COMPOSE pull --ignore-buildable
$COMPOSE build store

echo "==> 3/5  Starting postgres"
$COMPOSE up -d postgres
until $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-labor}" >/dev/null 2>&1; do
  sleep 2
done

echo "==> 4/5  Store database and migrations"
# The store's database is STORE_DB (labor_store), next to POSTGRES_DB.
STORE_DB="$(grep -E '^STORE_DB=' .env | cut -d= -f2- || true)"
STORE_DB="${STORE_DB:-labor_store}"
$COMPOSE exec -T postgres sh -c \
  "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tc \"SELECT 1 FROM pg_database WHERE datname = '$STORE_DB'\" | grep -q 1 \
   || createdb -U \"\$POSTGRES_USER\" '$STORE_DB'" < /dev/null
$COMPOSE run --rm -T store \
  sh -c 'npx -y prisma@$(node -p "require(\"@prisma/client/package.json\").version") migrate deploy' < /dev/null

echo "==> 5/5  Starting store and nginx"
$COMPOSE up -d

echo "==> Bootstrap complete: https://laborparfum.com/ru"
