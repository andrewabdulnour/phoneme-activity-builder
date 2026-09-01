import { prisma } from "@/lib/prisma";

// Liveness/readiness probe. Returns 200 with { status: "ok" } when the
// process is up and the database answers a trivial query; 503 otherwise.
// Required by the assessment brief to be reachable at /health.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      database: "connected",
      uptimeSeconds: Math.round(process.uptime()),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] database check failed:", err);
    return Response.json(
      { status: "error", database: "unavailable", timestamp: new Date().toISOString() },
      { status: 503 }
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
