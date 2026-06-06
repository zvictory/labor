---
description: Launch the Labor dev stack — Next.js storefront, Telegram bot, and backend infra
---

# Run: Labor dev stack

## One command

```bash
npm run dev:all
```

Run this from the **repo root** (`/Users/zafar/Documents/labor`).

## What it starts

| Process | Port | Notes |
|---|---|---|
| Web (Next.js 15) | `:3001` | `next dev -p 3001`, full HMR |
| Bot (grammy) | `:8080` | `tsx watch src/index.ts`; runs in **mock mode** unless `TELEGRAM_BOT_TOKEN` in `.env` is a real Telegram token |
| Backend (Rails/Spree) | `:4000` | Docker container; internal port 3000, published on host 4000 |
| Postgres | `:5432` | Docker |
| Redis | `:6379` | Docker |
| Sidekiq | — | Docker (high + low queue workers) |

Port conflicts on `:3001` / `:8080` are cleared automatically by the script — no manual
`lsof | xargs kill` needed.

## Verify it's up

```bash
# Storefront — must return 200 with real brand data
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/ru/brands

# Backend API directly
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/api/v2/storefront/brands?per_page=1

# Bot HTTP server
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/
```

Expected: `200` for all three (bot returns 404 on `/` — that's fine, it means the server is up).

## Stop

- **Web + bot:** Ctrl-C in the terminal running `npm run dev:all`.
- **Docker infra:** `docker compose -f infra/docker-compose.yml --env-file .env stop`
  (do this only if you want to stop postgres/redis/backend too).

## Env

Web reads from `apps/web/.env.local`:
- `INTERNAL_API_URL=http://localhost:4000` (SSR/RSC calls)
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api` (browser calls)

Root `.env` is loaded by docker-compose for Postgres credentials etc. Do **not** commit it.

## Important: do NOT use the compose web/bot services for dev

`infra/docker-compose.yml` defines `web:` and `bot:` services, but they are **production
builds** — `next build`, `restart: unless-stopped`, no hot-reload. Always use
`npm run dev:all` for daily development.
