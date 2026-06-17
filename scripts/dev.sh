#!/usr/bin/env bash
# dev.sh — start the full Labor dev stack
#
# Usage: npm run dev:all  (from repo root)
#
# What it does:
#   1. Brings up infra in Docker (postgres, redis, backend, sidekiq) — NOT the
#      prod web/bot containers; those have no hot-reload.
#   2. Frees stale dev ports 3001 / 8080 so the run is always idempotent.
#   3. Waits up to 30s for the backend to respond on :4000.
#   4. Runs web (next dev -p 3001) + bot (tsx watch) via turbo in the foreground.
#      Ctrl-C stops web+bot; Docker infra keeps running.
#
# Stop infra:
#   docker compose -f infra/docker-compose.yml --env-file .env stop

set -euo pipefail
cd "$(dirname "$0")/.."
# Load root .env variables into the shell environment so that turbo/next dev inherit them.
eval "$(node -e '
  const fs = require("fs");
  if (fs.existsSync(".env")) {
    fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      // Remove surrounding quotes if they exist in the .env file
      if ((val.startsWith(`\"`) && val.endsWith(`\"`)) || (val.startsWith(`\x27`) && val.endsWith(`\x27`))) {
        val = val.slice(1, -1);
      }
      console.log(`export ${key}=${JSON.stringify(val)};`);
    });
  }
')"


# ── 1. Docker infra ──────────────────────────────────────────────────────────
echo "▶ backend stack (docker)…"
COMPOSE_ARGS="-f infra/docker-compose.yml"
if [ -f infra/docker-compose.override.yml ]; then
  COMPOSE_ARGS="$COMPOSE_ARGS -f infra/docker-compose.override.yml"
fi
docker compose $COMPOSE_ARGS --env-file .env up -d \
  postgres redis backend sidekiq-high sidekiq-low

# ── 2. Free stale dev ports ───────────────────────────────────────────────────
echo "▶ freeing dev ports ${PORT_WEB:-3011} / ${PORT_STORE:-3012} / ${PORT_BOT:-8081}…"
for p in "${PORT_WEB:-3011}" "${PORT_STORE:-3012}" "${PORT_BOT:-8081}"; do
  lsof -ti tcp:"$p" -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
done

# ── 3. Wait for backend readiness ─────────────────────────────────────────────
echo "▶ waiting for backend on :4000…"
BACKEND_OK=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://localhost:4000/api/v2/storefront/brands?per_page=1" 2>/dev/null; then
    BACKEND_OK=1
    break
  fi
  sleep 1
done
if [ "$BACKEND_OK" -ne 1 ]; then
  echo "⚠  backend not responding on :4000 after 30s — starting web/bot anyway"
fi

# ── 4. Web (3001) + Bot (8080) with hot-reload ────────────────────────────────
echo "▶ web (3001) + bot (8080) with hot-reload — Ctrl-C to stop"
exec npm run dev
