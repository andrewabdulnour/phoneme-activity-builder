#!/bin/sh
# Applies pending Prisma migrations, seeds the database on first run
# (no-op if it already has data), then starts the Next.js server.
set -e

echo "▶ Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy

echo "▶ Seeding database (if empty)…"
node prisma/seed.js --if-empty

echo "▶ Starting Next.js on ${HOSTNAME}:${PORT}…"
exec node node_modules/next/dist/bin/next start
