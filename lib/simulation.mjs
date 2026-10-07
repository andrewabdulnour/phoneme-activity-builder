// Usage simulator (Assessment 3 — "simulated input records").
//
// Generates a realistic history of classroom use on top of the real word
// lists, so the dashboard, reports and alerts have meaningful data to
// show before the app has been used for weeks:
//
//   • saved Wordle / Word Search configurations (with difficulty, hints,
//     teacher notes and output settings), plus their audit events
//   • generation attempts — mostly successful, some failed with
//     realistic error messages — spread over school hours
//   • page visits with a plausible time on page for each screen
//
// Every row is flagged `simulated: true` so it can be cleared without
// touching real data. This is plain ESM with no path aliases so both the
// Next.js server (POST /api/simulate) and the seed script can import it;
// the caller passes in its own PrismaClient.

const DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic PRNG (mulberry32) so a given seed reproduces the same
// history — handy for repeatable demos and tests.
function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function helpers(random) {
  const int = (min, max) => Math.floor(random() * (max - min + 1)) + min;
  const pick = (items) => items[Math.floor(random() * items.length)];
  const weighted = (entries) => {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = random() * total;
    for (const [value, w] of entries) {
      if ((r -= w) <= 0) return value;
    }
    return entries.at(-1)[0];
  };
  // Log-normal-ish duration: most values near `typical`, a long tail.
  const duration = (typical, spread = 0.6) =>
    Math.max(200, Math.round(typical * Math.exp((random() - 0.5) * 2 * spread)));
  return { int, pick, weighted, duration };
}

// An id in the same shape as Prisma's cuid() (a "c" and 24 base-36
// characters), so API routes and metrics treat simulated rows like real
// ones.
function cuidLike(random) {
  let id = "c";
  while (id.length < 25) id += Math.floor(random() * 36).toString(36);
  return id;
}

// A random moment on `day` during school hours (08:00–18:00 local),
// never later than now — so today's simulated events are all in the past.
// Returns null when no part of that window has happened yet.
function schoolTime(day, random) {
  const open = new Date(day);
  open.setHours(8, 0, 0, 0);
  const close = Math.min(open.getTime() + 10 * 60 * 60 * 1000, Date.now());
  if (close <= open.getTime()) return null;
  return new Date(open.getTime() + random() * (close - open.getTime()));
}

const PAGE_PROFILES = [
  // path, relative traffic, typical visible time on page (ms)
  ["/", 18, 25_000],
  ["/wordle", 22, 150_000],
  ["/word-search", 16, 170_000],
  ["/activities", 14, 95_000],
  ["/word-lists", 12, 120_000],
  ["/dashboard", 8, 60_000],
  ["/reports", 5, 75_000],
  ["/about", 3, 30_000],
  ["/settings", 2, 20_000],
];

// Realistic failure reasons per activity type, with relative weights.
const FAILURE_MESSAGES = {
  WORDLE: [
    ["Word list has no words, so this activity cannot be generated.", 5],
    ["The Wordle generator failed: target word has no phonemes", 2],
    ["Request timed out while loading the word list", 1],
  ],
  WORD_SEARCH: [
    ["Word list has no words, so this activity cannot be generated.", 4],
    ["The Word Search generator failed: could not place every word in the grid", 4],
    ["Request timed out while loading the word list", 1],
  ],
};

const HINTS = [
  "Listen for the first sound",
  "Focus on the vowel in the middle",
  "Tap each sound as you say it",
  "Watch for consonant clusters",
  null,
];

const NOTES = [
  "Week {w} — {s} focus",
  "Warm-up for small group session",
  "Homework: play twice before Friday",
  "Revision before the phonics check",
];

