import { jsonOk, withErrorHandling } from "@/lib/apiResponse";
import { ALERT_THRESHOLDS, getAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// GET /api/alerts — current error / warning / info indicators (failed
// generations, empty word lists, invalid phoneme data, …).
export const GET = withErrorHandling(async () => {
  const alerts = await getAlerts();
  const counts = { critical: 0, warning: 0, info: 0 };
  alerts.forEach((a) => (counts[a.severity] += 1));
  return jsonOk({ alerts, counts, thresholds: ALERT_THRESHOLDS });
});
