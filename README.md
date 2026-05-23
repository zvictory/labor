# Labor

Multi-brand fragrance ecommerce for the Uzbekistan market — Spree backend, Next.js storefront, Telegram mini-app, payments via Click/Payme/Uzum, delivery via Yandex/Express24/BTS.

## Quickstart

```bash
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN, payment keys, etc.
docker compose -f infra/docker-compose.yml up -d postgres redis
npm install
npm run dev
```

Web: http://localhost:3001
Backend: http://localhost:3000
Bot: long-polling (no port)

## Apps

| Path | Description |
|---|---|
| `apps/backend` | Spree on Rails 7 — catalog, orders, admin, API |
| `apps/web` | Next.js storefront — public site + `/tg` Telegram mini-app |
| `apps/bot` | grammy Telegram bot — commands, notifications, broadcasts |

## Packages

| Path | Description |
|---|---|
| `packages/api-client` | TS types + fetcher for Spree Storefront/Platform APIs |
| `packages/ui` | Shared shadcn components |
| `packages/i18n` | Message catalogs for ru/en/uz/uzc |
| `packages/tg` | Telegram WebApp helpers (initData verify, theme, haptics) |

## Documentation

- [Design doc](docs/plans/2026-05-21-labor-parfum-design.md)
- [Project rules](CLAUDE.md)

## License

Proprietary.
