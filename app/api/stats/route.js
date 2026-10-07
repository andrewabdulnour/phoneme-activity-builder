import { jsonOk, withErrorHandling } from "@/lib/apiResponse";
import { getDashboardSummary, getRecentEvents } from "@/lib/stats";

export const dynamic = "force-dynamic";

// GET /api/stats — the dashboard's headline numbers: content counts,
// activities created per type, generation success / failure, average
// time on page, most-used activity type, and the recent-events feed.
export const GET = withErrorHandling(async () => {
  const [summary, recent] = await Promise.all([getDashboardSummary(), getRecentEvents()]);
  return jsonOk({ ...summary, recent });
});
