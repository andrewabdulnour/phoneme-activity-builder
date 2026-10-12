#!/usr/bin/env bash
# Starts a production build of the app on port 3001 against its own
# PostgreSQL database (phoneme_loadtest, in the Compose `db` service), so
# load testing never touches the development data. Run from the project
# root with the database up (docker compose up -d db):
#
#   tests/load/start-load-server.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

PGUSER="${POSTGRES_USER:-phoneme}"
PGPASSWORD="${POSTGRES_PASSWORD:-phoneme}"
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@localhost:5432/phoneme_loadtest?schema=public"
export NODE_ENV=production

echo "▶ Preparing load-test database (phoneme_loadtest)…"
docker compose exec -T db dropdb -U "$PGUSER" --if-exists phoneme_loadtest
docker compose exec -T db createdb -U "$PGUSER" phoneme_loadtest
npx prisma migrate deploy
node prisma/seed.js --no-simulate

echo "▶ Building…"
npm run build

echo "▶ Starting production server on http://localhost:3001"
exec npx next start -p 3001
