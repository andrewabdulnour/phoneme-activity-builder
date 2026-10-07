import { badRequest, withErrorHandling } from "@/lib/apiResponse";
import { getReport, REPORT_RANGES } from "@/lib/stats";

export const dynamic = "force-dynamic";

// GET /api/reports/export?dataset=daily|word-lists|pages|failures&days=30
// Downloads one report table as CSV (opens in Excel / Google Sheets).
const DATASETS = {
  daily: {
    columns: ["date", "success", "failed", "pageViews", "created"],
    rows: (r) => r.daily,
  },
  "word-lists": {
    columns: ["name", "words", "activities", "generated", "failed", "lastGeneratedAt"],
    rows: (r) => r.wordLists,
  },
  pages: {
    columns: ["path", "views", "avgMs", "medianMs"],
    rows: (r) => r.pages,
  },
  failures: {
    columns: ["at", "label", "source", "wordList", "message"],
    rows: (r) => r.failures,
  },
};

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const GET = withErrorHandling(async (request) => {
  const params = new URL(request.url).searchParams;
  const dataset = DATASETS[params.get("dataset")];
  const days = Number(params.get("days") ?? 30);
  if (!dataset) return badRequest(`dataset must be one of ${Object.keys(DATASETS).join(", ")}`);
  if (!REPORT_RANGES.includes(days)) {
    return badRequest(`days must be one of ${REPORT_RANGES.join(", ")}`);
  }

  const report = await getReport(days);
  const lines = [
    dataset.columns.join(","),
    ...dataset.rows(report).map((row) => dataset.columns.map((c) => csvCell(row[c])).join(",")),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="phoneme-builder-${params.get("dataset")}-${days}d.csv"`,
    },
  });
});
