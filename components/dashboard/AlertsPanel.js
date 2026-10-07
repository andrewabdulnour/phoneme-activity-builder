import Link from "next/link";
import { Section, StatusIcon } from "./ui";

const SEVERITY_WORD = { critical: "Critical", warning: "Warning", info: "Info" };

// Server-rendered list of the current alerts from lib/alerts.js. Each
// alert carries an icon, a severity word and a link to where to fix it.
export default function AlertsPanel({ alerts }) {
  const counts = { critical: 0, warning: 0, info: 0 };
  alerts.forEach((a) => (counts[a.severity] += 1));

  return (
    <Section
      id="alerts"
      title="Alerts"
      description="Failed generations, empty word lists, invalid data and other unusual states."
      actions={
        <p className="flex gap-3 text-sm" data-testid="alert-counts">
          {["critical", "warning", "info"].map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
              <StatusIcon severity={s} size={14} />
              {counts[s]} {SEVERITY_WORD[s].toLowerCase()}
            </span>
          ))}
        </p>
      }
    >
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" data-testid="no-alerts">
          <StatusIcon severity="good" />
          All clear — no failed generations, empty lists or invalid data detected.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="alert-list">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              data-severity={alert.severity}
              data-alert-id={alert.id}
              className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <StatusIcon severity={alert.severity} size={20} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  <span className="sr-only">{SEVERITY_WORD[alert.severity]}: </span>
                  {alert.title}
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{alert.detail}</p>
              </div>
              {alert.href && (
                <Link
                  href={alert.href}
                  className="shrink-0 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  Review<span className="sr-only">: {alert.title}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
