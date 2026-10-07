import Link from "next/link";
import { connection } from "next/server";
import { getDashboardSummary, getGeneratedActivities, getRecentEvents, getReport } from "@/lib/stats";
import { getAlerts } from "@/lib/alerts";
import { getMetricsSnapshot } from "@/lib/metrics";
import LiveHealth from "@/components/dashboard/LiveHealth";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import SimulatorPanel from "@/components/dashboard/SimulatorPanel";
import DailyChart from "@/components/charts/DailyChart";
import BarList from "@/components/charts/BarList";
import {
  Section,
  StatTile,
  StatusIcon,
  StatusLabel,
  TYPE_COLOR,
  formatBytes,
  formatDuration,
  formatPercent,
  timeAgo,
} from "@/components/dashboard/ui";

export const metadata = {
  title: "Dashboard — Phoneme Activity Builder",
};

// Operational dashboard. A server component: every number is read
// straight from the database (lib/stats.js, lib/alerts.js) on each
// request; <AutoRefresh> re-renders it every 30 seconds and <LiveHealth>
// polls /health every 10 seconds.
export default async function DashboardPage() {
  await connection();
  const [summary, recent, alerts, trend, outputs] = await Promise.all([
    getDashboardSummary(),
    getRecentEvents(10),
    getAlerts(),
    getReport(14),
    getGeneratedActivities(6),
  ]);
  const server = getMetricsSnapshot();
  const { content, generations, pages, mostUsedType } = summary;

  const failedTone =
    generations.last24h.failed > 0
      ? { severity: "warning", label: `${generations.last24h.failed} in last 24h` }
      : { severity: "good", label: "None in last 24h" };

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
            Live status and usage of the Wordle and Word Search builder, calculated from the
            database. See{" "}
            <Link href="/reports" className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200">
              Reports
            </Link>{" "}
            for trends over 7, 30 or 90 days.
          </p>
        </div>
        <AutoRefresh renderedAt={summary.generatedAt} />
      </div>

      <LiveHealth />

      <AlertsPanel alerts={alerts} />

      <section aria-label="Key statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          testId="stat-activities"
          label="Activities saved"
          value={content.activities.total.toLocaleString()}
          sub={`${content.activities.WORDLE} Wordle · ${content.activities.WORD_SEARCH} Word Search (${
            content.activitiesCreatedAllTime.WORDLE + content.activitiesCreatedAllTime.WORD_SEARCH
          } created all time)`}
        />
        <StatTile
          testId="stat-success"
          label="Successful generations"
          value={generations.success.toLocaleString()}
          sub={`${formatPercent(generations.successRate)} success rate · ${formatBytes(generations.totalOutputBytes)} of HTML output`}
        />
        <StatTile
          testId="stat-failed"
          label="Failed generations"
          value={generations.failed.toLocaleString()}
          tone={failedTone}
          sub={generations.lastFailure ? `· last failure ${timeAgo(generations.lastFailure.at)}` : null}
        />
        <StatTile
          testId="stat-time-on-page"
          label="Average time on page"
          value={formatDuration(pages.avgTimeOnPageMs)}
          sub={`across ${pages.views.toLocaleString()} page views`}
        />
        <StatTile
          testId="stat-most-used"
          label="Most-used activity type"
          value={mostUsedType ? mostUsedType.label : "—"}
          sub={
            mostUsedType
              ? `${mostUsedType.generations.toLocaleString()} generations (${formatPercent(mostUsedType.share, 0)} of all)`
              : "No activities yet"
          }
        />
        <StatTile
          testId="stat-content"
          label="Word lists"
          value={content.wordLists.toLocaleString()}
          tone={
            content.emptyWordLists
              ? { severity: "warning", label: `${content.emptyWordLists} empty` }
              : null
          }
          sub={`${content.words.toLocaleString()} words · ${content.distinctPhonemes} distinct phonemes`}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Section
          title="Generations, last 14 days"
          description="Successful and failed activity file generations per day."
        >
          <DailyChart data={trend.daily} title="Generations per day, last 14 days" />
        </Section>

        <Section title="Usage by activity type" description="All-time generations.">
          <BarList
            label="Generations by activity type"
            rows={["WORDLE", "WORD_SEARCH"].map((type) => {
              const t = generations.byType[type];
              const label = type === "WORDLE" ? "Wordle" : "Word Search";
              return {
                key: type,
                label,
                value: t.total,
                color: TYPE_COLOR[type],
                detail: `${t.success} successful, ${t.failed} failed, ${content.activities[type]} saved configurations`,
              };
            })}
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">Avg generation time</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{generations.avgDurationMs} ms</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">Last success</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{timeAgo(generations.lastSuccessAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">Last 24h</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {generations.last24h.success} ok · {generations.last24h.failed} failed
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">Total generations</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{generations.total.toLocaleString()}</dd>
            </div>
          </dl>
        </Section>
      </div>

      <Section
        title="Generated activities"
        description="Saved activities, the stored word list each file is built from, and their generation history. Open one to play the generated file."
        actions={
          <Link href="/activities" className="text-sm text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200">
            All activities
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="generated-activities">
            <caption className="sr-only">Generated activities</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">Activity</th>
                <th scope="col" className="py-2 pr-3 font-medium">Built from</th>
                <th scope="col" className="py-2 pr-3 font-medium">Settings</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Generated</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Failed</th>
                <th scope="col" className="py-2 pr-3 font-medium">Last generated</th>
                <th scope="col" className="py-2 font-medium">Output</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR[a.type] }} />
                      <span>
                        {a.name}
                        <span className="block text-xs text-slate-600 dark:text-slate-400">{a.typeLabel}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                    {a.wordList}
                    <span className="block text-xs text-slate-600 dark:text-slate-400">
                      {a.words} {a.words === 1 ? "word" : "words"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                    {a.difficulty} phonemes
                    <span className="block text-xs text-slate-600 dark:text-slate-400">{a.settings}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">{a.success}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">{a.failed}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">
                    {a.lastAt ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusLabel severity={a.lastStatus === "SUCCESS" ? "good" : "critical"}>
                          {a.lastStatus === "SUCCESS" ? "OK" : "Failed"}
                        </StatusLabel>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{timeAgo(a.lastAt)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 dark:text-slate-400">Never</span>
                    )}
                  </td>
                  <td className="py-2">
                    {a.words > 0 ? (
                      <span className="flex gap-3">
                        <a
                          href={`/api/activities/${a.id}/generate`}
                          target="_blank"
                          rel="noopener"
                          className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          Play<span className="sr-only"> {a.name} (opens in a new tab)</span>
                        </a>
                        <a
                          href={`/api/activities/${a.id}/generate?download=1`}
                          className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          Download<span className="sr-only"> {a.name}</span>
                        </a>
                      </span>
                    ) : (
                      <StatusLabel severity="warning">Empty word list</StatusLabel>
                    )}
                  </td>
                </tr>
              ))}
              {outputs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 text-slate-600 dark:text-slate-400">No saved activities yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Recent activity" description="Latest generations and builder changes.">
          <ol className="flex flex-col gap-2 text-sm" data-testid="recent-events">
            {recent.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5">
                <StatusIcon
                  severity={e.status === "failed" ? "critical" : e.status === "success" ? "good" : "info"}
                  size={16}
                />
                <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                  {e.text}
                  {e.simulated && (
                    <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      simulated
                    </span>
                  )}
                </span>
                <time dateTime={new Date(e.at).toISOString()} className="shrink-0 text-xs text-slate-600 dark:text-slate-400">
                  {timeAgo(e.at)}
                </time>
              </li>
            ))}
            {recent.length === 0 && <li className="text-slate-600 dark:text-slate-400">No activity recorded yet.</li>}
          </ol>
        </Section>

        <Section
          title="Server monitoring"
          description={`This server process · up ${formatDuration(server.process.uptimeSeconds * 1000)} · ${server.process.memoryMb.rss} MB memory`}
          actions={
            <a
              href="/api/metrics"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              /api/metrics
            </a>
          }
        >
          <dl className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">API requests</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{server.requests.total.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">p95 latency</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{server.requests.latencyMs.p95} ms</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 dark:text-slate-400">4xx / 5xx</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {server.requests.byStatusClass["4xx"]} / {server.requests.byStatusClass["5xx"]}
              </dd>
            </div>
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Busiest API routes</caption>
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  <th scope="col" className="py-1.5 pr-2 font-medium">Route</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">Requests</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">Avg ms</th>
                  <th scope="col" className="py-1.5 text-right font-medium">5xx</th>
                </tr>
              </thead>
              <tbody>
                {server.routes.slice(0, 6).map((r) => (
                  <tr key={`${r.method} ${r.route}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-2 font-mono text-slate-700 dark:text-slate-200">
                      {r.method} {r.route}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{r.count}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{r.avgMs}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{r.errors}</td>
                  </tr>
                ))}
                {server.routes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-2 text-slate-600 dark:text-slate-400">No API requests since the server started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section
        title="Usage simulator"
        description="Generate simulated classroom usage to see how the dashboard, reports and alerts respond."
      >
        <SimulatorPanel simulatedRecords={summary.simulatedRecords} />
      </Section>
    </div>
  );
}
