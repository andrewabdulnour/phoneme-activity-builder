import { prisma } from "./prisma";
import { recordAudit } from "./telemetry";
import { serializeWord, wordListInclude, serializeWordList } from "./wordLists";
import { generateWordleHtml } from "./generateWordleHtml";
import { generateWordSearchHtml } from "./generateWordSearchHtml";

// Data-access + generation layer for saved activity configurations.

export function serializeActivity(record) {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    wordListId: record.wordListId,
    wordListName: record.wordList?.name,
    difficulty: record.difficulty,
    maxGuesses: record.maxGuesses,
    prefillFirst: record.prefillFirst,
    targetWordId: record.targetWordId,
    gridSize: record.gridSize,
    hint: record.hint,
    teacherNote: record.teacherNote,
    outputSettings: record.outputSettings ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const activityInclude = { wordList: { select: { id: true, name: true } } };

export async function listActivities() {
  const records = await prisma.activityConfig.findMany({
    include: activityInclude,
    orderBy: { createdAt: "desc" },
  });
  return records.map(serializeActivity);
}

export async function getActivity(id) {
  const record = await prisma.activityConfig.findUnique({
    where: { id },
    include: activityInclude,
  });
  return record ? serializeActivity(record) : null;
}

// Defaults applied per activity type so a minimal create request still
// produces a usable activity.
function withTypeDefaults(input) {
  const difficulty = input.difficulty ?? 3;
  if (input.type === "WORDLE") {
    return {
      difficulty,
      maxGuesses: input.maxGuesses ?? Math.max(4, 8 - difficulty),
      prefillFirst: input.prefillFirst ?? difficulty <= 3,
      gridSize: null,
    };
  }
  return {
    difficulty,
    maxGuesses: null,
    prefillFirst: false,
    gridSize: input.gridSize ?? 10,
  };
}

export async function createActivity(input) {
  const parent = await prisma.wordList.findUnique({ where: { id: input.wordListId } });
  if (!parent) return { error: "wordListId does not match any word list" };

  const defaults = withTypeDefaults(input);
  const record = await prisma.activityConfig.create({
    data: {
      name: input.name,
      type: input.type,
      wordListId: input.wordListId,
      difficulty: defaults.difficulty,
      maxGuesses: defaults.maxGuesses,
      prefillFirst: defaults.prefillFirst,
      gridSize: defaults.gridSize,
      targetWordId: input.targetWordId ?? null,
      hint: input.hint ?? null,
      teacherNote: input.teacherNote ?? null,
      outputSettings: input.outputSettings ?? undefined,
    },
    include: activityInclude,
  });
  await recordAudit({
    entityType: "ACTIVITY",
    action: "CREATE",
    entityId: record.id,
    label: record.name,
    activityType: record.type,
  });
  return { activity: serializeActivity(record) };
}

export async function updateActivity(id, input) {
  const data = {};
  for (const key of [
    "name",
    "difficulty",
    "maxGuesses",
    "prefillFirst",
    "targetWordId",
    "gridSize",
    "hint",
    "teacherNote",
  ]) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  if (input.outputSettings !== undefined) {
    data.outputSettings = input.outputSettings ?? undefined;
  }
  if (input.wordListId !== undefined) {
    const parent = await prisma.wordList.findUnique({ where: { id: input.wordListId } });
    if (!parent) return { error: "wordListId does not match any word list" };
    data.wordListId = input.wordListId;
  }
  const record = await prisma.activityConfig.update({
    where: { id },
    data,
    include: activityInclude,
  });
  await recordAudit({
    entityType: "ACTIVITY",
    action: "UPDATE",
    entityId: id,
    label: record.name,
    activityType: record.type,
  });
  return { activity: serializeActivity(record) };
}

export async function deleteActivity(id) {
  const record = await prisma.activityConfig.delete({ where: { id } });
  await recordAudit({
    entityType: "ACTIVITY",
    action: "DELETE",
    entityId: id,
    label: record.name,
    activityType: record.type,
  });
}

// --- Activity generation from stored data -------------------------------

// Load the full word list (with words + phonemes) behind an activity.
async function loadWordList(wordListId) {
  const record = await prisma.wordList.findUnique({
    where: { id: wordListId },
    include: wordListInclude,
  });
  return record ? serializeWordList(record) : null;
}

// Build the { filename, html, contentType } payload for an activity's
// downloadable standalone file, entirely from database records.
//
// Every result (success or error) carries `meta` describing the activity
// so the caller can record the attempt for the dashboard.
export async function renderActivityFile(activityId) {
  const record = await prisma.activityConfig.findUnique({
    where: { id: activityId },
    include: activityInclude,
  });
  if (!record) return { error: "not_found" };

  const meta = {
    activityId: record.id,
    activityType: record.type,
    wordListId: record.wordListId,
    difficulty: record.difficulty,
  };

  const list = await loadWordList(record.wordListId);
  if (!list) return { error: "not_found", meta };

  const words = list.words;
  if (!words.length) {
    return {
      error: "empty",
      message: `Word list "${list.name}" has no words, so this activity cannot be generated.`,
      meta,
    };
  }

  try {
    const file = record.type === "WORDLE" ? buildWordle(record, words) : buildWordSearch(record, list);
    return { ...file, contentType: "text/html; charset=utf-8", meta };
  } catch (err) {
    console.error(`[generate] ${record.type} ${record.id} failed:`, err);
    return {
      error: "generation_failed",
      message: `The ${record.type === "WORDLE" ? "Wordle" : "Word Search"} generator failed: ${err.message}`,
      meta,
    };
  }
}

function buildWordle(record, words) {
  const target =
    words.find((w) => w.id === record.targetWordId) ??
    words.find((w) => w.phonemes.length === record.difficulty) ??
    words[0];
  const html = generateWordleHtml({
    word: { word: target.text, display: target.display, phonemes: target.phonemes },
    length: target.phonemes.length,
    teacherNote: record.teacherNote || record.hint || "",
    maxGuesses: record.maxGuesses ?? undefined,
    prefillFirst: record.prefillFirst,
  });
  return { filename: `phoneme-wordle-${target.text}.html`, html };
}

// Word Search uses every word in the list (capped so the grid stays
// solvable), preferring words that fit inside the grid.
function buildWordSearch(record, list) {
  const words = list.words;
  const count = Number(record.outputSettings?.wordSearchCount) || 6;
  const preferred = words.filter((w) => w.phonemes.length <= (record.gridSize ?? 10));
  const chosen = (preferred.length ? preferred : words).slice(0, Math.max(3, count));
  const html = generateWordSearchHtml({
    wordList: chosen.map((w) => ({ word: w.text, display: w.display, phonemes: w.phonemes })),
    size: record.gridSize ?? 10,
    teacherNote: record.teacherNote || record.hint || "",
    length: record.difficulty,
  });
  return {
    filename: `phoneme-word-search-${list.name.toLowerCase().replace(/\s+/g, "-")}.html`,
    html,
  };
}
