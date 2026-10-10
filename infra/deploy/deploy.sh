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

# Keepalives: the image build runs for minutes without printing, and an idle
# connection was dropped mid-build, which stops the script on the server after
# the build (it is read from this ssh session) — so nginx was never restarted.
# The heredoc is unquoted so $REMOTE_DIR expands here; that also means a
# backtick anywhere below, comments included, runs on THIS machine. Use quotes.
ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=20 "$SSH_USER@$SSH_HOST" <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
git fetch --all --prune
git reset --hard origin/main
# Only postgres, redis and nginx come from a registry. The other seven services
# are built from this checkout, so --ignore-buildable keeps pull from warning
# about images that will never exist, and --build is what actually deploys the
# code: without it 'up -d' sees the same compose definition, leaves the running
# containers alone, and the deploy reports success having shipped nothing.
docker compose -f infra/docker-compose.yml pull --ignore-buildable
# The store's Prisma migrations, run from the freshly built image before any
# container is replaced, so the new code never starts on the old schema; the old
# store keeps serving meanwhile, as long as migrations stay additive. prisma is a
# devDependency, absent from the runtime image, so npx fetches it, pinned to the
# @prisma/client version the image ships, never latest. A failure stops the
# deploy here under set -e, with the old containers still up.
docker compose -f infra/docker-compose.yml build store
docker compose -f infra/docker-compose.yml run --rm -T store \
  sh -c 'npx -y prisma@\$(node -p "require(\"@prisma/client/package.json\").version") migrate deploy' < /dev/null
docker compose -f infra/docker-compose.yml up -d --build --remove-orphans
# nginx resolves its upstreams once, at startup, and holds the addresses. The
# rebuild above recreates every application container on a new address, so nginx
# keeps proxying to the old ones and every request returns 502 — the site went
# down this way the first time --build was used. It is not restarted by the line
# above because its own image and config did not change.
docker compose -f infra/docker-compose.yml restart nginx
# '< /dev/null' on both, and it is load-bearing. This script reaches the server
# as ssh's stdin, and 'exec -T' reads stdin — so without it the rails command
# swallows the rest of the script. Everything below these two lines silently
# never ran, including the image prune that has been in this script from the
# start, and the shell then reached EOF and exited 0.
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails db:migrate < /dev/null
docker compose -f infra/docker-compose.yml exec -T backend bundle exec rails tmp:clear < /dev/null
docker image prune -f

# Fail the deploy if the store is not actually rendering pages. Everything above
# can report success while nginx serves 502s to every visitor. The request goes
# to port 443 for a store page, and only 200 passes: on port 80 nginx answers
# every path with a 301 to https by itself, so that check passed with the store
# down. /ru is rendered per request from the database (the store layout is
# force-dynamic), so a 200 means nginx, the store and Postgres all answered.
# -k because the certificate is issued for the domain, not for localhost.
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=\$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 https://localhost/ru || true)
  case "\$code" in
    200) echo "--> site answering: \$code"; break ;;
    *) if [ "\$i" = 10 ]; then echo "--> site NOT answering after 10 tries (last: \$code)" >&2; exit 1; fi
       sleep 3 ;;
  esac
done
echo "--> now running:"
git log --oneline -1
EOF

echo "==> Deploy to $ENV complete"
