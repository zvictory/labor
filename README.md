# Labor

Multi-brand fragrance ecommerce for the Uzbekistan market (laborparfum.com): a Next.js
store with its own Postgres, the Telegram bot and mini-app inside it, payments through
Click and Payme, delivery through Yandex.

## Quickstart (no Docker)

```bash
npm install
cp apps/store/.env.example apps/store/.env   # DATABASE_URL → a local labor_store
npx -w apps/store prisma migrate deploy
npm run dev                                   # http://localhost:3012
```

Checks: `npm run typecheck`, `npm test`.

## Layout

| Path            | What                                                         |
| --------------- | ------------------------------------------------------------ |
| `apps/store`    | the store: storefront, admin, API, Telegram bot, payments    |
| `data/catalog`  | catalog source files (Billz export, Parfumo, image manifest) |
| `scripts`       | Python tools that built the catalog from those files         |
| `infra`         | production: compose file, nginx, `deploy/deploy.sh`          |
| `docs`          | plans and research                                           |

## Documentation

- [Project rules](CLAUDE.md)
- [Design doc](docs/plans/2026-05-21-labor-parfum-design.md)

## License

Proprietary.
