---
description: Launch the Labor store locally — Next.js dev server on a local Postgres, no Docker
---

# Run: the Labor store

## One command

```bash
npm run dev -w apps/store
```

From the repo root. It serves http://localhost:3012 (`PORT_STORE` overrides) with hot
reload. Stop with Ctrl-C.

## What it needs

| What     | How                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Postgres | Homebrew `postgresql@16` on `localhost:5432`: `brew services start postgresql@16`. `psql` is at `/opt/homebrew/opt/postgresql@16/bin/psql` |
| Env      | `apps/store/.env`, with `DATABASE_URL` pointing at the local `labor_store` database. Never commit it.                                |
| Schema   | after pulling new migrations: `npx -w apps/store prisma migrate deploy`                                                              |

The Telegram bot lives inside the store (`lib/telegram/`). Locally it receives nothing
unless `TELEGRAM_BOT_TOKEN` is real and a webhook points at a public URL, so test bot
replies on production or through a tunnel.

## Verify it's up

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3012/ru
```

Expect `200`. The admin is at http://localhost:3012/ru/admin.

## Don't

- Don't start Docker or `infra/docker-compose.yml` locally: that file is production only.
