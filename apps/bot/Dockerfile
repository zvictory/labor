ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
COPY packages/api-client/package.json packages/api-client/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tg/package.json packages/tg/
COPY packages/ui/package.json packages/ui/
RUN npm ci
COPY packages/ packages/
COPY apps/bot apps/bot
RUN npm run build --workspace=apps/bot

# ---- runner (production deps only) ----
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
COPY packages/api-client/package.json packages/api-client/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tg/package.json packages/tg/
COPY packages/ui/package.json packages/ui/
COPY packages/ packages/
RUN npm ci --omit=dev
COPY --from=builder /app/apps/bot/dist apps/bot/dist
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
