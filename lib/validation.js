import { z } from "zod";
import { ALL_PHONEMES } from "./phonemeData";

// The phoneme inventory the on-screen IPA keyboard exposes. Symbols
// outside this set are almost always a typo or a copy-paste artefact, so
// they are rejected by default with a clear message (the caller can pass
// ?allowUnknownPhonemes=true to override for legitimate edge cases).
export const KNOWN_PHONEMES = new Set(ALL_PHONEMES);

const ACTIVITY_TYPES = ["WORDLE", "WORD_SEARCH"];
export const PHONEME_LENGTH_MIN = 2;
export const PHONEME_LENGTH_MAX = 12;

// A single phoneme token: non-empty after trimming, short (the longest
// real IPA tokens here are 2–3 characters), no internal whitespace.
const phonemeSymbol = z
  .string({ error: "each phoneme must be a string" })
  .trim()
  .min(1, "a phoneme symbol cannot be empty")
  .max(8, "a phoneme symbol is unexpectedly long")
  .refine((s) => !/\s/.test(s), "a phoneme symbol cannot contain spaces");

const optionalText = (max) =>
  z.string().trim().max(max).optional().nullable().transform((v) => v || null);

export const wordInputSchema = z.object({
  text: z
    .string({ error: "word text is required" })
    .trim()
    .min(1, "word text is required")
    .max(40, "word text is too long"),
  displayText: z.string().trim().min(1).max(40).optional(),
  hint: optionalText(200),
  notes: optionalText(500),
  orderIndex: z.number().int().min(0).optional(),
  phonemes: z
    .array(phonemeSymbol, { error: "phonemes must be an array" })
    .min(1, "a word needs at least one phoneme")
    .max(PHONEME_LENGTH_MAX, `a word cannot have more than ${PHONEME_LENGTH_MAX} phonemes`),
});

export const wordListCreateSchema = z.object({
  name: z
    .string({ error: "name is required" })
    .trim()
    .min(1, "name is required")
    .max(120, "name is too long"),
  description: optionalText(500),
  phonemeLength: z
    .number()
    .int()
    .min(PHONEME_LENGTH_MIN)
    .max(PHONEME_LENGTH_MAX)
    .optional(),
  words: z.array(wordInputSchema).max(500).optional().default([]),
});

export const wordListUpdateSchema = wordListCreateSchema
  .partial()
  .omit({ words: true });

export const wordUpdateSchema = wordInputSchema.partial();

export const activityCreateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  type: z.enum(ACTIVITY_TYPES, { error: `type must be one of ${ACTIVITY_TYPES.join(", ")}` }),
  wordListId: z.string().trim().min(1, "wordListId is required"),
  difficulty: z.number().int().min(PHONEME_LENGTH_MIN).max(PHONEME_LENGTH_MAX).optional(),
  maxGuesses: z.number().int().min(1).max(12).optional().nullable(),
  prefillFirst: z.boolean().optional(),
  targetWordId: z.string().trim().min(1).optional().nullable(),
  gridSize: z.number().int().min(5).max(20).optional().nullable(),
  hint: optionalText(200),
  teacherNote: optionalText(200),
  outputSettings: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const activityUpdateSchema = activityCreateSchema.partial().omit({ type: true });

// Turn a ZodError into a flat, client-friendly list.
export function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

// Runs a Zod schema and returns { data } on success or { errors } (an
// array of { path, message }) on failure.
export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  return { errors: formatZodError(result.error) };
}

// Check a list of phoneme tokens against the known inventory. Returns
// the tokens that are not recognised (empty array = all known).
export function unknownPhonemes(phonemes) {
  return [...new Set(phonemes.filter((p) => !KNOWN_PHONEMES.has(p)))];
}
