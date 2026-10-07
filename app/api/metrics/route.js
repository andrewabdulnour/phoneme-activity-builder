import { jsonOk, withErrorHandling } from "@/lib/apiResponse";
import { getMetricsSnapshot, toPrometheus } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// GET /api/metrics — live server metrics for this process: uptime,
// memory, request counts by status class, latency percentiles and
// per-route stats. ?format=prometheus returns the Prometheus text
// exposition format instead of JSON.
export const GET = withErrorHandling(async (request) => {
  const snapshot = getMetricsSnapshot();
  if (new URL(request.url).searchParams.get("format") === "prometheus") {
    return new Response(toPrometheus(snapshot), {
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }
  return jsonOk(snapshot);
});
