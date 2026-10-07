#!/usr/bin/env bash
# Runs the JMeter plan at each traffic level (default x1, x10, x100,
# x1000, x10000 users) in non-GUI mode, saves raw results plus JMeter's
# HTML dashboard for every level, then writes a comparison table.
#
#   tests/load/start-load-server.sh        # in one terminal
#   tests/load/run-load-tests.sh           # in another
#   tests/load/run-load-tests.sh 1 10 100  # just some levels
set -euo pipefail
cd "$(dirname "$0")/../.."

HOST="${HOST:-localhost}"
PORT="${PORT:-3001}"
LEVELS=("${@:-1 10 100 1000 10000}")
read -r -a LEVELS <<< "${LEVELS[*]}"
PLAN="tests/load/phoneme-builder-load.jmx"
OUT="tests/load/results/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$OUT"

# Ramp-up: users arrive over this many seconds (x1 → 1s … x10000 → 60s).
ramp_for() {
  case "$1" in
    1) echo 1 ;; 10) echo 5 ;; 100) echo 10 ;; 1000) echo 30 ;; *) echo 60 ;;
  esac
}

curl -fsS "http://$HOST:$PORT/health" > /dev/null || {
  echo "Server not reachable at http://$HOST:$PORT/health — start it with tests/load/start-load-server.sh"
  exit 1
}

export HEAP="${HEAP:--Xms1g -Xmx4g}"
for users in "${LEVELS[@]}"; do
  ramp="$(ramp_for "$users")"
  echo "▶ x$users users (ramp-up ${ramp}s)…"
  jmeter -n -t "$PLAN" \
    -Jhost="$HOST" -Jport="$PORT" -Jusers="$users" -Jrampup="$ramp" \
    -l "$OUT/x$users.jtl" -j "$OUT/x$users.log" \
    -e -o "$OUT/x$users-report" > "$OUT/x$users.console.txt"
  # Server-side view of the same run (in-process request metrics).
  curl -fsS "http://$HOST:$PORT/api/metrics" > "$OUT/x$users.server-metrics.json" || true
  sleep 5 # let the server settle between levels
done

node tests/load/summarize.mjs "$OUT"
echo "✔ Results in $OUT (open x<N>-report/index.html for JMeter's dashboards)"
