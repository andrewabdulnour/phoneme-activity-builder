import { badRequest, jsonOk, withErrorHandling } from "@/lib/apiResponse";
import { getReport, REPORT_RANGES } from "@/lib/stats";

export const dynamic = "force-dynamic";

// GET /api/reports?days=7|30|90 — time-range report behind /reports.
export const GET = withErrorHandling(async (request) => {
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (!REPORT_RANGES.includes(days)) {
    return badRequest(`days must be one of ${REPORT_RANGES.join(", ")}`);
  }
  return jsonOk(await getReport(days));
});
