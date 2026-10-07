// In-process request metrics for the API (Assessment 3 observability).
//
// Every API route handler wrapped by `withErrorHandling` reports its
// method, route, status and latency here. The numbers live in memory —
// they describe *this* server process since it started, which is what
// an operator wants to see while the app is running or under load.
// Longer-term usage statistics (generations, page views, CRUD) are
// persisted in the database instead; see lib/telemetry.js.
//
// Exposed at GET /api/metrics as JSON, or in Prometheus text format
// with ?format=prometheus.

const LATENCY_WINDOW = 2000; // recent requests kept for percentiles

// Survive Next.js dev hot reloads, like the Prisma client does.
const globalForMetrics = globalThis;
const state =
  globalForMetrics.__apiMetrics ??
  (globalForMetrics.__apiMetrics = {
    startedAt: Date.now(),
    total: 0,
    byStatusClass: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
    routes: new Map(),
    recentLatencies: [],
  });

// Collapse database ids in a URL path so per-route stats group together:
// /api/activities/cmf1x…/generate -> /api/activities/:id/generate
export function normaliseRoute(pathname) {
  return pathname.replace(/\/c[a-z0-9]{20,}(?=\/|$)/g, "/:id");
}

export function recordRequest({ method, route, status, durationMs }) {
  state.total += 1;
  const statusClass = `${Math.floor(status / 100)}xx`;
  if (statusClass in state.byStatusClass) state.byStatusClass[statusClass] += 1;

  const key = `${method} ${route}`;
  const entry =
    state.routes.get(key) ??
    { method, route, count: 0, errors: 0, totalMs: 0, maxMs: 0, lastStatus: 0 };
  entry.count += 1;
  if (status >= 500) entry.errors += 1;
  entry.totalMs += durationMs;
  entry.maxMs = Math.max(entry.maxMs, durationMs);
  entry.lastStatus = status;
  state.routes.set(key, entry);

  state.recentLatencies.push(durationMs);
  if (state.recentLatencies.length > LATENCY_WINDOW) state.recentLatencies.shift();
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function getMetricsSnapshot() {
  const sorted = [...state.recentLatencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((sum, n) => sum + n, 0) / sorted.length : 0;
  const memory = process.memoryUsage();
  const serverErrors = state.byStatusClass["5xx"];

  return {
    process: {
      startedAt: new Date(state.startedAt).toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryMb: {
        rss: Math.round(memory.rss / 1048576),
        heapUsed: Math.round(memory.heapUsed / 1048576),
      },
    },
    requests: {
      total: state.total,
      byStatusClass: { ...state.byStatusClass },
      serverErrorRate: state.total ? serverErrors / state.total : 0,
      latencyMs: {
        sampleSize: sorted.length,
        avg: Math.round(avg * 10) / 10,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted.length ? sorted[sorted.length - 1] : 0,
      },
    },
    routes: [...state.routes.values()]
      .map((r) => ({
        method: r.method,
        route: r.route,
        count: r.count,
        errors: r.errors,
        avgMs: Math.round((r.totalMs / r.count) * 10) / 10,
        maxMs: r.maxMs,
        lastStatus: r.lastStatus,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

// Prometheus exposition format, so the same numbers could be scraped by
// a real monitoring stack (Prometheus / Grafana) in production.
export function toPrometheus(snapshot) {
  const lines = [
    "# HELP app_uptime_seconds Seconds since the server process started.",
    "# TYPE app_uptime_seconds gauge",
    `app_uptime_seconds ${snapshot.process.uptimeSeconds}`,
    "# HELP app_memory_rss_megabytes Resident memory of the server process.",
    "# TYPE app_memory_rss_megabytes gauge",
    `app_memory_rss_megabytes ${snapshot.process.memoryMb.rss}`,
    "# HELP http_requests_total API requests handled, by status class.",
    "# TYPE http_requests_total counter",
    ...Object.entries(snapshot.requests.byStatusClass).map(
      ([cls, n]) => `http_requests_total{status_class="${cls}"} ${n}`
    ),
    "# HELP http_request_duration_ms Recent API request latency percentiles.",
    "# TYPE http_request_duration_ms summary",
    ...["p50", "p95", "p99"].map(
      (p) =>
        `http_request_duration_ms{quantile="0.${p.slice(1)}"} ${snapshot.requests.latencyMs[p]}`
    ),
    "# HELP http_route_requests_total API requests per route.",
    "# TYPE http_route_requests_total counter",
    ...snapshot.routes.map(
      (r) => `http_route_requests_total{method="${r.method}",route="${r.route}"} ${r.count}`
    ),
  ];
  return lines.join("\n") + "\n";
}
