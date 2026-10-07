import { prisma } from "./prisma";
import { KNOWN_PHONEMES } from "./validation";

// Rule-based alerts for the dashboard (Assessment 3). Each rule inspects
// the stored data or recent events and returns zero or more alerts:
//
//   { id, severity: "critical" | "warning" | "info", title, detail, href }
//
// "critical" = something is broken for teachers right now,
// "warning"  = data that will produce a poor or unexpected activity,
// "info"     = worth knowing, no action strictly needed.

const DAY_MS = 24 * 60 * 60 * 1000;

export const ALERT_THRESHOLDS = {
  failureRateCritical: 0.2, // share of failed generations in the last 24h
  minAttemptsForRate: 5,
  slowGenerationMs: 500,
  idleDays: 7,
  minWordSearchWords: 3,
};

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const names = (items, max = 3) => {
  const shown = items.slice(0, max).map((n) => `"${n}"`).join(", ");
  return items.length > max ? `${shown} and ${items.length - max} more` : shown;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export async function getAlerts() {
  const T = ALERT_THRESHOLDS;
  const now = Date.now();

  const [lists, activities, recent, lastGeneration] = await Promise.all([
    prisma.wordList.findMany({
      select: {
        id: true,
        name: true,
        words: {
          select: {
            id: true,
            displayText: true,
            phonemeCount: true,
            phonemes: { select: { symbol: true } },
          },
        },
      },
    }),
    prisma.activityConfig.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        difficulty: true,
        gridSize: true,
        targetWordId: true,
        wordListId: true,
      },
    }),
    prisma.generationEvent.findMany({
      where: { createdAt: { gte: new Date(now - DAY_MS) } },
      select: { status: true, durationMs: true, errorMessage: true },
    }),
    prisma.generationEvent.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const alerts = [];
  const listById = new Map(lists.map((l) => [l.id, l]));

  // 1. Failed generations in the last 24 hours.
  const failed = recent.filter((r) => r.status === "FAILED");
  if (failed.length) {
    const rate = failed.length / recent.length;
    const critical = recent.length >= T.minAttemptsForRate && rate >= T.failureRateCritical;
    alerts.push({
      id: "generation-failures",
      severity: critical ? "critical" : "warning",
      title: `${plural(failed.length, "failed generation")} in the last 24 hours`,
      detail: `${Math.round(rate * 100)}% of ${recent.length} attempts failed. Latest error: ${
        failed.at(-1).errorMessage ?? "unknown"
      }`,
      href: "/reports#failures",
    });
  }

  // 2. Activities whose word list is empty — generation will fail.
  const emptyListIds = new Set(lists.filter((l) => l.words.length === 0).map((l) => l.id));
  const blocked = activities.filter((a) => emptyListIds.has(a.wordListId));
  if (blocked.length) {
    alerts.push({
      id: "activities-on-empty-lists",
      severity: "critical",
      title: `${plural(blocked.length, "activity")} cannot be generated`,
      detail: `${names(blocked.map((a) => a.name))} ${blocked.length === 1 ? "uses" : "use"} an empty word list. Add words to the list or move the activity to another list.`,
      href: "/activities",
    });
  }

  // 3. Empty word lists.
  const emptyLists = lists.filter((l) => l.words.length === 0);
  if (emptyLists.length) {
    alerts.push({
      id: "empty-word-lists",
      severity: "warning",
      title: `${plural(emptyLists.length, "word list")} ${emptyLists.length === 1 ? "has" : "have"} no words`,
      detail: `${names(emptyLists.map((l) => l.name))} cannot be used to build an activity yet.`,
      href: "/word-lists",
    });
  }

  // 4. Invalid data — phoneme symbols outside the known inventory, or a
  //    stored phoneme count that disagrees with the phoneme rows.
  const invalidWords = [];
  for (const list of lists) {
    for (const word of list.words) {
      const unknown = word.phonemes.some((p) => !KNOWN_PHONEMES.has(p.symbol));
      const countMismatch = word.phonemeCount !== word.phonemes.length;
      if (unknown || countMismatch) invalidWords.push(`${word.displayText} (${list.name})`);
    }
  }
  if (invalidWords.length) {
    alerts.push({
      id: "invalid-phoneme-data",
      severity: "warning",
      title: `${plural(invalidWords.length, "word")} with invalid phoneme data`,
      detail: `${names(invalidWords)} use a phoneme symbol that is not on the IPA keyboard, or have an inconsistent phoneme count.`,
      href: "/word-lists",
    });
  }

  // 5. Wordle activities with no word at their difficulty (the generator
  //    silently falls back to a word of a different length).
  const wordleMismatch = activities.filter((a) => {
    if (a.type !== "WORDLE" || a.targetWordId) return false;
    const list = listById.get(a.wordListId);
    return list?.words.length && !list.words.some((w) => w.phonemeCount === a.difficulty);
  });
  if (wordleMismatch.length) {
    alerts.push({
      id: "wordle-difficulty-mismatch",
      severity: "warning",
      title: `${plural(wordleMismatch.length, "Wordle activity")} ${wordleMismatch.length === 1 ? "has" : "have"} no word at the chosen difficulty`,
      detail: `${names(wordleMismatch.map((a) => a.name))} will fall back to a word of a different phoneme length.`,
      href: "/activities",
    });
  }

  // 6. Word Search activities that will produce a thin puzzle.
  const thinSearches = activities.filter((a) => {
    if (a.type !== "WORD_SEARCH") return false;
    const list = listById.get(a.wordListId);
    if (!list?.words.length) return false; // already covered by rule 2
    const fitting = list.words.filter((w) => w.phonemeCount <= (a.gridSize ?? 10));
    return fitting.length < T.minWordSearchWords;
  });
  if (thinSearches.length) {
    alerts.push({
      id: "word-search-too-few-words",
      severity: "warning",
      title: `${plural(thinSearches.length, "Word Search")} with fewer than ${T.minWordSearchWords} usable words`,
      detail: `${names(thinSearches.map((a) => a.name))} will generate a very short puzzle. Add words or increase the grid size.`,
      href: "/activities",
    });
  }

  // 7. Slow generation.
  const ok = recent.filter((r) => r.status === "SUCCESS");
  const avgMs = ok.length ? ok.reduce((s, r) => s + r.durationMs, 0) / ok.length : 0;
  if (avgMs > T.slowGenerationMs) {
    alerts.push({
      id: "slow-generation",
      severity: "warning",
      title: "Activity generation is slow",
      detail: `Average generation time over the last 24 hours is ${Math.round(avgMs)} ms (threshold ${T.slowGenerationMs} ms).`,
      href: "/reports",
    });
  }

  // 8. No usage recently.
  const idleFor = lastGeneration ? now - new Date(lastGeneration.createdAt).getTime() : Infinity;
  if (idleFor > T.idleDays * DAY_MS) {
    alerts.push({
      id: "idle",
      severity: "info",
      title: lastGeneration ? `No activities generated in ${T.idleDays}+ days` : "No activities generated yet",
      detail: "Generate an activity from the Wordle, Word Search or Activities page, or run the usage simulator on this dashboard.",
      href: "/activities",
    });
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
