import {
  badRequest,
  jsonCreated,
  jsonOk,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { validate, wordListCreateSchema, unknownPhonemes } from "@/lib/validation";
import { createWordList, listWordLists } from "@/lib/wordLists";

export const dynamic = "force-dynamic";

// GET /api/word-lists — all word lists with their words and phonemes.
export const GET = withErrorHandling(async () => {
  const lists = await listWordLists();
  return jsonOk({ wordLists: lists });
});

// POST /api/word-lists — create a word list, optionally with words.
// ?allowUnknownPhonemes=true skips the IPA-inventory check.
export const POST = withErrorHandling(async (request) => {
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(wordListCreateSchema, body);
  if (errors) return badRequest("Validation failed", errors);

  const allowUnknown =
    new URL(request.url).searchParams.get("allowUnknownPhonemes") === "true";
  if (!allowUnknown) {
    for (const [index, word] of data.words.entries()) {
      const unknown = unknownPhonemes(word.phonemes);
      if (unknown.length) {
        return badRequest(
          `Unrecognised phoneme symbol(s) in word ${index + 1} ("${word.text}"): ${unknown
            .map((s) => `"${s}"`)
            .join(", ")}. Use the IPA keyboard symbols, or pass ?allowUnknownPhonemes=true.`
        );
      }
    }
  }

  const created = await createWordList(data);
  return jsonCreated({ wordList: created });
});
