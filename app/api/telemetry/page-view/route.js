import { after } from "next/server";
import { badRequest, readJson, withErrorHandling } from "@/lib/apiResponse";
import { pageViewSchema, validate } from "@/lib/validation";
import { recordPageView } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

// POST /api/telemetry/page-view — { path, durationMs }
// Sent by components/PageTimeTracker (via navigator.sendBeacon) when a
// visitor leaves or hides a page. Feeds "average time on page".
export const POST = withErrorHandling(async (request) => {
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(pageViewSchema, body);
  if (errors) return badRequest("Validation failed", errors);

  after(() => recordPageView(data));
  return new Response(null, { status: 204 });
});
