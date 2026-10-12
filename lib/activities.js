import { prisma } from "./prisma";
import { recordAudit } from "./telemetry";
import { wordListInclude, serializeWordList } from "./wordLists";
import { generateWordleHtml } from "./generateWordleHtml";
import { generateWordSearchHtml } from "./generateWordSearchHtml";
import {
  ACTIVITY_TYPE_LABEL,
  DEFAULT_GRID_SIZE,
  DEFAULT_WORD_SEARCH_COUNT,
  pickWordSearchWords,
  pickWordleTarget,
  slugify,
  toGeneratorWord,
  wordleDefaults,
} from "./activityRules";

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
// produces a usable activity (same rules as the builder pages).
function withTypeDefaults(input) {
  const difficulty = input.difficulty ?? 3;
  if (input.type === "WORDLE") {
    const defaults = wordleDefaults(difficulty);
    return {
      difficulty,
      maxGuesses: input.maxGuesses ?? defaults.maxGuesses,
      prefillFirst: input.prefillFirst ?? defaults.prefillFirst,
      gridSize: null,
    };
  }
  return {
    difficulty,
    maxGuesses: null,
    prefillFirst: false,
    gridSize: input.gridSize ?? DEFAULT_GRID_SIZE,
  };
}

// Cross-entity rules Zod cannot check on its own, applied to the
// activity as it will be stored (after merging an update into the
// existing record). Returns an error message, or null when consistent.
// The database enforces the same type rules with a CHECK constraint;
// checking here first turns a violation into a clear 400.
async function checkActivityConsistency({ type, wordListId, targetWordId, maxGuesses, gridSize }) {
  const list = await prisma.wordList.findUnique({ where: { id: wordListId }, select: { id: true } });
  if (!list) return "wordListId does not match any word list";

  if (type === "WORD_SEARCH") {
    if (targetWordId) return "targetWordId only applies to Wordle activities";
    if (maxGuesses != null) return "maxGuesses only applies to Wordle activities";
  } else if (gridSize != null) {
    return "gridSize only applies to Word Search activities";
  }

  if (targetWordId) {
    const word = await prisma.word.findUnique({
      where: { id: targetWordId },
      select: { wordListId: true },
    });
    if (!word) return "targetWordId does not match any word";
    if (word.wordListId !== wordListId) {
      return "targetWordId must be a word in the activity's word list";
    }
  }
  return null;
}

export async function createActivity(input) {
  const defaults = withTypeDefaults(input);
  const error = await checkActivityConsistency({
    type: input.type,
    wordListId: input.wordListId,
    targetWordId: input.targetWordId,
    maxGuesses: input.type === "WORDLE" ? defaults.maxGuesses : input.maxGuesses,
    gridSize: input.type === "WORD_SEARCH" ? defaults.gridSize : input.gridSize,
  });
  if (error) return { error };

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
  const existing = await prisma.activityConfig.findUnique({ where: { id } });
  if (!existing) return { notFound: true };

  // Moving an activity to another word list drops a target word that
  // belongs to the old list (unless a new one is supplied with it).
  if (
    input.wordListId !== undefined &&
    input.wordListId !== existing.wordListId &&
    input.targetWordId === undefined
  ) {
    input = { ...input, targetWordId: null };
  }

  const merged = { ...existing, ...stripUndefined(input) };
  const error = await checkActivityConsistency(merged);
  if (error) return { error };

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
    "wordListId",
  ]) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  if (input.outputSettings !== undefined) {
    data.outputSettings = input.outputSettings ?? undefined;
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

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
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
      message: `The ${ACTIVITY_TYPE_LABEL[record.type]} generator failed: ${err.message}`,
      meta,
    };
  }
}

function buildWordle(record, words) {
  const target = pickWordleTarget(words, record);
  const html = generateWordleHtml({
    word: toGeneratorWord(target),
    length: target.phonemes.length,
    teacherNote: record.teacherNote || record.hint || "",
    maxGuesses: record.maxGuesses ?? undefined,
    prefillFirst: record.prefillFirst,
  });
  return { filename: `phoneme-wordle-${target.text}.html`, html };
}

// Word Search uses the words the teacher picked (outputSettings.wordIds)
// or, by default, the first few words that fit inside the grid.
function buildWordSearch(record, list) {
  const gridSize = record.gridSize ?? DEFAULT_GRID_SIZE;
  const settings = record.outputSettings ?? {};
  const chosen = pickWordSearchWords(list.words, {
    wordIds: Array.isArray(settings.wordIds) ? settings.wordIds : undefined,
    gridSize,
    count: Number(settings.wordSearchCount) || DEFAULT_WORD_SEARCH_COUNT,
  });
  if (!chosen.length) {
    throw new Error(`none of the selected words fit in a ${gridSize} × ${gridSize} grid`);
  }
  const html = generateWordSearchHtml({
    wordList: chosen.map(toGeneratorWord),
    size: gridSize,
    teacherNote: record.teacherNote || record.hint || "",
    length: record.difficulty,
  });
  return { filename: `phoneme-word-search-${slugify(list.name)}.html`, html };
}
