ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
ENV NODE_ENV=development
# Copy workspace manifests first for layer-cache friendliness
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tg/package.json packages/tg/
COPY packages/ui/package.json packages/ui/
RUN npm ci
# Copy source after deps are cached
COPY packages/ packages/
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

# ---- runner (production deps only) ----
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tg/package.json packages/tg/
COPY packages/ui/package.json packages/ui/
COPY packages/ packages/
RUN npm ci --omit=dev
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY apps/web/next.config.mjs apps/web/
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["/app/node_modules/.bin/next", "start", "-p", "3001"]
