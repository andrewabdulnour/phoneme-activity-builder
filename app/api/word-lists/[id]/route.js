import {
  badRequest,
  jsonOk,
  notFound,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { validate, wordListUpdateSchema } from "@/lib/validation";
import { deleteWordList, getWordList, updateWordList } from "@/lib/wordLists";

export const dynamic = "force-dynamic";

// GET /api/word-lists/:id
export const GET = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const list = await getWordList(id);
  if (!list) return notFound("Word list not found");
  return jsonOk({ wordList: list });
});

// PATCH /api/word-lists/:id — update list metadata (name, description,
// phonemeLength). Words are managed via /api/words and
// /api/word-lists/:id/words.
export const PATCH = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(wordListUpdateSchema, body);
  if (errors) return badRequest("Validation failed", errors);
  if (Object.keys(data).length === 0) {
    return badRequest("Provide at least one field to update");
  }

  const existing = await getWordList(id);
  if (!existing) return notFound("Word list not found");

  const updated = await updateWordList(id, data);
  return jsonOk({ wordList: updated });
});

// PUT is accepted as an alias for PATCH here (partial update semantics).
export const PUT = PATCH;

// DELETE /api/word-lists/:id — cascades to words, phonemes and
// activities.
export const DELETE = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const existing = await getWordList(id);
  if (!existing) return notFound("Word list not found");
  await deleteWordList(id);
  return jsonOk({ deleted: true, id });
});
