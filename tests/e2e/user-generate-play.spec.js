import { test, expect } from "@playwright/test";
import { createActivity, escapeRegExp, findWordList, getStats, uniqueName } from "./helpers";

// USER USE CASE — generating and playing the activities. The generated
// file is a standalone HTML game built from database records; these tests
// open it exactly as a student would and play it.

test.describe("generated activities", () => {
  let activityIds = [];
  test.afterEach(async ({ request }) => {
    for (const id of activityIds) await request.delete(`/api/activities/${id}`);
    activityIds = [];
  });

  test("student plays a generated Wordle from a saved activity", async ({ page, context, request }) => {
    const list = await findWordList(request, 3);
    const candidates = list.words.filter((w) => w.phonemes.length === 3);
    const target = candidates[0];
    // A wrong guess that shares no position with the target.
    const wrong = candidates.find((w) => w.phonemes.every((p, i) => p !== target.phonemes[i]));
    const name = uniqueName("E2E Wordle");
    const activity = await createActivity(request, {
      name,
      type: "WORDLE",
      wordListId: list.id,
      difficulty: 3,
      maxGuesses: 6,
      prefillFirst: false,
      targetWordId: target.id,
      teacherNote: "Playwright test game",
    });
    activityIds.push(activity.id);
    const before = await getStats(request);

    // The teacher previews it from the Activities page (opens a new tab).
    await page.goto("/activities");
    const row = page.getByTestId("activity-row").filter({ hasText: name });
    const [game] = await Promise.all([
      context.waitForEvent("page"),
      row.getByRole("link", { name: "Preview" }).click(),
    ]);
    await game.waitForLoadState();
    await expect(game).toHaveTitle(`Phoneme Wordle — ${target.display}`);
    await expect(game.locator("#message")).toHaveText("Guess 1 of 6.");
    await expect(game.locator("#teacher-note")).toContainText("Playwright test game");

    const type = async (phonemes) => {
      for (const p of phonemes) {
        await game
          .locator("#keyboard")
          .getByRole("button", { name: new RegExp(`^${escapeRegExp(p)}\\.`) })
          .click();
      }
      await game.getByRole("button", { name: "ENTER" }).click();
    };

    // Wrong guess: tiles are coloured and the game moves to guess 2.
    await type(wrong.phonemes);
    await expect(game.locator("#message")).toHaveText("Guess 2 of 6.");
    await expect(game.locator("#grid .row").first().locator(".tile.green")).toHaveCount(0);

    // Correct guess wins the game.
    await type(target.phonemes);
    await expect(game.locator("#message")).toHaveText("Correct! Well done.");
    await expect(game.locator("#result-panel")).toBeVisible();
    await expect(game.locator("#result-word")).toHaveText(target.display);
    await expect(game.locator("#grid .row").nth(1).locator(".tile.green")).toHaveCount(3);

    // The generation was recorded and counted on the dashboard.
    await expect
      .poll(async () => (await getStats(request)).generations.success)
      .toBeGreaterThan(before.generations.success);
  });

  test("student finds a word in a generated Word Search", async ({ page, request }) => {
    const list = await findWordList(request, 4);
    const activity = await createActivity(request, {
      name: uniqueName("E2E Word Search"),
      type: "WORD_SEARCH",
      wordListId: list.id,
      difficulty: 4,
      gridSize: 10,
      outputSettings: { wordSearchCount: 5 },
    });
    activityIds.push(activity.id);

    await page.goto(`/api/activities/${activity.id}/generate`);
    await expect(page).toHaveTitle("Phoneme Word Search");
    await expect(page.locator("#board .cell")).toHaveCount(100); // 10 × 10
    await expect(page.locator("#word-list li")).toHaveCount(5);

    // Drag across the first hidden word, using its placement from the
    // puzzle's own config.
    const placement = await page.evaluate(() => CONFIG.placements.find((p) => p.cells));
    const cell = ([r, c]) => page.locator(`.cell[data-row="${r}"][data-col="${c}"]`);
    const start = await cell(placement.cells[0]).boundingBox();
    const end = await cell(placement.cells.at(-1)).boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect(page.locator("#message")).toContainText(`Found "${placement.label}"`);
    await expect(page.locator(`[id="word-${placement.label}"]`)).toHaveClass(/done/);
    for (const rc of placement.cells) await expect(cell(rc)).toHaveClass(/found/);
  });

  test("teacher downloads a Wordle file from the builder page", async ({ page }) => {
    await page.goto("/wordle");
    await expect(page.getByRole("heading", { level: 1, name: "Build a Wordle activity" })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Generate .html file" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^phoneme-wordle-.+\.html$/);

    const html = await (await download.createReadStream()).toArray();
    const text = Buffer.concat(html).toString("utf8");
    expect(text).toContain("<!doctype html>");
    expect(text).toContain("const CONFIG =");
  });
});
