import {
  badRequest,
  jsonOk,
  notFound,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { unknownPhonemes, validate, wordUpdateSchema } from "@/lib/validation";
import { deleteWord, getWord, updateWord } from "@/lib/wordLists";

export const dynamic = "force-dynamic";

// GET /api/words/:id
export const GET = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const word = await getWord(id);
  if (!word) return notFound("Word not found");
  return jsonOk({ word });
});

// PATCH /api/words/:id — update text/hint/notes/order and/or replace the
// phoneme sequence.
export const PATCH = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(wordUpdateSchema, body);
  if (errors) return badRequest("Validation failed", errors);
  if (Object.keys(data).length === 0) {
    return badRequest("Provide at least one field to update");
  }

  if (data.phonemes !== undefined) {
    const allowUnknown =
      new URL(request.url).searchParams.get("allowUnknownPhonemes") === "true";
    if (!allowUnknown) {
      const unknown = unknownPhonemes(data.phonemes);
      if (unknown.length) {
        return badRequest(
          `Unrecognised phoneme symbol(s): ${unknown
            .map((s) => `"${s}"`)
            .join(", ")}. Use the IPA keyboard symbols, or pass ?allowUnknownPhonemes=true.`
        );
      }
    }
  }

  const existing = await getWord(id);
  if (!existing) return notFound("Word not found");

  const word = await updateWord(id, data);
  return jsonOk({ word });
});

export const PUT = PATCH;

// DELETE /api/words/:id
export const DELETE = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const existing = await getWord(id);
  if (!existing) return notFound("Word not found");
  await deleteWord(id);
  return jsonOk({ deleted: true, id });
});
