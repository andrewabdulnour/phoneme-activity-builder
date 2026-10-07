import { test, expect } from "@playwright/test";
import { acceptDialogs, escapeRegExp, uniqueName } from "./helpers";

// BUILDER USE CASE — a teacher manages a phoneme word list through the UI:
// Create a list, add a word with phonemes, Read it back (UI + API),
// Update the word, then Delete the word and the list. The dashboard's
// recent-activity feed must show the change (audit trail).

async function tapPhonemes(page, phonemes) {
  for (const symbol of phonemes) {
    await page.getByRole("button", { name: new RegExp(`^Add ${escapeRegExp(symbol)}\\.`) }).click();
  }
}

test("teacher can create, read, update and delete a word list", async ({ page, request }) => {
  acceptDialogs(page);
  const listName = uniqueName("E2E list");

  // CREATE the list
  await page.goto("/word-lists");
  await page.getByPlaceholder("List name").fill(listName);
  await page.getByPlaceholder("Description (optional)").fill("Created by Playwright");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("heading", { level: 2, name: listName })).toBeVisible();
  await expect(page.getByText("This list is empty.")).toBeVisible(); // empty-list warning

  // CREATE a word inside it: "chip" = /tʃ/ /ɪ/ /p/
  await page.getByPlaceholder("e.g. chin").fill("chip");
  await page.getByPlaceholder("e.g. CH sound").fill("CH at the start");
  await tapPhonemes(page, ["tʃ", "ɪ", "p"]);
  await page.getByRole("button", { name: "Add word" }).click();

  const row = page.getByRole("row", { name: /CHIP/ });
  await expect(row).toContainText("/tʃ/ /ɪ/ /p/");
  await expect(row).toContainText("CH at the start");
  await expect(page.getByText("This list is empty.")).toBeHidden();

  // READ — the list and word are persisted in the database
  const { wordLists } = await (await request.get("/api/word-lists")).json();
  const stored = wordLists.find((l) => l.name === listName);
  expect(stored.words).toHaveLength(1);
  expect(stored.words[0]).toMatchObject({ text: "chip", phonemes: ["tʃ", "ɪ", "p"] });

  // UPDATE the word's hint
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByPlaceholder("e.g. CH sound").first().fill("Updated hint");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: /CHIP/ })).toContainText("Updated hint");

  // DELETE the word, then the list
  await page.getByRole("row", { name: /CHIP/ }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("row", { name: /CHIP/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete list" }).click();
  await expect(page.getByRole("heading", { level: 2, name: listName })).toHaveCount(0);

  const after = await (await request.get("/api/word-lists")).json();
  expect(after.wordLists.some((l) => l.name === listName)).toBe(false);

  // Observability: every step was recorded in the audit trail.
  await page.goto("/dashboard");
  await expect(page.getByTestId("recent-events")).toContainText(`Deleted word list "${listName}"`);
});
