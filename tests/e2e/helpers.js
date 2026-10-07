// Shared helpers for the end-to-end tests.

export const uniqueName = (prefix) => `${prefix} ${Date.now().toString(36)}`;

// Accept the browser confirm() dialogs used before deletes.
export function acceptDialogs(page) {
  page.on("dialog", (dialog) => dialog.accept());
}

// First seeded word list with words of the given phoneme length.
export async function findWordList(request, phonemeLength) {
  const { wordLists } = await (await request.get("/api/word-lists")).json();
  const list = wordLists.find(
    (l) => l.words.some((w) => w.phonemes.length === phonemeLength) && l.words.length >= 6
  );
  if (!list) throw new Error(`No word list with ${phonemeLength}-phoneme words — run npm run db:seed`);
  return list;
}

export async function createActivity(request, data) {
  const res = await request.post("/api/activities", { data });
  if (!res.ok()) throw new Error(`create activity failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).activity;
}

export async function getStats(request) {
  return (await request.get("/api/stats")).json();
}

// Escape a phoneme symbol for use inside a RegExp.
export const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
