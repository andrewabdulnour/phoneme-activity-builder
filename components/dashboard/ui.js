// Small presentational building blocks shared by /dashboard and /reports.
// Server-component safe (no client state).

export const CARD =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export function Section({ title, description, actions, children, id, className = "" }) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`${CARD} ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

// Stat tile: label, headline value, optional sub-line. `tone` adds a
// status icon + label for values that represent a state.
export function StatTile({ label, value, sub, tone, testId }) {
  return (
    <div className={`${CARD} flex flex-col gap-1`} data-testid={testId}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {(sub || tone) && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          {tone && <StatusLabel severity={tone.severity}>{tone.label}</StatusLabel>}
          {sub}
        </p>
      )}
    </div>
  );
}

const STATUS = {
  good: { color: "var(--status-good)", icon: "✓", word: "OK" },
  info: { color: "var(--status-info)", icon: "i", word: "Info" },
  warning: { color: "var(--status-warning)", icon: "!", word: "Warning" },
  critical: { color: "var(--status-critical)", icon: "✕", word: "Critical" },
};

// Status is never colour alone: a coloured icon disc plus a text label.
export function StatusLabel({ severity, children }) {
  const s = STATUS[severity] ?? STATUS.info;
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
      <StatusIcon severity={severity} />
      {children ?? s.word}
    </span>
  );
}

export function StatusIcon({ severity, size = 16 }) {
  const s = STATUS[severity] ?? STATUS.info;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-white"
      style={{
        background: s.color,
        width: size,
        height: size,
        fontSize: size * 0.62,
        color: severity === "warning" ? "#1f2937" : "#ffffff",
      }}
    >
      {s.icon}
    </span>
  );
}

// ---- formatting helpers ----------------------------------------------------

export function formatDuration(ms) {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function formatPercent(fraction, dp = 1) {
  if (fraction === null || fraction === undefined) return "—";
  return `${(fraction * 100).toFixed(dp)}%`;
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCompact(n) {
  return new Intl.NumberFormat("en-AU", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

export function timeAgo(date) {
  if (!date) return "never";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export const TYPE_COLOR = { WORDLE: "var(--viz-series-1)", WORD_SEARCH: "var(--viz-series-2)" };
