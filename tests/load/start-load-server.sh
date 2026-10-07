#!/usr/bin/env bash
# Starts a production build of the app on port 3001 against its own
# SQLite database (prisma/loadtest.db), so load testing never touches the
# development data. Run from the project root:  tests/load/start-load-server.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

export DATABASE_URL="file:./loadtest.db"
export NODE_ENV=production

echo "▶ Preparing load-test database (prisma/loadtest.db)…"
rm -f prisma/loadtest.db prisma/loadtest.db-wal prisma/loadtest.db-shm
npx prisma migrate deploy
node prisma/seed.js --no-simulate

echo "▶ Building…"
npm run build

echo "▶ Starting production server on http://localhost:3001"
exec npx next start -p 3001
