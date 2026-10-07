import { prisma } from "./prisma";
import { recordAudit } from "./telemetry";

// Data-access layer for word lists, words and their phonemes. Keeping
// this out of the route handlers means the same logic backs the REST
// API, the seed script and (potentially) server components.

// Prisma `include` that pulls a word list's words with their phonemes,
// both in stored order.
export const wordListInclude = {
  words: {
    orderBy: { orderIndex: "asc" },
    include: { phonemes: { orderBy: { position: "asc" } } },
  },
  _count: { select: { words: true, activities: true } },
};

// Shape a Prisma WordList record into the JSON the API returns and the
// activity generators consume: each word exposes a plain `phonemes`
// string array (in order) plus the display spelling.
export function serializeWordList(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    phonemeLength: record.phonemeLength,
    wordCount: record._count?.words ?? record.words?.length ?? 0,
    activityCount: record._count?.activities ?? 0,
    words: (record.words ?? []).map(serializeWord),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function serializeWord(word) {
  const phonemes = (word.phonemes ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => p.symbol);
  return {
    id: word.id,
    wordListId: word.wordListId,
    text: word.text,
    display: word.displayText,
    displayText: word.displayText,
    phonemes,
    phonemeCount: word.phonemeCount ?? phonemes.length,
    hint: word.hint,
    notes: word.notes,
    orderIndex: word.orderIndex,
  };
}

function phonemeCreateRows(phonemes) {
  return phonemes.map((symbol, position) => ({ symbol, position }));
}

export async function listWordLists() {
  const records = await prisma.wordList.findMany({
    include: wordListInclude,
    orderBy: { createdAt: "desc" },
  });
  return records.map(serializeWordList);
}

export async function getWordList(id) {
  const record = await prisma.wordList.findUnique({
    where: { id },
    include: wordListInclude,
  });
  return record ? serializeWordList(record) : null;
}

export async function createWordList(input) {
  const words = input.words ?? [];
  const record = await prisma.wordList.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      phonemeLength: input.phonemeLength ?? inferDominantLength(words) ?? 3,
      words: {
        create: words.map((w, index) => ({
          text: w.text.toLowerCase(),
          displayText: (w.displayText ?? w.text).toUpperCase(),
          phonemeCount: w.phonemes.length,
          hint: w.hint ?? null,
          notes: w.notes ?? null,
          orderIndex: w.orderIndex ?? index,
          phonemes: { create: phonemeCreateRows(w.phonemes) },
        })),
      },
    },
    include: wordListInclude,
  });
  await recordAudit({
    entityType: "WORD_LIST",
    action: "CREATE",
    entityId: record.id,
    label: record.name,
  });
  return serializeWordList(record);
}

export async function updateWordList(id, input) {
  const record = await prisma.wordList.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.phonemeLength !== undefined ? { phonemeLength: input.phonemeLength } : {}),
    },
    include: wordListInclude,
  });
  await recordAudit({
    entityType: "WORD_LIST",
    action: "UPDATE",
    entityId: id,
    label: record.name,
  });
  return serializeWordList(record);
}

export async function deleteWordList(id) {
  const record = await prisma.wordList.delete({ where: { id } });
  await recordAudit({
    entityType: "WORD_LIST",
    action: "DELETE",
    entityId: id,
    label: record.name,
  });
}

export async function getWord(id) {
  const word = await prisma.word.findUnique({
    where: { id },
    include: { phonemes: { orderBy: { position: "asc" } } },
  });
  return word ? serializeWord(word) : null;
}

export async function addWord(wordListId, input) {
  // Ensure the parent exists so we return 404 rather than a foreign-key
  // error.
  const parent = await prisma.wordList.findUnique({ where: { id: wordListId } });
  if (!parent) return null;

  const count = await prisma.word.count({ where: { wordListId } });
  const word = await prisma.word.create({
    data: {
      wordListId,
      text: input.text.toLowerCase(),
      displayText: (input.displayText ?? input.text).toUpperCase(),
      phonemeCount: input.phonemes.length,
      hint: input.hint ?? null,
      notes: input.notes ?? null,
      orderIndex: input.orderIndex ?? count,
      phonemes: { create: phonemeCreateRows(input.phonemes) },
    },
    include: { phonemes: { orderBy: { position: "asc" } } },
  });
  await recordAudit({
    entityType: "WORD",
    action: "CREATE",
    entityId: word.id,
    label: word.displayText,
  });
  return serializeWord(word);
}

export async function updateWord(id, input) {
  // Replace the phoneme rows wholesale when a new list is supplied — the
  // simplest correct way to keep an ordered child collection in sync.
  const data = {
    ...(input.text !== undefined ? { text: input.text.toLowerCase() } : {}),
    ...(input.displayText !== undefined
      ? { displayText: input.displayText.toUpperCase() }
      : input.text !== undefined
        ? { displayText: input.text.toUpperCase() }
        : {}),
    ...(input.hint !== undefined ? { hint: input.hint } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
  };

  if (input.phonemes !== undefined) {
    data.phonemeCount = input.phonemes.length;
    data.phonemes = {
      deleteMany: {},
      create: phonemeCreateRows(input.phonemes),
    };
  }

  const word = await prisma.word.update({
    where: { id },
    data,
    include: { phonemes: { orderBy: { position: "asc" } } },
  });
  await recordAudit({
    entityType: "WORD",
    action: "UPDATE",
    entityId: id,
    label: word.displayText,
  });
  return serializeWord(word);
}

export async function deleteWord(id) {
  const word = await prisma.word.delete({ where: { id } });
  await recordAudit({
    entityType: "WORD",
    action: "DELETE",
    entityId: id,
    label: word.displayText,
  });
}

// Pick the most common phoneme count in a set of words, used as a
// sensible default for a list's `phonemeLength`.
function inferDominantLength(words) {
  if (!words.length) return null;
  const counts = new Map();
  for (const w of words) {
    const n = w.phonemes.length;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
