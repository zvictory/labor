#!/usr/bin/env bash
# Labor — first-run bootstrap on a fresh Contabo VPS.
# Run AFTER `git clone` + `cp .env.example .env` (filled in).
# Idempotent: safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "==> ERROR: .env not found. Copy .env.example and fill in secrets first." >&2
  exit 1
fi

echo "==> 1/6  Pulling images"
docker compose -f infra/docker-compose.yml pull --ignore-pull-failures

echo "==> 2/6  Building local images"
docker compose -f infra/docker-compose.yml build

echo "==> 3/6  Starting datastores"
docker compose -f infra/docker-compose.yml up -d postgres redis

echo "==> 4/6  Waiting for postgres..."
until docker compose -f infra/docker-compose.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-labor}" >/dev/null 2>&1; do
  sleep 2
done

echo "==> 5/6  Creating + migrating + seeding DB"
docker compose -f infra/docker-compose.yml run --rm backend \
  bash -lc "bundle exec rails db:prepare && bundle exec rails db:seed"

echo "==> 6/6  Bringing up backend, sidekiq, web, bot, nginx"
docker compose -f infra/docker-compose.yml up -d

echo "==> Bootstrap complete."
echo "    Storefront: http://$(hostname -I | awk '{print $1}'):3001"
echo "    Backend  : http://$(hostname -I | awk '{print $1}'):3000"
echo "    Admin    : http://$(hostname -I | awk '{print $1}'):3000/admin"
