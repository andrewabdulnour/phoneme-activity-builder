// Summarises JMeter .jtl result files from one run directory into a
// Markdown comparison table (summary.md) — one row per traffic level,
// plus a per-request breakdown for the heaviest level.
//
//   node tests/load/summarize.mjs tests/load/results/<run>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node tests/load/summarize.mjs <results-dir>");
  process.exit(1);
}

// Minimal CSV parser (JMeter quotes fields that contain commas).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n") row.push(field), rows.push(row), (row = []), (field = "");
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [header, ...data] = rows;
  return data.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;

function stats(samples) {
  const elapsed = samples.map((s) => Number(s.elapsed)).sort((a, b) => a - b);
  const times = samples.map((s) => Number(s.timeStamp));
  const start = Math.min(...times);
  const end = Math.max(...samples.map((s) => Number(s.timeStamp) + Number(s.elapsed)));
  const errors = samples.filter((s) => s.success !== "true");
  return {
    requests: samples.length,
    errors: errors.length,
    errorPct: (errors.length / samples.length) * 100,
    avg: elapsed.reduce((a, b) => a + b, 0) / elapsed.length,
    median: pct(elapsed, 50),
    p90: pct(elapsed, 90),
    p95: pct(elapsed, 95),
    p99: pct(elapsed, 99),
    max: elapsed.at(-1),
    throughput: samples.length / Math.max(1, (end - start) / 1000),
    durationS: (end - start) / 1000,
    errorCodes: Object.entries(
      errors.reduce((acc, s) => ((acc[s.responseCode] = (acc[s.responseCode] ?? 0) + 1), acc), {})
    )
      .map(([code, n]) => `${code || "none"}×${n}`)
      .join(", "),
  };
}

const levels = fs
  .readdirSync(dir)
  .filter((f) => /^x\d+\.jtl$/.test(f))
  .map((f) => ({ users: Number(f.slice(1, -4)), file: path.join(dir, f) }))
  .sort((a, b) => a.users - b.users);

const fmt = (n, dp = 0) => n.toLocaleString("en-AU", { maximumFractionDigits: dp, minimumFractionDigits: dp });
const lines = [
  `# JMeter load test results`,
  ``,
  `Run: \`${path.basename(dir)}\` · workflow = 7 requests per virtual user (health → word lists → builder page → save activity → generate → page-view telemetry → delete).`,
  ``,
  `| Users | Requests | Errors | Error % | Avg ms | Median ms | p90 ms | p95 ms | p99 ms | Max ms | Throughput req/s | Duration s | Error codes |`,
  `|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|`,
];

let heaviest = null;
for (const level of levels) {
  const samples = parseCsv(fs.readFileSync(level.file, "utf8"));
  if (!samples.length) continue;
  const s = stats(samples);
  lines.push(
    `| x${fmt(level.users)} | ${fmt(s.requests)} | ${fmt(s.errors)} | ${fmt(s.errorPct, 2)} | ${fmt(s.avg, 1)} | ${fmt(s.median)} | ${fmt(s.p90)} | ${fmt(s.p95)} | ${fmt(s.p99)} | ${fmt(s.max)} | ${fmt(s.throughput, 1)} | ${fmt(s.durationS, 1)} | ${s.errorCodes || "—"} |`
  );
  heaviest = { level, samples };
}

if (heaviest) {
  lines.push("", `## Per request at x${fmt(heaviest.level.users)} users`, "");
  lines.push(`| Request | Count | Error % | Avg ms | p95 ms | Max ms |`, `|---|---:|---:|---:|---:|---:|`);
  const byLabel = new Map();
  heaviest.samples.forEach((s) => byLabel.set(s.label, [...(byLabel.get(s.label) ?? []), s]));
  for (const [label, samples] of [...byLabel.entries()].sort()) {
    const s = stats(samples);
    lines.push(`| ${label} | ${fmt(s.requests)} | ${fmt(s.errorPct, 2)} | ${fmt(s.avg, 1)} | ${fmt(s.p95)} | ${fmt(s.max)} |`);
  }
}

fs.writeFileSync(path.join(dir, "summary.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
