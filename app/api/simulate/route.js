import { badRequest, jsonCreated, jsonOk, readJson, withErrorHandling } from "@/lib/apiResponse";
import { simulateSchema, validate } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { clearSimulatedData, simulateUsage } from "@/lib/simulation.mjs";

export const dynamic = "force-dynamic";

// POST /api/simulate — { days?: 1–90, scale?: 0.1–10 }
// Adds simulated activity configurations, generations (including some
// failures) and page views, flagged `simulated`, for the dashboard.
export const POST = withErrorHandling(async (request) => {
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(simulateSchema, body ?? {});
  if (errors) return badRequest("Validation failed", errors);

  const result = await simulateUsage(prisma, data);
  if (result.error) return badRequest(result.error);
  return jsonCreated({ simulated: result });
});

// DELETE /api/simulate — remove every simulated row (real data is kept).
export const DELETE = withErrorHandling(async () => {
  const removed = await clearSimulatedData(prisma);
  return jsonOk({ removed });
});
