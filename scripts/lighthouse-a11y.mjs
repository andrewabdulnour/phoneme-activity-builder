// Lighthouse accessibility audit of every page (Assessment 3).
//
//   npm run lighthouse                         audits http://localhost:3000
//   BASE_URL=http://localhost:3001 npm run lighthouse
//   npm run lighthouse -- --label before       name the output folder
//   npm run lighthouse -- --theme light        force light or dark mode
//                                              (default: follow the OS)
//
// Writes one HTML report per page plus summary.md / summary.json to
// docs/lighthouse/<label>/. Uses the Chromium that Playwright installs
// (npx playwright install chromium) unless CHROME_PATH is set.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const labelArg = process.argv.indexOf("--label");
const LABEL = labelArg > -1 ? process.argv[labelArg + 1] : new Date().toISOString().slice(0, 10);
const themeArg = process.argv.indexOf("--theme");
const THEME = themeArg > -1 ? process.argv[themeArg + 1] : null;
const OUT = path.join("docs", "lighthouse", THEME ? `${LABEL}-${THEME}` : LABEL);

// The app follows prefers-color-scheme until a theme is chosen in
// Settings; Blink's preferredColorScheme setting is 0 = dark, 1 = light.
const THEME_FLAGS = {
  light: ["--blink-settings=preferredColorScheme=1"],
  dark: ["--blink-settings=preferredColorScheme=0", "--force-dark-mode"],
};

const PAGES = [
  "/",
  "/wordle",
  "/word-search",
  "/word-lists",
  "/activities",
  "/dashboard",
  "/reports",
  "/about",
  "/settings",
];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const linuxCache = path.join(os.homedir(), ".cache", "ms-playwright");
  for (const root of [cache, linuxCache]) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const candidate of [
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-linux64/chrome",
        "chrome-linux/chrome",
        "chrome-win64/chrome.exe",
        "chrome-win/chrome.exe",
      ]) {
        const full = path.join(root, dir, candidate);
        if (fs.existsSync(full)) return full;
      }
    }
  }
  return undefined; // let chrome-launcher find an installed Chrome
}

fs.mkdirSync(OUT, { recursive: true });
const chrome = await chromeLauncher.launch({
  chromePath: findChrome(),
  chromeFlags: ["--headless=new", "--no-sandbox", ...(THEME_FLAGS[THEME] ?? [])],
});

const results = [];
try {
  for (const page of PAGES) {
    const url = BASE_URL + page;
    const runner = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      onlyCategories: ["accessibility"],
      logLevel: "error",
    });
    const { lhr, report } = runner;
    const slug = page === "/" ? "home" : page.slice(1).replace(/\//g, "-");
    fs.writeFileSync(path.join(OUT, `${slug}.html`), report);

    const failed = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
      .map((a) => ({
        id: a.id,
        title: a.title,
        items: a.details?.items?.length ?? 0,
        nodes: (a.details?.items ?? []).slice(0, 10).map((item) => ({
          selector: item.node?.selector,
          snippet: item.node?.snippet,
          explanation: item.node?.explanation,
        })),
      }));
    const score = Math.round(lhr.categories.accessibility.score * 100);
    results.push({ page, score, failed });
    console.log(`${String(score).padStart(3)}  ${page}${failed.length ? "  — " + failed.map((f) => f.id).join(", ") : ""}`);
  }
} finally {
  await chrome.kill();
}

const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
const md = [
  `# Lighthouse accessibility — ${LABEL}${THEME ? ` (${THEME} mode)` : ""}`,
  "",
  `Audited ${BASE_URL} on ${new Date().toLocaleString("en-AU")}. Average score: **${avg}**.`,
  "",
  "| Page | Score | Failing audits |",
  "|---|---:|---|",
  ...results.map(
    (r) =>
      `| \`${r.page}\` | ${r.score} | ${r.failed.map((f) => `${f.title} (${f.items})`).join("; ") || "—"} |`
  ),
  "",
];
fs.writeFileSync(path.join(OUT, "summary.md"), md.join("\n"));
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(results, null, 2));
console.log(`\nAverage ${avg}. Reports in ${OUT}/`);
