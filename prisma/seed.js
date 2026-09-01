// Database seed: loads the unit's HCE phoneme corpus into the database
// so there is realistic data to build activities from on a fresh
// install. Idempotent — running it again clears the seeded rows first.
//
// Run with:  npm run db:seed   (or automatically via `prisma migrate reset`)

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const corpus = JSON.parse(
  fs.readFileSync(path.join(__dirname, "hce-corpus.json"), "utf8")
);

const LISTS = [
  {
    length: 3,
    name: "HCE 3-phoneme words",
    description:
      "30 three-phoneme words from the unit's HCE corpus. Easiest blending/segmenting difficulty.",
  },
  {
    length: 4,
    name: "HCE 4-phoneme words",
    description:
      "30 four-phoneme words (consonant clusters) from the unit's HCE corpus. Medium difficulty.",
  },
  {
    length: 5,
    name: "HCE 5-phoneme words",
    description:
      "30 five-phoneme words (multi-cluster) from the unit's HCE corpus. Hardest difficulty.",
  },
];

async function main() {
  // `node prisma/seed.js --if-empty` is a no-op when data already
  // exists — used by the Docker entrypoint so restarts don't wipe a
  // teacher's edits.
  const ifEmpty = process.argv.includes("--if-empty");
  if (ifEmpty) {
    const existing = await prisma.wordList.count();
    if (existing > 0) {
      console.log(`Database already has ${existing} word list(s) — skipping seed.`);
      return;
    }
  }

  console.log("Seeding database…");

  // Clear anything previously seeded (cascades to words, phonemes and
  // activities via the schema's onDelete: Cascade).
  await prisma.activityConfig.deleteMany({});
  await prisma.wordList.deleteMany({});

  const createdLists = {};

  for (const list of LISTS) {
    const entries = corpus[String(list.length)];
    const record = await prisma.wordList.create({
      data: {
        name: list.name,
        description: list.description,
        phonemeLength: list.length,
        words: {
          create: entries.map(([english, phonemeString], index) => {
            const phonemes = phonemeString.split(" ");
            return {
              text: english.toLowerCase(),
              displayText: english.toUpperCase(),
              phonemeCount: phonemes.length,
              orderIndex: index,
              phonemes: {
                create: phonemes.map((symbol, position) => ({ symbol, position })),
              },
            };
          }),
        },
      },
      include: { words: true },
    });
    createdLists[list.length] = record;
    console.log(`  • ${record.name} (${record.words.length} words)`);
  }

  // A couple of ready-made activity configurations.
  const wordle = await prisma.activityConfig.create({
    data: {
      name: "Starter Wordle — /θ/ focus (thin)",
      type: "WORDLE",
      wordListId: createdLists[3].id,
      difficulty: 3,
      maxGuesses: 7,
      prefillFirst: true,
      targetWordId: createdLists[3].words.find((w) => w.text === "thin")?.id ?? null,
      teacherNote: "Focus on the TH sound today.",
    },
  });
  const wordSearch = await prisma.activityConfig.create({
    data: {
      name: "Starter Word Search — 4-phoneme clusters",
      type: "WORD_SEARCH",
      wordListId: createdLists[4].id,
      difficulty: 4,
      gridSize: 10,
      teacherNote: "Circle each word you find.",
      outputSettings: { wordSearchCount: 6 },
    },
  });
  console.log(`  • activity: ${wordle.name}`);
  console.log(`  • activity: ${wordSearch.name}`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
