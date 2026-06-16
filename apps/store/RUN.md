# apps/store — run & deploy

Fresh Next.js 15 + Prisma/Postgres storefront (replaces Spree). **Heads-up: this code has never been executed** — run `prisma validate`, `npm run typecheck`, and `npm run build` first; they'll surface the first real fixes. Paste any errors back and they get fixed fast.

## Prerequisites
- Node 20.11+ and npm 10+
- Docker Desktop (for local Postgres/Redis/MinIO) — or any reachable Postgres in prod
- Git

## Local run (populated demo, no Spree DB needed)
```bash
git clone https://github.com/zvictory/labor.git
cd labor && npm install
cd apps/store
docker compose -f infra/docker-compose.yml up -d        # postgres + redis + minio
cp .env.example .env                                     # DATABASE_URL already points at local docker
npx prisma validate                                      # 1st real check
npx prisma migrate dev --name init                       # create tables (also runs generate)
npm run db:seed                                           # ~8 sample fragrances
ADMIN_EMAIL=you@labor.uz ADMIN_PASSWORD='change-me' npx tsx scripts/create-admin.ts
npm run dev                                               # http://localhost:3002/ru  (admin: /ru/admin)
```
Sign in to admin at `/ru/account/login` with the staff email + password you set above.

## Fill the real catalog (when the Spree DB is reachable)
```bash
SPREE_DATABASE_URL='postgres://user:pass@host:5432/labor_prod' \
DATABASE_URL='postgres://...new db...' \
MIGRATE_BLOBS=true npm run etl          # writes scripts/etl/etl-report.json
```
Then verify: row-count parity in `etl-report.json` + spot-check ~10 products (3 locales, notes pyramid, accords, price, images).

## Production deploy (checklist)
1. **Database:** a managed/hosted Postgres 15. Set `DATABASE_URL`.
2. **Env:** set every secret from `.env.example` for real — `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` (https domain), `PAYME_*`, `CLICK_*`, `ESKIZ_*`, S3/MinIO (`S3_*`), `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` + `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` + `TELEGRAM_ADMIN_CHAT_ID`, `YANDEX_*`. Add the prod image host to `next.config.mjs` `images.remotePatterns`.
3. **Build & migrate:**
   ```bash
   npm install
   npm --workspace @labor/store run build      # next build (verifies typecheck)
   cd apps/store && npx prisma migrate deploy   # apply migrations to prod DB
   npx tsx scripts/create-admin.ts              # bootstrap an admin (env-driven)
   ```
4. **Run:** `npm --workspace @labor/store run start` (port 3002) behind a reverse proxy (nginx/Caddy) with TLS — or containerize. Node runtime, not edge (Prisma + grammy).
5. **Telegram webhook:** after deploy, register it:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOURDOMAIN/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
6. **Payments:** point Payme/Click merchant dashboards at `https://YOURDOMAIN/api/payments/{payme,click/webhook}`. Test in each provider's sandbox before going live.
7. **Catalog:** run the ETL once against the Spree DB (above), or manage via `/ru/admin`.

## Notes / current gaps
- Built but unrun (correct-by-inspection). Likely first fixes: next-auth v5-beta API surface, a stray import, Prisma JSON typing.
- Delivery fee is the method base fee (live Yandex quote is display-only for now).
- `cancelOrder` of a paid order doesn't auto-refund (provider refund not wired).
- Storefront hero still uses local slides; campaigns are admin-manageable but not yet read by the hero.
- The old Spree app (`apps/backend`) is untouched — keep it serving until this is validated in prod.