export async function simulateUsage(prisma, { days = 30, scale = 1, seed = Date.now() } = {}) {
  const random = createRandom(seed);
  const { int, pick, weighted, duration } = helpers(random);

  const lists = await prisma.wordList.findMany({
    where: { words: { some: {} } },
    select: {
      id: true,
      name: true,
      phonemeLength: true,
      words: {
        select: {
          id: true,
          phonemeCount: true,
          phonemes: { select: { symbol: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });
  if (!lists.length) {
    return { error: "Add at least one word list with words before running the simulator." };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - (days - 1) * DAY_MS);

  // --- Saved activity configurations -------------------------------------
  const configCount = Math.max(2, Math.round(8 * scale));
  const activityRows = [];
  const auditRows = [];
  for (let i = 0; i < configCount; i++) {
    const list = pick(lists);
    const type = weighted([["WORDLE", 6], ["WORD_SEARCH", 4]]);
    const difficulty = list.phonemeLength;
    const firstSound = pick(list.words).phonemes[0]?.symbol ?? "θ";
    const createdAt =
      schoolTime(start.getTime() + int(0, days - 1) * DAY_MS, random) ?? new Date(start);
    const name =
      type === "WORDLE"
        ? `Wordle — /${firstSound}/ practice ${i + 1}`
        : `Word Search — ${difficulty}-phoneme set ${i + 1}`;
    const record = {
      id: cuidLike(random),
      name,
      type,
      wordListId: list.id,
      difficulty,
      maxGuesses: type === "WORDLE" ? Math.max(4, 8 - difficulty) : null,
      prefillFirst: type === "WORDLE" ? difficulty <= 3 : false,
      gridSize: type === "WORD_SEARCH" ? pick([8, 10, 12]) : null,
      hint: pick(HINTS),
      teacherNote: pick(NOTES).replace("{w}", int(1, 10)).replace("{s}", `/${firstSound}/`),
      outputSettings:
        type === "WORD_SEARCH"
          ? { wordSearchCount: int(4, 8), showWordBank: true }
          : { showPhonemeKey: random() > 0.3 },
      simulated: true,
      createdAt,
      updatedAt: createdAt,
    };
    activityRows.push(record);
    auditRows.push({
      entityType: "ACTIVITY",
      action: "CREATE",
      entityId: record.id,
      label: record.name,
      activityType: type,
      simulated: true,
      createdAt,
    });
  }

  // --- Daily usage: generations, page views and occasional edits ---------
  const generationRows = [];
  const pageViewRows = [];
  for (let d = 0; d < days; d++) {
    const day = start.getTime() + d * DAY_MS;
    const weekday = new Date(day).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    // Usage ramps up over the period as more teachers adopt the tool.
    const growth = 0.6 + (0.8 * d) / Math.max(1, days - 1);
    const base = (isWeekend ? 4 : 22) * scale * growth;
    const generations = Math.max(0, Math.round(base * (0.7 + random() * 0.6)));

    for (let g = 0; g < generations; g++) {
      const createdAt = schoolTime(day, random);
      if (!createdAt) break;
      const activity = random() < 0.55 ? pick(activityRows) : null;
      const type = activity?.type ?? weighted([["WORDLE", 55], ["WORD_SEARCH", 45]]);
      const list = activity ? lists.find((l) => l.id === activity.wordListId) : pick(lists);
      const failed = random() < 0.06;
      const source = activity ? "SAVED_ACTIVITY" : "BUILDER";
      generationRows.push({
        activityType: type,
        source,
        status: failed ? "FAILED" : "SUCCESS",
        errorMessage: failed ? weighted(FAILURE_MESSAGES[type]) : null,
        activityId: activity?.id ?? null,
        wordListId: list.id,
        difficulty: activity?.difficulty ?? list.phonemeLength,
        mode: source === "BUILDER" ? "download" : random() < 0.6 ? "preview" : "download",
        durationMs: failed ? int(1, 8) : type === "WORD_SEARCH" ? int(6, 45) : int(1, 12),
        outputBytes: failed ? null : type === "WORD_SEARCH" ? int(22_000, 34_000) : int(16_000, 21_000),
        simulated: true,
        createdAt,
      });
    }

    const visits = Math.round(generations * (2.2 + random()));
    for (let v = 0; v < visits; v++) {
      const createdAt = schoolTime(day, random);
      if (!createdAt) break;
      const [path, , typical] = weighted(PAGE_PROFILES.map((p) => [p, p[1]]));
      pageViewRows.push({ path, durationMs: duration(typical), simulated: true, createdAt });
    }

    const editAt = schoolTime(day, random);
    if (editAt && !isWeekend && random() < 0.35) {
      const list = pick(lists);
      auditRows.push({
        entityType: "WORD",
        action: pick(["CREATE", "UPDATE"]),
        entityId: pick(list.words).id,
        label: list.name,
        simulated: true,
        createdAt: editAt,
      });
    }
  }

  await prisma.activityConfig.createMany({ data: activityRows });
  await prisma.auditEvent.createMany({ data: auditRows });
  await prisma.generationEvent.createMany({ data: generationRows });
  await prisma.pageView.createMany({ data: pageViewRows });

  return {
    days,
    scale,
    activities: activityRows.length,
    generations: generationRows.length,
    failedGenerations: generationRows.filter((g) => g.status === "FAILED").length,
    pageViews: pageViewRows.length,
    auditEvents: auditRows.length,
  };
}

// Remove every simulated row, leaving real data untouched.
export async function clearSimulatedData(prisma) {
  const [generations, pageViews, auditEvents, activities, wordLists] = await prisma.$transaction([
    prisma.generationEvent.deleteMany({ where: { simulated: true } }),
    prisma.pageView.deleteMany({ where: { simulated: true } }),
    prisma.auditEvent.deleteMany({ where: { simulated: true } }),
    prisma.activityConfig.deleteMany({ where: { simulated: true } }),
    prisma.wordList.deleteMany({ where: { simulated: true } }),
  ]);
  return {
    generations: generations.count,
    pageViews: pageViews.count,
    auditEvents: auditEvents.count,
    activities: activities.count,
    wordLists: wordLists.count,
  };
}
