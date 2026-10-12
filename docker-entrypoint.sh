#!/bin/sh
# Entry point for the phoneme-activity-builder image. The same image is
# used by two Compose services, selected by the first argument:
#
#   migrate  apply pending Prisma migrations, seed the database if it is
#            empty (a no-op afterwards, so teachers' edits survive
#            restarts), then exit.
#   start    run the Next.js server (default).
set -e

case "${1:-start}" in
  migrate)
    echo "▶ Applying database migrations…"
    node node_modules/prisma/build/index.js migrate deploy
    echo "▶ Seeding database (if empty)…"
    node prisma/seed.js --if-empty
    ;;
  start)
    echo "▶ Starting Next.js on ${HOSTNAME}:${PORT}…"
    exec node node_modules/next/dist/bin/next start
    ;;
  *)
    exec "$@"
    ;;
esac
