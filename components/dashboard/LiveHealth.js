"use client";

import { useEffect, useState } from "react";
import { StatusIcon } from "./ui";

const POLL_MS = 10_000;

// Polls /health every 10 seconds and shows the live status of the app:
// overall state, database latency, uptime, API error rate and p95
// latency. A failed or non-200 check flips the indicator to critical.
export default function LiveHealth() {
  const [health, setHealth] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [roundTripMs, setRoundTripMs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const started = performance.now();
      try {
        const res = await fetch("/health", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        setHealth({ ...body, httpStatus: res.status });
        setError(res.ok ? "" : `Health check returned ${res.status}`);
      } catch (err) {
        if (cancelled) return;
        setHealth(null);
        setError(`Health check failed: ${err.message}`);
      } finally {
        if (!cancelled) {
          setRoundTripMs(Math.round(performance.now() - started));
          setCheckedAt(new Date());
        }
      }
    }
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const ok = health?.httpStatus === 200 && health.status === "ok";
  const checking = !checkedAt;
  const severity = checking ? "info" : ok ? "good" : "critical";
  const api = health?.checks?.api;

  return (
    <section
      aria-labelledby="live-health-heading"
      data-testid="live-health"
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusIcon severity={severity} size={28} />
          <div>
            <h2 id="live-health-heading" className="text-base font-semibold text-slate-900 dark:text-white">
              System health:{" "}
              <span data-testid="health-status">
                {checking ? "checking…" : ok ? "Healthy" : "Unavailable"}
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
              {error ||
                (checkedAt
                  ? `GET /health → ${health?.httpStatus} ${ok ? "OK" : ""} · checked ${checkedAt.toLocaleTimeString("en-AU")} · refreshes every ${POLL_MS / 1000}s`
                  : "Running first check…")}
            </p>
          </div>
        </div>
        <a
          href="/health"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
        >
          Open /health
        </a>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Metric label="Database" value={health?.checks?.database ? `${health.database} (${health.checks.database.latencyMs} ms)` : "—"} />
        <Metric label="Round trip" value={roundTripMs !== null ? `${roundTripMs} ms` : "—"} />
        <Metric label="Uptime" value={health ? formatUptime(health.uptimeSeconds) : "—"} />
        <Metric label="API p95 latency" value={api ? `${api.p95LatencyMs} ms` : "—"} />
        <Metric
          label="API 5xx error rate"
          value={api ? `${(api.serverErrorRate * 100).toFixed(1)}% of ${api.requests}` : "—"}
        />
      </dl>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
