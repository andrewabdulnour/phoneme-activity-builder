// @ts-check
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (Assessment 3). Runs against the app on
// http://localhost:3000 — an already-running `npm run dev` is reused,
// otherwise Playwright starts one. Tests create uniquely named records
// and delete them afterwards, so they are safe to run on the dev database.
//
//   npm run test:e2e           run headless
//   npm run test:e2e:ui        interactive UI mode (good for the video)
//   npm run test:e2e:report    open the last HTML report
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
