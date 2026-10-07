import Link from "next/link";
import { getReport, REPORT_RANGES } from "@/lib/stats";
import DailyChart from "@/components/charts/DailyChart";
import BarList from "@/components/charts/BarList";
import ChartTable from "@/components/charts/ChartTable";
import {
  Section,
  StatTile,
  StatusLabel,
  TYPE_COLOR,
  formatDuration,
  formatPercent,
  timeAgo,
} from "@/components/dashboard/ui";

export const metadata = {
  title: "Reports — Phoneme Activity Builder",
};

const PAGE_NAMES = {
  "/": "Home",
  "/wordle": "Wordle builder",
  "/word-search": "Word Search builder",
  "/word-lists": "Word lists",
  "/activities": "Activities",
  "/dashboard": "Dashboard",
  "/reports": "Reports",
  "/about": "About",
  "/settings": "Settings",
};

const dateTime = (d) =>
  new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Reporting view over a selectable time range. Server component: the
// range comes from ?days= and every section is computed from the event
// tables by lib/stats.js#getReport, so all numbers on the page agree.
export default async function ReportsPage({ searchParams }) {
  const requested = Number((await searchParams).days);
  const days = REPORT_RANGES.includes(requested) ? requested : 30;
  const report = await getReport(days);
  const { totals } = report;

  const exportLink = (dataset, label) => (
    <a
      href={`/api/reports/export?dataset=${dataset}&days=${days}`}
      className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
    >
      {label}
    </a>
  );

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
          How the Wordle and Word Search builder is being used over time: generations, failures,
          time on page, word list usage and phoneme coverage. Each table can be exported as CSV.
        </p>
      </div>

      {/* One filter row, above everything it scopes. */}
      <nav aria-label="Report period" className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Period:</span>
        {REPORT_RANGES.map((d) => (
          <Link
            key={d}
            href={`/reports?days=${d}`}
            aria-current={d === days ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              d === days
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Last {d} days
          </Link>
        ))}
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(report.range.from).toLocaleDateString("en-AU")} –{" "}
          {new Date(report.range.to).toLocaleDateString("en-AU")}
        </span>
      </nav>

      <section aria-label="Period totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile testId="report-generated" label="Successful generations" value={totals.generated.toLocaleString()} sub={`avg ${totals.avgGenerationMs} ms to build`} />
        <StatTile
          testId="report-failed"
          label="Failed generations"
          value={totals.failed.toLocaleString()}
          tone={
            totals.failed
              ? { severity: totals.failureRate >= 0.2 ? "critical" : "warning", label: `${formatPercent(totals.failureRate)} failure rate` }
              : { severity: "good", label: "No failures" }
          }
        />
        <StatTile label="Activities created" value={totals.activitiesCreated.toLocaleString()} sub="saved configurations" />
        <StatTile label="Page views" value={totals.pageViews.toLocaleString()} />
        <StatTile label="Average time on page" value={formatDuration(totals.avgTimeOnPageMs)} />
        <StatTile
          label="Most generated type"
          value={
            report.byType[0].generated >= report.byType[1].generated ? report.byType[0].label : report.byType[1].label
          }
          sub={report.byType.map((t) => `${t.label} ${t.generated}`).join(" · ")}
        />
      </section>

      <Section
        title="Generations per day"
        description="Successful and failed activity generations, with page views in the table view."
        actions={exportLink("daily", "Export CSV")}
      >
        <DailyChart data={report.daily} title={`Generations per day, last ${days} days`} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Activity types" description="Generations in this period by activity type.">
          <BarList
            label="Successful generations by activity type"
            rows={report.byType.map((t) => ({
              key: t.type,
              label: t.label,
              value: t.generated,
              color: TYPE_COLOR[t.type],
              detail: `${t.failed} failed, ${t.created} created in period, ${t.configurations} saved`,
            }))}
          />
          <ChartTable
            caption="Activity types"
            columns={[
              { key: "label", label: "Type" },
              { key: "configurations", label: "Saved", numeric: true },
              { key: "created", label: "Created in period", numeric: true },
              { key: "generated", label: "Generated", numeric: true },
              { key: "failed", label: "Failed", numeric: true },
            ]}
            rows={report.byType}
          />
        </Section>

        <Section title="Difficulty levels" description="Successful generations by phoneme length.">
          <BarList
            label="Successful generations by difficulty"
            rows={report.byDifficulty.map((d) => ({
              key: d.difficulty,
              label: `${d.difficulty} phonemes`,
              value: d.generations,
              detail: `${d.configurations} saved configurations`,
            }))}
          />
          <ChartTable
            caption="Difficulty levels"
            columns={[
              { key: "difficulty", label: "Phonemes" },
              { key: "configurations", label: "Saved configurations", numeric: true },
              { key: "generations", label: "Generations", numeric: true },
            ]}
            rows={report.byDifficulty}
          />
        </Section>

        <Section
          title="Average time on page"
          description="Visible time per visit, by page."
          actions={exportLink("pages", "Export CSV")}
        >
          <BarList
            label="Average time on page"
            rows={report.pages.map((p) => ({
              key: p.path,
              label: PAGE_NAMES[p.path] ?? p.path,
              value: p.avgMs,
              display: formatDuration(p.avgMs),
              detail: `${p.views} views, median ${formatDuration(p.medianMs)}`,
            }))}
          />
          <ChartTable
            caption="Time on page"
            columns={[
              { key: "path", label: "Page" },
              { key: "views", label: "Views", numeric: true },
              { key: "avgMs", label: "Average", numeric: true },
              { key: "medianMs", label: "Median", numeric: true },
            ]}
            format={{ avgMs: formatDuration, medianMs: formatDuration }}
            rows={report.pages}
          />
        </Section>

        <Section title="Where generations come from" description="Builder pages vs saved activities, preview vs download.">
          <BarList
            label="Generations by source"
            rows={report.bySource.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
          />
        </Section>
      </div>

      <Section
        title="Word list usage"
        description="Which stored word lists activities are built from."
        actions={exportLink("word-lists", "Export CSV")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="word-list-usage">
            <caption className="sr-only">Word list usage</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">Word list</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Words</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Activities</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Generated</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Failed</th>
                <th scope="col" className="py-2 font-medium">Last generated</th>
              </tr>
            </thead>
            <tbody>
              {report.wordLists.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">
                    {l.name}
                    {l.words === 0 && (
                      <span className="ml-2 text-xs">
                        <StatusLabel severity="warning">Empty</StatusLabel>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{l.words}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{l.activities}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{l.generated}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{l.failed}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{timeAgo(l.lastGeneratedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Most common phonemes" description="Across every stored word (top 15).">
          <BarList
            label="Phoneme frequency"
            rows={report.phonemes.map((p) => ({ key: p.symbol, label: `/${p.symbol}/`, value: p.count }))}
          />
        </Section>

        <Section
          id="failures"
          title="Failure log"
          description="The 10 most recent failed generations in this period (full list in the CSV export)."
          actions={exportLink("failures", "Export CSV")}
        >
          {report.failures.length === 0 ? (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              <StatusLabel severity="good">No failed generations in this period.</StatusLabel>
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-slate-100 text-sm dark:divide-slate-800" data-testid="failure-log">
              {report.failures.slice(0, 10).map((f, i) => (
                <li key={i} className="py-2">
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-400">
                    <time dateTime={new Date(f.at).toISOString()}>{dateTime(f.at)}</time>
                    <span>·</span>
                    <span>{f.label}</span>
                    <span>·</span>
                    <span>{f.wordList}</span>
                  </p>
                  <p className="text-slate-800 dark:text-slate-100">{f.message}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </div>
  );
}
