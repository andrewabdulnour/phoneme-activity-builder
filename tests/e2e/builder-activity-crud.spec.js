import { test, expect } from "@playwright/test";
import { acceptDialogs, findWordList, getStats, uniqueName } from "./helpers";

// BUILDER USE CASE — a teacher saves a Word Search activity configuration
// against a stored word list, sees it listed, updates it and deletes it.
// The dashboard's "activities saved" count follows along.

test("teacher can save, update and delete an activity configuration", async ({ page, request }) => {
  acceptDialogs(page);
  const name = uniqueName("E2E Word Search");
  const list = await findWordList(request, 3);
  const before = await getStats(request);

  // CREATE through the form
  await page.goto("/activities");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await page.getByRole("combobox", { name: "Activity type", exact: true }).selectOption("WORD_SEARCH");
  await page.getByRole("combobox", { name: "Word list", exact: true }).selectOption(list.id);
  await page.getByRole("combobox", { name: "Difficulty (phoneme length)", exact: true }).selectOption("3");
  await page.getByRole("combobox", { name: "Grid size", exact: true }).selectOption("8");
  await page.getByRole("textbox", { name: "Note for students (optional)" }).fill("Find all six words");
  await page.getByRole("button", { name: "Save activity" }).click();

  // READ — listed in the UI and stored with the chosen settings
  const row = page.getByTestId("activity-row").filter({ hasText: name });
  await expect(row).toContainText("Word Search");
  await expect(row).toContainText("8×8 grid");

  const { activities } = await (await request.get("/api/activities")).json();
  const saved = activities.find((a) => a.name === name);
  expect(saved).toMatchObject({ type: "WORD_SEARCH", gridSize: 8, difficulty: 3, wordListId: list.id });

  const during = await getStats(request);
  expect(during.content.activities.WORD_SEARCH).toBe(before.content.activities.WORD_SEARCH + 1);

  // UPDATE through the REST API (PATCH), then confirm the UI shows it
  const patch = await request.patch(`/api/activities/${saved.id}`, { data: { gridSize: 12 } });
  expect(patch.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByTestId("activity-row").filter({ hasText: name })).toContainText("12×12 grid");

  // DELETE through the UI
  await page.getByTestId("activity-row").filter({ hasText: name }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("activity-row").filter({ hasText: name })).toHaveCount(0);
  expect((await request.get(`/api/activities/${saved.id}`)).status()).toBe(404);
});
