import {
  badRequest,
  jsonCreated,
  notFound,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { unknownPhonemes, validate, wordInputSchema } from "@/lib/validation";
import { addWord } from "@/lib/wordLists";

export const dynamic = "force-dynamic";

// POST /api/word-lists/:id/words — add a single word (with its ordered
// phonemes) to an existing list.
export const POST = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(wordInputSchema, body);
  if (errors) return badRequest("Validation failed", errors);

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

  const word = await addWord(id, data);
  if (!word) return notFound("Word list not found");
  return jsonCreated({ word });
});
