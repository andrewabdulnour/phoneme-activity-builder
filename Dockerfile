# syntax=docker/dockerfile:1
#
# Multi-stage build for the Phoneme Activity Builder (Next.js + Prisma).
#   1. build-deps  – install all dependencies (incl. dev) for the build
#   2. builder     – run `next build`
#   3. prod-deps   – install production dependencies only + Prisma client
#   4. runner      – minimal runtime image (non-root, healthcheck)
#
# The SQLite database lives on a mounted volume at /app/data so it
# survives container restarts (see docker-compose.yml).

FROM node:22-slim AS base
WORKDIR /app
# OpenSSL + CA certs are required by Prisma's query engine on Debian slim.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# --- 1. All dependencies (build needs dev deps too) ---------------------
FROM base AS build-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- 2. Build the Next.js application ---------------------------------
FROM build-deps AS builder
COPY . .
RUN npm run build

# --- 3. Production-only dependencies (postinstall runs prisma generate) -
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# --- 4. Runtime image -------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/data/prod.db"

# `node` (uid 1000) is a non-root user that already exists in the
# official Node images.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder   --chown=node:node /app/.next        ./.next
COPY --from=builder   --chown=node:node /app/public       ./public
COPY --from=builder   --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder   --chown=node:node /app/package.json ./package.json
COPY --from=builder   --chown=node:node /app/prisma       ./prisma
COPY --chown=node:node docker-entrypoint.sh               ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh \
 && mkdir -p /app/data \
 && chown -R node:node /app/data

USER node
EXPOSE 3000

# Container is healthy once /health returns 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The entrypoint applies migrations and seeds an empty database, then
# runs `next start`.
ENTRYPOINT ["./docker-entrypoint.sh"]
