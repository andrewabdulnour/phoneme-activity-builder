import { test, expect } from "@playwright/test";
import { createActivity, findWordList, uniqueName } from "./helpers";

// DATA INTEGRITY (Assessment 4) — cross-entity and type rules enforced by
// the API (lib/activities.js) and backed by PostgreSQL constraints. Each
// invalid request must be rejected with a clear 4xx, never a 500.

test.describe("data integrity rules", () => {
  let activityIds = [];
  test.afterEach(async ({ request }) => {
    for (const id of activityIds) await request.delete(`/api/activities/${id}`);
    activityIds = [];
  });

  test("a Wordle target word must belong to the activity's word list", async ({ request }) => {
    const three = await findWordList(request, 3);
    const four = await findWordList(request, 4);
    const res = await request.post("/api/activities", {
      data: { name: uniqueName("Bad target"), type: "WORDLE", wordListId: three.id, targetWordId: four.words[0].id },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/word list/);
  });

  test("settings for the other activity type are rejected", async ({ request }) => {
    const list = await findWordList(request, 3);
    const wordSearch = await request.post("/api/activities", {
      data: { name: uniqueName("WS"), type: "WORD_SEARCH", wordListId: list.id, maxGuesses: 5 },
    });
    expect(wordSearch.status()).toBe(400);

    const wordle = await createActivity(request, { name: uniqueName("W"), type: "WORDLE", wordListId: list.id });
    activityIds.push(wordle.id);
    const patch = await request.patch(`/api/activities/${wordle.id}`, { data: { gridSize: 10 } });
    expect(patch.status()).toBe(400);
  });

  test("moving an activity to another list clears its old target word", async ({ request }) => {
    const three = await findWordList(request, 3);
    const four = await findWordList(request, 4);
    const activity = await createActivity(request, {
      name: uniqueName("Move"),
      type: "WORDLE",
      wordListId: three.id,
      targetWordId: three.words[0].id,
    });
    activityIds.push(activity.id);

    const res = await request.patch(`/api/activities/${activity.id}`, { data: { wordListId: four.id } });
    expect(res.status()).toBe(200);
    const { activity: moved } = await res.json();
    expect(moved.wordListId).toBe(four.id);
    expect(moved.targetWordId).toBeNull();
  });

  test("the same spelling cannot be added twice to one list", async ({ request }) => {
    const list = await findWordList(request, 3);
    const existing = list.words[0];
    const res = await request.post(`/api/word-lists/${list.id}/words`, {
      data: { text: existing.text, phonemes: existing.phonemes },
    });
    expect(res.status()).toBe(409);
  });

  test("a saved Word Search uses exactly the words the teacher chose", async ({ request }) => {
    const list = await findWordList(request, 4);
    const chosen = list.words.slice(2, 5);
    const activity = await createActivity(request, {
      name: uniqueName("Chosen words"),
      type: "WORD_SEARCH",
      wordListId: list.id,
      gridSize: 8,
      outputSettings: { wordIds: chosen.map((w) => w.id) },
    });
    activityIds.push(activity.id);

    const html = await (await request.get(`/api/activities/${activity.id}/generate`)).text();
    for (const w of chosen) expect(html).toContain(JSON.stringify(w.display));
    expect(html).not.toContain(JSON.stringify(list.words[0].display));
  });
});

test("Word Search builder lets the teacher pick the hidden words", async ({ page }) => {
  await page.goto("/word-search");
  const picker = page.getByRole("group", { name: /Words to include/ });
  await expect(picker).toContainText("(6/10)");

  const wordsToFind = page.locator("main ul").last().locator("li");
  await expect(wordsToFind).toHaveCount(6);

  // Unticking a word removes it from the preview puzzle.
  const firstLabel = picker.locator("label").first();
  const removed = (await firstLabel.locator("span").first().textContent()).trim();
  await firstLabel.getByRole("checkbox").uncheck();
  await expect(picker).toContainText("(5/10)");
  await expect(wordsToFind).toHaveCount(5);
  await expect(wordsToFind.filter({ hasText: new RegExp(`^${removed}`) })).toHaveCount(0);
});

test("theme preference is shared app-wide and survives a reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Compact" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-layout", "compact");

  await page.goto("/wordle");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-layout", "compact");

  await page.goto("/settings");
  await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Comfortable" }).click();
});
