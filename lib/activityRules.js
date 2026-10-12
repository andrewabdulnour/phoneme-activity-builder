// Activity rules shared by the browser (builder pages, live previews) and
// the server (saved-activity API and generator). Before Assessment 4 the
// builder pages and the API each had their own copy of these defaults and
// word-picking rules, and they disagreed (e.g. a 3-phoneme Wordle got 7
// guesses in the builder but 5 when saved). Keeping them in one
// dependency-free module means a preview, a download and a saved activity
// always behave the same way.

export const ACTIVITY_TYPES = ["WORDLE", "WORD_SEARCH"];
export const ACTIVITY_TYPE_LABEL = { WORDLE: "Wordle", WORD_SEARCH: "Word Search" };

// Phoneme length doubles as difficulty: more phonemes to blend or segment
// is a developmentally meaningful axis for speech pathology practice.
export const DIFFICULTY_LEVELS = [
  { length: 3, label: "3 phonemes (easier)" },
  { length: 4, label: "4 phonemes (medium)" },
  { length: 5, label: "5 phonemes (harder)" },
];

export function difficultyLabel(length) {
  return DIFFICULTY_LEVELS.find((d) => d.length === length)?.label ?? `${length} phonemes`;
}

export const GRID_SIZES = [8, 10, 12, 14];
export const DEFAULT_GRID_SIZE = 10;
export const DEFAULT_WORD_SEARCH_COUNT = 6;
export const MIN_WORD_SEARCH_WORDS = 3;

// Wordle scaffolding by length: shorter words get more guesses and the
// first phoneme pre-filled; longer words get fewer guesses. 3 → 7, 4 → 6,
// 5 → 5, never fewer than 4.
export function wordleDefaults(length) {
  return {
    maxGuesses: Math.min(8, Math.max(4, 10 - length)),
    prefillFirst: length <= 3,
  };
}

// Words in a list with exactly `length` phonemes, or the whole list when
// none match (a teacher's list may not be grouped by length).
export function wordsAtLength(words, length) {
  const matching = words.filter((w) => w.phonemes.length === length);
  return matching.length ? matching : words;
}

// The Wordle target: the chosen word if it is still in the list,
// otherwise the first word at the activity's difficulty.
export function pickWordleTarget(words, { targetWordId, difficulty }) {
  return (
    words.find((w) => w.id === targetWordId) ??
    words.find((w) => w.phonemes.length === difficulty) ??
    words[0] ??
    null
  );
}

// The Word Search words: the teacher's explicit selection when given,
// otherwise words at the chosen length. Words longer than the grid can
// never be placed, so they are always left out.
export function pickWordSearchWords(
  words,
  { wordIds, length, gridSize = DEFAULT_GRID_SIZE, count = DEFAULT_WORD_SEARCH_COUNT }
) {
  const fits = words.filter((w) => w.phonemes.length <= gridSize);
  if (wordIds?.length) {
    const chosen = new Set(wordIds);
    return fits.filter((w) => chosen.has(w.id));
  }
  const pool = length ? wordsAtLength(fits, length) : fits;
  return pool.slice(0, Math.max(MIN_WORD_SEARCH_WORDS, count));
}

// API word ({ text, display, phonemes }) → the shape the generators use.
export function toGeneratorWord(w) {
  return { word: w.text, display: w.display, phonemes: w.phonemes };
}

export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "activity"
  );
}
