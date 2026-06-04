ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
# NEXT_PUBLIC_* vars are inlined by webpack at build time — must be ARG+ENV here,
# not just runtime env, or the browser bundle gets undefined/localhost fallbacks.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ARG NEXT_PUBLIC_META_PIXEL_ID=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
ARG NEXT_PUBLIC_MINIAPP_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_MINIAPP_URL=$NEXT_PUBLIC_MINIAPP_URL
# Copy workspace manifests first for layer-cache friendliness
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tg/package.json packages/tg/
COPY packages/ui/package.json packages/ui/
# NODE_ENV=development scoped to npm ci so devDeps are installed,
# but next build runs in production mode (React prod runtime, no dev-mode checks)
RUN NODE_ENV=development npm ci
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
