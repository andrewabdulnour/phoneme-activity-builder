import { prisma } from "./prisma";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABEL } from "./telemetry";

// Read-side aggregation for the dashboard (/dashboard) and reports
// (/reports). Everything here is computed from database records — the
// builder's own content tables plus the observability event tables — so
// the numbers survive restarts and reflect every server instance.

const DAY_MS = 24 * 60 * 60 * 1000;

const round = (n, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

// Local calendar day, e.g. "2026-09-27", used to bucket events by day.
export function dayKey(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function countBy(rows, keyOf) {
  const out = {};
  for (const row of rows) {
    const key = keyOf(row);
    out[key] = (out[key] ?? 0) + (row._count?._all ?? 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export async function getDashboardSummary() {
  const since24h = new Date(Date.now() - DAY_MS);

  const [
    wordLists,
    wordCount,
    distinctPhonemes,
    activitiesByType,
    createdByType,
    generationsByTypeStatus,
    generations24h,
    generationAgg,
    lastSuccess,
    lastFailure,
    pageAgg,
    simulatedCount,
  ] = await Promise.all([
    prisma.wordList.findMany({ select: { id: true, _count: { select: { words: true } } } }),
    prisma.word.count(),
    prisma.phoneme.groupBy({ by: ["symbol"] }),
    prisma.activityConfig.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.auditEvent.groupBy({
      by: ["activityType"],
      where: { entityType: "ACTIVITY", action: "CREATE" },
      _count: { _all: true },
    }),
    prisma.generationEvent.groupBy({ by: ["activityType", "status"], _count: { _all: true } }),
    prisma.generationEvent.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since24h } },
      _count: { _all: true },
    }),
    prisma.generationEvent.aggregate({
      where: { status: "SUCCESS" },
      _avg: { durationMs: true },
      _sum: { outputBytes: true },
    }),
    prisma.generationEvent.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.generationEvent.findFirst({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, errorMessage: true, activityType: true },
    }),
    prisma.pageView.aggregate({ _avg: { durationMs: true }, _count: { _all: true } }),
    Promise.all([
      prisma.generationEvent.count({ where: { simulated: true } }),
      prisma.pageView.count({ where: { simulated: true } }),
      prisma.auditEvent.count({ where: { simulated: true } }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
  ]);

  // Generations by type and status.
  const byType = Object.fromEntries(
    ACTIVITY_TYPES.map((t) => [t, { success: 0, failed: 0, total: 0 }])
  );
  for (const row of generationsByTypeStatus) {
    const bucket = byType[row.activityType];
    if (!bucket) continue;
    const key = row.status === "SUCCESS" ? "success" : "failed";
    bucket[key] += row._count._all;
    bucket.total += row._count._all;
  }
  const success = byType.WORDLE.success + byType.WORD_SEARCH.success;
  const failed = byType.WORDLE.failed + byType.WORD_SEARCH.failed;
  const total = success + failed;
  const last24 = countBy(generations24h, (r) => r.status);

  // "Most-used" activity type = the type generated most often; ties
  // broken by how many configurations of that type exist.
  const activityCounts = countBy(activitiesByType, (r) => r.type);
  const ranked = ACTIVITY_TYPES.map((type) => ({
    type,
    label: ACTIVITY_TYPE_LABEL[type],
    generations: byType[type].total,
    configurations: activityCounts[type] ?? 0,
  })).sort((a, b) => b.generations - a.generations || b.configurations - a.configurations);
  const top = ranked[0];
  const mostUsedType =
    top.generations > 0 || top.configurations > 0
      ? { ...top, share: total ? top.generations / total : null }
      : null;

  const createdAllTime = countBy(createdByType, (r) => r.activityType ?? "UNKNOWN");

  return {
    generatedAt: new Date().toISOString(),
    content: {
      wordLists: wordLists.length,
      emptyWordLists: wordLists.filter((l) => l._count.words === 0).length,
      words: wordCount,
      distinctPhonemes: distinctPhonemes.length,
      activities: {
        total: (activityCounts.WORDLE ?? 0) + (activityCounts.WORD_SEARCH ?? 0),
        WORDLE: activityCounts.WORDLE ?? 0,
        WORD_SEARCH: activityCounts.WORD_SEARCH ?? 0,
      },
      activitiesCreatedAllTime: {
        WORDLE: createdAllTime.WORDLE ?? 0,
        WORD_SEARCH: createdAllTime.WORD_SEARCH ?? 0,
      },
    },
    generations: {
      total,
      success,
      failed,
      successRate: total ? success / total : null,
      last24h: { success: last24.SUCCESS ?? 0, failed: last24.FAILED ?? 0 },
      byType,
      avgDurationMs: round(generationAgg._avg.durationMs ?? 0, 1),
      totalOutputBytes: generationAgg._sum.outputBytes ?? 0,
      lastSuccessAt: lastSuccess?.createdAt ?? null,
      lastFailure: lastFailure
        ? {
            at: lastFailure.createdAt,
            message: lastFailure.errorMessage,
            activityType: lastFailure.activityType,
          }
        : null,
    },
    mostUsedType,
    pages: {
      views: pageAgg._count._all,
      avgTimeOnPageMs: Math.round(pageAgg._avg.durationMs ?? 0),
    },
    simulatedRecords: simulatedCount,
  };
}

// Latest generation and CRUD events, merged into one feed.
export async function getRecentEvents(limit = 12) {
  const [generations, audits] = await Promise.all([
    prisma.generationEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
  ]);

  const entityLabel = { WORD_LIST: "word list", WORD: "word", ACTIVITY: "activity" };
  const verb = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };

  return [
    ...generations.map((g) => ({
      id: g.id,
      kind: "generation",
      at: g.createdAt,
      status: g.status === "SUCCESS" ? "success" : "failed",
      text:
        g.status === "SUCCESS"
          ? `${ACTIVITY_TYPE_LABEL[g.activityType]} generated (${g.mode}, ${g.source === "BUILDER" ? "builder" : "saved activity"})`
          : `${ACTIVITY_TYPE_LABEL[g.activityType]} generation failed: ${g.errorMessage ?? "unknown error"}`,
      simulated: g.simulated,
    })),
    ...audits.map((a) => ({
      id: a.id,
      kind: "audit",
      at: a.createdAt,
      status: a.action === "DELETE" ? "neutral" : "info",
      text: `${verb[a.action]} ${a.activityType ? ACTIVITY_TYPE_LABEL[a.activityType] + " " : ""}${entityLabel[a.entityType]}${a.label ? ` "${a.label}"` : ""}`,
      simulated: a.simulated,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

// Saved activities with the stored data each generated file is built
// from (word list, word count, settings) and their generation history,
// most recently generated first. Activities never generated come last.
export async function getGeneratedActivities(limit = 6) {
  const [activities, history] = await Promise.all([
    prisma.activityConfig.findMany({
      include: { wordList: { select: { name: true, _count: { select: { words: true } } } } },
    }),
    prisma.generationEvent.groupBy({
      by: ["activityId", "status"],
      where: { activityId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const byActivity = new Map();
  for (const h of history) {
    const entry = byActivity.get(h.activityId) ?? { success: 0, failed: 0, lastAt: null, lastStatus: null };
    if (h.status === "SUCCESS") entry.success = h._count._all;
    else entry.failed = h._count._all;
    if (!entry.lastAt || h._max.createdAt > entry.lastAt) {
      entry.lastAt = h._max.createdAt;
      entry.lastStatus = h.status;
    }
    byActivity.set(h.activityId, entry);
  }

  return activities
    .map((a) => {
      const h = byActivity.get(a.id) ?? { success: 0, failed: 0, lastAt: null, lastStatus: null };
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        typeLabel: ACTIVITY_TYPE_LABEL[a.type] ?? a.type,
        difficulty: a.difficulty,
        settings:
          a.type === "WORDLE"
            ? `${a.maxGuesses ?? 6} guesses${a.prefillFirst ? ", first tile shown" : ""}`
            : `${a.gridSize ?? 10}×${a.gridSize ?? 10} grid`,
        wordList: a.wordList.name,
        words: a.wordList._count.words,
        simulated: a.simulated,
        ...h,
      };
    })
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Reports (time range)
// ---------------------------------------------------------------------------

export const REPORT_RANGES = [7, 30, 90];

export async function getReport(days = 30) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  const inRange = { createdAt: { gte: from } };

  const [generations, pageViews, creations, activities, wordLists, phonemeCounts] =
    await Promise.all([
      prisma.generationEvent.findMany({
        where: inRange,
        select: {
          createdAt: true,
          status: true,
          activityType: true,
          source: true,
          difficulty: true,
          wordListId: true,
          durationMs: true,
          errorMessage: true,
          mode: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pageView.findMany({
        where: inRange,
        select: { createdAt: true, path: true, durationMs: true },
      }),
      prisma.auditEvent.findMany({
        where: { ...inRange, entityType: "ACTIVITY", action: "CREATE" },
        select: { createdAt: true, activityType: true },
      }),
      prisma.activityConfig.findMany({
        select: { type: true, difficulty: true, wordListId: true },
      }),
      prisma.wordList.findMany({
        select: {
          id: true,
          name: true,
          simulated: true,
          _count: { select: { words: true, activities: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.phoneme.groupBy({
        by: ["symbol"],
        _count: { _all: true },
        orderBy: { _count: { symbol: "desc" } },
        take: 15,
      }),
    ]);

  // Daily series — one entry per calendar day, including empty days so
  // gaps in usage are visible rather than silently skipped.
  const daily = new Map();
  // Step by calendar day (not 24h) so daylight-saving changes can't skip
  // or repeat a day.
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    daily.set(dayKey(d), { date: dayKey(d), success: 0, failed: 0, pageViews: 0, created: 0 });
  }
  const bump = (date, field) => {
    const row = daily.get(dayKey(date));
    if (row) row[field] += 1;
  };
  generations.forEach((g) => bump(g.createdAt, g.status === "SUCCESS" ? "success" : "failed"));
  pageViews.forEach((p) => bump(p.createdAt, "pageViews"));
  creations.forEach((c) => bump(c.createdAt, "created"));

  // Per activity type.
  const byType = ACTIVITY_TYPES.map((type) => {
    const gens = generations.filter((g) => g.activityType === type);
    return {
      type,
      label: ACTIVITY_TYPE_LABEL[type],
      configurations: activities.filter((a) => a.type === type).length,
      created: creations.filter((c) => c.activityType === type).length,
      generated: gens.filter((g) => g.status === "SUCCESS").length,
      failed: gens.filter((g) => g.status === "FAILED").length,
    };
  });

  // Per difficulty (phoneme length).
  const difficulties = [
    ...new Set([
      ...activities.map((a) => a.difficulty),
      ...generations.map((g) => g.difficulty).filter(Boolean),
    ]),
  ].sort((a, b) => a - b);
  const byDifficulty = difficulties.map((difficulty) => ({
    difficulty,
    configurations: activities.filter((a) => a.difficulty === difficulty).length,
    generations: generations.filter((g) => g.difficulty === difficulty && g.status === "SUCCESS")
      .length,
  }));

  // Where generations come from.
  const sourceCounts = countBy(generations, (g) => `${g.source}:${g.mode}`);
  const SOURCE_LABEL = {
    "SAVED_ACTIVITY:preview": "Saved: preview",
    "SAVED_ACTIVITY:download": "Saved: download",
    "BUILDER:download": "Builder: download",
  };
  const bySource = Object.entries(sourceCounts)
    .map(([key, count]) => ({ key, label: SOURCE_LABEL[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);

  // Time on page, per page.
  const pageGroups = new Map();
  for (const p of pageViews) {
    const list = pageGroups.get(p.path) ?? [];
    list.push(p.durationMs);
    pageGroups.set(p.path, list);
  }
  const pages = [...pageGroups.entries()]
    .map(([path, durations]) => {
      const sorted = durations.sort((a, b) => a - b);
      return {
        path,
        views: sorted.length,
        avgMs: Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length),
        medianMs: sorted[Math.floor(sorted.length / 2)],
      };
    })
    .sort((a, b) => b.views - a.views);

  // Per word list.
  const listNames = new Map(wordLists.map((l) => [l.id, l.name]));
  const wordListRows = wordLists
    .map((l) => {
      const gens = generations.filter((g) => g.wordListId === l.id);
      const last = gens.filter((g) => g.status === "SUCCESS").at(-1);
      return {
        id: l.id,
        name: l.name,
        simulated: l.simulated,
        words: l._count.words,
        activities: l._count.activities,
        generated: gens.filter((g) => g.status === "SUCCESS").length,
        failed: gens.filter((g) => g.status === "FAILED").length,
        lastGeneratedAt: last?.createdAt ?? null,
      };
    })
    .sort((a, b) => b.generated - a.generated || a.name.localeCompare(b.name));

  const failures = generations
    .filter((g) => g.status === "FAILED")
    .slice(-20)
    .reverse()
    .map((g) => ({
      at: g.createdAt,
      activityType: g.activityType,
      label: ACTIVITY_TYPE_LABEL[g.activityType],
      source: g.source,
      wordList: listNames.get(g.wordListId) ?? (g.wordListId ? "(deleted list)" : "—"),
      message: g.errorMessage ?? "unknown error",
    }));

  const successCount = generations.filter((g) => g.status === "SUCCESS").length;
  const durations = generations.filter((g) => g.status === "SUCCESS").map((g) => g.durationMs);

  return {
    range: { days, from: from.toISOString(), to: to.toISOString() },
    totals: {
      generated: successCount,
      failed: generations.length - successCount,
      failureRate: generations.length ? (generations.length - successCount) / generations.length : null,
      pageViews: pageViews.length,
      activitiesCreated: creations.length,
      avgTimeOnPageMs: pageViews.length
        ? Math.round(pageViews.reduce((s, p) => s + p.durationMs, 0) / pageViews.length)
        : 0,
      avgGenerationMs: durations.length
        ? round(durations.reduce((s, n) => s + n, 0) / durations.length, 1)
        : 0,
    },
    daily: [...daily.values()],
    byType,
    byDifficulty,
    bySource,
    pages,
    wordLists: wordListRows,
    phonemes: phonemeCounts.map((p) => ({ symbol: p.symbol, count: p._count._all })),
    failures,
  };
}
