ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
# NEXT_PUBLIC_* vars are inlined by webpack at build time — must be ARG+ENV here,
# not just runtime env, or the browser bundle gets undefined/localhost fallbacks.
ARG NEXT_PUBLIC_APP_URL=https://laborparfum.com
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
ARG NEXT_PUBLIC_MINIAPP_URL=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_MINIAPP_URL=$NEXT_PUBLIC_MINIAPP_URL

# Install openssl so Prisma detects openssl-3.0.x (bookworm-slim ships libssl3
# but not the openssl CLI; without it Prisma falls back to openssl-1.1.x which
# is absent from Bookworm).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer-cache friendliness
COPY package.json package-lock.json ./
COPY apps/store/package.json apps/store/
COPY apps/store/prisma apps/store/prisma
# NODE_ENV=development so devDeps install (needed for next build + tsc)
RUN NODE_ENV=development npm ci
# Copy source after deps are cached
COPY apps/store apps/store
RUN npm run build --workspace=apps/store

# ---- runner (production deps only) ----
FROM base AS runner
ENV NODE_ENV=production
# Install openssl so Prisma can load the openssl-3.0.x engine binary at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/store/package.json apps/store/
# Schema must be present before npm ci so postinstall (prisma generate) can run
COPY apps/store/prisma apps/store/prisma
RUN npm ci --omit=dev
# Copy the pre-generated Prisma engine binary from the builder stage. This ensures
# the correct engine (compiled against openssl-3.0.x) is used without needing the
# prisma CLI in the production image.
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/apps/store/.next apps/store/.next
COPY --from=builder /app/apps/store/public apps/store/public
COPY apps/store/next.config.mjs apps/store/
WORKDIR /app/apps/store
EXPOSE 3002
CMD ["/app/node_modules/.bin/next", "start", "-p", "3002"]
