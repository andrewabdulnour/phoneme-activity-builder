import { prisma } from "@/lib/prisma";
import { getMetricsSnapshot } from "@/lib/metrics";

// Liveness/readiness probe. Returns 200 with { status: "ok" } when the
// process is up and the database answers a trivial query; 503 otherwise.
// Required by the assessment brief to be reachable at /health.
//
// The body also carries a few cheap operational indicators (database
// latency, last generation, request error rate) so the dashboard's live
// status panel can poll this one endpoint.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const databaseLatencyMs = Date.now() - startedAt;
    const lastGeneration = await prisma.generationEvent.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    });
    const { requests, process: proc } = getMetricsSnapshot();

    return Response.json(
      {
        status: "ok",
        database: "connected",
        uptimeSeconds: Math.round(process.uptime()),
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "ok", latencyMs: databaseLatencyMs },
          lastGeneration: lastGeneration
            ? { at: lastGeneration.createdAt, status: lastGeneration.status }
            : null,
          api: {
            requests: requests.total,
            serverErrorRate: requests.serverErrorRate,
            p95LatencyMs: requests.latencyMs.p95,
          },
          memoryMb: proc.memoryMb,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[health] database check failed:", err);
    return Response.json(
      {
        status: "error",
        database: "unavailable",
        timestamp: new Date().toISOString(),
        checks: { database: { status: "error", message: err.message } },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
