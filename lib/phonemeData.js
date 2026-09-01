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

// Full HCE phoneme word corpus (90 words: 30 each of 3/4/5 phonemes).
// Fixed/hardcoded for Assessment 1 — grouped by phoneme count, which
// doubles as the difficulty control (more phonemes to blend/segment =
// harder), a more speech-pathology-meaningful axis than an arbitrary
// guess limit.
const RAW_CORPUS = {
  3: [
    ["bed", "b e d"], ["bid", "b ɪ d"], ["bad", "b æ d"], ["bud", "b ɐ d"],
    ["bird", "b ɜː d"], ["bark", "b ɐː k"], ["book", "b ʊ k"], ["boot", "b ʉː t"],
    ["boat", "b əʉ t"], ["bike", "b ɑe k"], ["bait", "b æɪ t"], ["boil", "b oɪ l"],
    ["beard", "b ɪə d"], ["choice", "tʃ oɪ s"], ["thin", "θ ɪ n"], ["then", "ð e n"],
    ["ship", "ʃ ɪ p"], ["chin", "tʃ ɪ n"], ["jam", "dʒ æ m"], ["yes", "j e s"],
    ["win", "w ɪ n"], ["ring", "ɹ ɪ ŋ"], ["log", "l ɔ g"], ["fan", "f æ n"],
    ["van", "v æ n"], ["sun", "s ɐ n"], ["zip", "z ɪ p"], ["gum", "g ɐ m"],
    ["hat", "h æ t"], ["fork", "f oː k"],
  ],
  4: [
    ["stop", "s t ɔ p"], ["frog", "f ɹ ɔ g"], ["clap", "k l æ p"], ["slip", "s l ɪ p"],
    ["drum", "d ɹ ɐ m"], ["grin", "g ɹ ɪ n"], ["train", "t ɹ æɪ n"], ["cloud", "k l æɔ d"],
    ["snake", "s n æɪ k"], ["smile", "s m ɑe l"], ["milk", "m ɪ l k"], ["hand", "h æ n d"],
    ["tent", "t e n t"], ["jump", "dʒ ɐ m p"], ["lamp", "l æ m p"], ["bank", "b æ ŋ k"],
    ["frame", "f ɹ æɪ m"], ["cold", "k əʉ l d"], ["wind", "w ɪ n d"], ["soft", "s ɔ f t"],
    ["gift", "g ɪ f t"], ["desk", "d e s k"], ["left", "l e f t"], ["pond", "p ɔ n d"],
    ["golf", "g ɔ l f"], ["silk", "s ɪ l k"], ["great", "g ɹ æɪ t"], ["crab", "k ɹ æ b"],
    ["plug", "p l ɐ g"], ["quiz", "k w ɪ z"],
  ],
  5: [
    ["stamp", "s t æ m p"], ["plant", "p l æ n t"], ["blank", "b l æ ŋ k"], ["grand", "g ɹ æ n d"],
    ["clamp", "k l æ m p"], ["twist", "t w ɪ s t"], ["trust", "t ɹ ɐ s t"], ["drink", "d ɹ ɪ ŋ k"],
    ["brisk", "b ɹ ɪ s k"], ["shrimp", "ʃ ɹ ɪ m p"], ["scrap", "s k ɹ æ p"], ["scribe", "s k ɹ ɑe b"],
    ["scream", "s k ɹ iː m"], ["splash", "s p l æ ʃ"], ["spring", "s p ɹ ɪ ŋ"], ["strap", "s t ɹ æ p"],
    ["street", "s t ɹ iː t"], ["scrub", "s k ɹ ɐ b"], ["flask", "f l ɐː s k"], ["clasp", "k l ɐː s p"],
    ["cleft", "k l e f t"], ["glint", "g l ɪ n t"], ["blend", "b l e n d"], ["strain", "s t ɹ æɪ n"],
    ["thrust", "θ ɹ ɐ s t"], ["sprawl", "s p ɹ oː l"], ["scrawl", "s k ɹ oː l"], ["sprig", "s p ɹ ɪ g"],
    ["sprout", "s p ɹ æɔ t"], ["smoked", "s m əʉ k t"],
  ],
};

export const WORD_CORPUS = Object.fromEntries(
  Object.entries(RAW_CORPUS).map(([len, entries]) => [
    Number(len),
    entries.map(([word, phonemeString]) => ({
      word,
      display: word.toUpperCase(),
      phonemes: phonemeString.split(" "),
    })),
  ])
);

export const PHONEME_LENGTHS = {
  3: { label: "3 phonemes (easier)", maxGuesses: 7, prefillFirst: true },
  4: { label: "4 phonemes (medium)", maxGuesses: 6, prefillFirst: false },
  5: { label: "5 phonemes (harder)", maxGuesses: 5, prefillFirst: false },
};

export function getWordsByLength(length) {
  return WORD_CORPUS[length] || WORD_CORPUS[3];
}

export function getWord(length, word) {
  return getWordsByLength(length).find((w) => w.word === word) || getWordsByLength(length)[0];
}

// The fixed, hardcoded word-search list: the first five words in each
// phoneme-count category from the same corpus (no database, no
// selection UI for individual words — matches the brief's "small word
// list ... can be fixed at this stage").
export function getWordSearchList(length) {
  return getWordsByLength(length).slice(0, 5);
}
