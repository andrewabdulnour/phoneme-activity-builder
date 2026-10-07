import { test, expect } from "@playwright/test";
import { createActivity, uniqueName } from "./helpers";

// OBSERVABILITY — health check, dashboard indicators and alerts.

test("GET /health returns 200 OK with a connected database", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok", database: "connected" });
  expect(body.checks.database.status).toBe("ok");
});

test("dashboard shows live health and the key usage statistics", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("health-status")).toHaveText("Healthy");
  for (const id of [
    "stat-activities",
    "stat-success",
    "stat-failed",
    "stat-time-on-page",
    "stat-most-used",
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("stat-most-used")).toContainText(/Wordle|Word Search/);
});

test("an empty word list raises alerts and its failed generation is reported", async ({ page, request }) => {
  const listName = uniqueName("E2E empty list");
  const list = (await (await request.post("/api/word-lists", { data: { name: listName } })).json()).wordList;
  const activityName = uniqueName("E2E broken Wordle");
  await createActivity(request, { name: activityName, type: "WORDLE", wordListId: list.id });

  try {
    // Generating from an empty list fails with a clear error...
    const { activities } = await (await request.get("/api/activities")).json();
    const broken = activities.find((a) => a.name === activityName);
    const res = await request.get(`/api/activities/${broken.id}/generate`);
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toContain("has no words");

    // ...the Activities page warns about it...
    await page.goto("/activities");
    await expect(
      page.getByTestId("activity-row").filter({ hasText: activityName })
    ).toContainText("generating this activity will fail");

    // ...the dashboard raises critical + warning alerts...
    await page.goto("/dashboard");
    const alerts = page.getByTestId("alert-list");
    await expect(alerts.locator('[data-alert-id="activities-on-empty-lists"][data-severity="critical"]')).toContainText("cannot be generated");
    await expect(alerts).toContainText(activityName);
    await expect(alerts).toContainText(listName);
    await expect(alerts).toContainText("failed generation");

    // ...and the failure appears in the report's failure log.
    await page.goto("/reports?days=7");
    await expect(page.getByTestId("failure-log")).toContainText(`Word list "${listName}" has no words`);
  } finally {
    await request.delete(`/api/word-lists/${list.id}`); // cascades to the activity
  }
});
