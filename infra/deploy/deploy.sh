#!/usr/bin/env bash
# Labor — rolling deploy to Contabo VPS
# Usage: ./deploy.sh [staging|prod]

set -euo pipefail

ENV="${1:-prod}"
case "$ENV" in
  prod)
    SSH_HOST="${LABOR_SSH_HOST:-labor.uz}"
    SSH_USER="${LABOR_SSH_USER:-deploy}"
    REMOTE_DIR="/srv/labor"
    ;;
  staging)
    SSH_HOST="${LABOR_STAGING_SSH_HOST:-staging.labor.uz}"
    SSH_USER="${LABOR_STAGING_SSH_USER:-deploy}"
    REMOTE_DIR="/srv/labor-staging"
    ;;
  *)
    echo "Unknown env: $ENV" >&2
    exit 1
    ;;
esac

echo "==> Deploying to $ENV ($SSH_USER@$SSH_HOST:$REMOTE_DIR)"

ssh "$SSH_USER@$SSH_HOST" <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
git fetch --all --prune
git reset --hard origin/main
docker compose -f infra/docker-compose.yml pull
docker compose -f infra/docker-compose.yml up -d --remove-orphans
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails db:migrate
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails tmp:clear
docker image prune -f
EOF

echo "==> Deploy to $ENV complete"
