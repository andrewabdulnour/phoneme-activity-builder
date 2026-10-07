import { after } from "next/server";
import { notFound, badRequest, serverError, withErrorHandling } from "@/lib/apiResponse";
import { renderActivityFile } from "@/lib/activities";
import { recordGeneration } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

// GET /api/activities/:id/generate
//   ?download=1  -> Content-Disposition: attachment (browser saves file)
//   otherwise    -> inline HTML (preview in a new tab)
//
// The entire activity file is built from database records — word list,
// words, phonemes and the stored activity settings. Every attempt,
// successful or failed, is recorded as a GenerationEvent for the
// dashboard; the write runs after the response is sent (`after`) so
// instrumentation adds no latency for the teacher.
export const GET = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const download = Boolean(new URL(request.url).searchParams.get("download"));
  const startedAt = performance.now();
  const result = await renderActivityFile(id);
  const durationMs = performance.now() - startedAt;

  if (result.meta) {
    after(() =>
      recordGeneration({
        ...result.meta,
        source: "SAVED_ACTIVITY",
        status: result.error ? "FAILED" : "SUCCESS",
        errorMessage: result.error ? (result.message ?? result.error) : null,
        mode: download ? "download" : "preview",
        durationMs,
        outputBytes: result.html ? Buffer.byteLength(result.html) : null,
      })
    );
  }

  if (result.error === "not_found") return notFound("Activity not found");
  if (result.error === "empty") return badRequest(result.message);
  if (result.error === "generation_failed") return serverError(result.message);
  if (result.error) return badRequest("Could not generate this activity");

  const headers = {
    "Content-Type": result.contentType,
    "Cache-Control": "no-store",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${result.filename}"`;
  }
  return new Response(result.html, { status: 200, headers });
});
