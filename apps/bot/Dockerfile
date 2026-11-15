ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/bot/package.json apps/bot/
RUN npm ci
COPY apps/bot apps/bot
RUN npm run build --workspace=apps/bot

# ---- runner (production deps only) ----
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
RUN npm ci --omit=dev
COPY --from=builder /app/apps/bot/dist apps/bot/dist
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
