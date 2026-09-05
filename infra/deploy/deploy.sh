#!/usr/bin/env bash
# Labor — rolling deploy to Contabo VPS
# Usage: ./deploy.sh [staging|prod]

set -euo pipefail

ENV="${1:-prod}"
case "$ENV" in
  prod)
    SSH_HOST="${LABOR_SSH_HOST:-labor-prod}"
    SSH_USER="${LABOR_SSH_USER:-root}"
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
# Only postgres, redis and nginx come from a registry. The other seven services
# are built from this checkout, so --ignore-buildable keeps pull from warning
# about images that will never exist, and --build is what actually deploys the
# code: without it `up -d` sees the same compose definition, leaves the running
# containers alone, and the deploy reports success having shipped nothing.
docker compose -f infra/docker-compose.yml pull --ignore-buildable
docker compose -f infra/docker-compose.yml up -d --build --remove-orphans
# nginx resolves its upstreams once, at startup, and holds the addresses. The
# rebuild above recreates every application container on a new address, so nginx
# keeps proxying to the old ones and every request returns 502 — the site went
# down this way the first time --build was used. It is not restarted by the line
# above because its own image and config did not change.
docker compose -f infra/docker-compose.yml restart nginx
# `< /dev/null` on both, and it is load-bearing. This script reaches the server
# as ssh's stdin, and `exec -T` reads stdin — so without it the rails command
# swallows the rest of the script. Everything below these two lines silently
# never ran, including the image prune that has been in this script from the
# start, and the shell then reached EOF and exited 0.
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails db:migrate < /dev/null
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails tmp:clear < /dev/null
docker image prune -f

# Fail the deploy if the site is not actually answering. Everything above can
# report success while nginx serves 502s to every visitor.
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost/ || echo 000)
  case "\$code" in
    2*|3*) echo "--> site answering: \$code"; break ;;
    *) if [ "\$i" = 10 ]; then echo "--> site NOT answering after 10 tries (last: \$code)" >&2; exit 1; fi
       sleep 3 ;;
  esac
done
echo "--> now running:"
git log --oneline -1
EOF

echo "==> Deploy to $ENV complete"
