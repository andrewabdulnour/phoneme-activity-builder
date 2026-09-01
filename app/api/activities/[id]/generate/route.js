import { notFound, badRequest, withErrorHandling } from "@/lib/apiResponse";
import { renderActivityFile } from "@/lib/activities";

export const dynamic = "force-dynamic";

// GET /api/activities/:id/generate
//   ?download=1  -> Content-Disposition: attachment (browser saves file)
//   otherwise    -> inline HTML (preview in a new tab)
//
// The entire activity file is built from database records — word list,
// words, phonemes and the stored activity settings.
export const GET = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const result = await renderActivityFile(id);

  if (result.error === "not_found") return notFound("Activity not found");
  if (result.error === "empty") return badRequest(result.message);
  if (result.error) return badRequest("Could not generate this activity");

  const download = new URL(request.url).searchParams.get("download");
  const headers = {
    "Content-Type": result.contentType,
    "Cache-Control": "no-store",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${result.filename}"`;
  }
  return new Response(result.html, { status: 200, headers });
});
