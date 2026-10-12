// Phoneme keyboard layout and word corpus, sourced from the unit's HCE
// (broad Australian English) phoneme materials: the "Keyboard for
// Wordle-type puzzle game" layout and the accompanying phoneme word
// corpus (30 words each at 3, 4 and 5 phonemes). Assessment 1 uses this
// as a fixed, hardcoded dataset — no database yet, that's Assessment 2 —
// but the shape (grouped by phoneme count, one entry per word) is
// designed to drop straight into a future word-list query.

// Each keyboard key is an IPA phoneme symbol, not an English letter —
// this is the core "designed around phoneme symbols, not standard word
// entry" requirement. Hovering/focusing a key reveals its English
// grapheme equivalence and an example word.
export const IPA_KEYBOARD_GROUPS = [
  { label: "Plosives", rows: [["p", "t", "k"], ["b", "d", "g"]] },
  { label: "Nasals", rows: [["n", "m", "ŋ"]] },
  { label: "Fricatives", rows: [["f", "s", "θ", "ʃ"], ["v", "z", "ð", "ʒ"]] },
  { label: "Liquids & glides", rows: [["l", "ɹ", "w", "j"]] },
  { label: "Affricates & H", rows: [["h", "tʃ", "dʒ"]] },
  {
    label: "Vowels",
    rows: [
      ["iː", "ɪ", "e", "eː"],
      ["æ", "ɐ", "ɐː", "ɜː"],
      ["ʉː", "ɔ", "oː", "ʊ"],
      ["æɪ", "ɑe", "oɪ", "əʉ"],
      ["æɔ", "ɪə", "ə"],
    ],
  },
];

export const IPA_KEYBOARD_ROWS = IPA_KEYBOARD_GROUPS.flatMap((g) => g.rows);
export const ALL_PHONEMES = IPA_KEYBOARD_ROWS.flat();

// Shown under the phoneme picker; also the message the API returns when
// it rejects an unrecognised symbol.
export const KNOWN_PHONEMES_HINT =
  "These are the HCE phoneme symbols. Multi-character tokens (tʃ, əʉ, ɐː) each count as one phoneme.";

// IPA symbol -> English grapheme + example word, for the mouse-over
// hint ("/θ/ -> TH, as in 'thin'"). Examples are drawn from the corpus
// below wherever a matching word exists, so the hint and the puzzle
// content stay consistent.
export const IPA_TO_GRAPHEME = {
  p: { grapheme: "P", example: "pond" },
  t: { grapheme: "T", example: "tent" },
  k: { grapheme: "K", example: "cold" },
  b: { grapheme: "B", example: "bed" },
  d: { grapheme: "D", example: "desk" },
  g: { grapheme: "G", example: "gift" },
  n: { grapheme: "N", example: "wind" },
  m: { grapheme: "M", example: "milk" },
  ŋ: { grapheme: "NG", example: "ring" },
  f: { grapheme: "F", example: "fan" },
  s: { grapheme: "S", example: "sun" },
  θ: { grapheme: "TH", example: "thin" },
  ʃ: { grapheme: "SH", example: "ship" },
  v: { grapheme: "V", example: "van" },
  z: { grapheme: "Z", example: "zip" },
  ð: { grapheme: "TH", example: "then" },
  ʒ: { grapheme: "S", example: "measure" },
  l: { grapheme: "L", example: "log" },
  ɹ: { grapheme: "R", example: "ring" },
  w: { grapheme: "W", example: "win" },
  j: { grapheme: "Y", example: "yes" },
  h: { grapheme: "H", example: "hat" },
  tʃ: { grapheme: "CH", example: "chin" },
  dʒ: { grapheme: "J", example: "jam" },
  "iː": { grapheme: "EE", example: "scream" },
  ɪ: { grapheme: "I", example: "bid" },
  e: { grapheme: "E", example: "bed" },
  "eː": { grapheme: "AIR", example: "hair" },
  æ: { grapheme: "A", example: "bad" },
  ɐ: { grapheme: "U", example: "bud" },
  "ɐː": { grapheme: "AR", example: "bark" },
  "ɜː": { grapheme: "ER", example: "bird" },
  "ʉː": { grapheme: "OO", example: "boot" },
  ɔ: { grapheme: "O", example: "log" },
  "oː": { grapheme: "OR", example: "fork" },
  ʊ: { grapheme: "OO", example: "book" },
  æɪ: { grapheme: "AI", example: "bait" },
  ɑe: { grapheme: "IGH", example: "bike" },
  oɪ: { grapheme: "OI", example: "boil" },
  əʉ: { grapheme: "OA", example: "boat" },
  æɔ: { grapheme: "OU", example: "cloud" },
  ɪə: { grapheme: "EAR", example: "beard" },
  ə: { grapheme: "A", example: "sofa" },
};

export function tooltipFor(phoneme) {
  const data = IPA_TO_GRAPHEME[phoneme];
  if (!data) return phoneme;
  return `/${phoneme}/  →  ${data.grapheme}  (as in "${data.example}")`;
}

// The HCE word corpus itself lives in prisma/hce-corpus.json and is loaded
// into the database by the seed (three word lists). Until Assessment 4 a
// second hard-coded copy lived here for the builder pages; they now read
// every word from the database instead.
