import { after } from "next/server";
import { badRequest, readJson, withErrorHandling } from "@/lib/apiResponse";
import { builderGenerationSchema, validate } from "@/lib/validation";
import { recordGeneration } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

// POST /api/telemetry/generation
// The Wordle and Word Search builder pages generate their file in the
// browser, so they report each attempt (success or failure) here to keep
// the dashboard's generation counts complete.
export const POST = withErrorHandling(async (request) => {
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(builderGenerationSchema, body);
  if (errors) return badRequest("Validation failed", errors);

  after(() => recordGeneration({ ...data, source: "BUILDER", mode: "download" }));
  return new Response(null, { status: 202 });
});
