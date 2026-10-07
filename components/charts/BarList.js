// Horizontal bar list for ranking categories (pages, phonemes, activity
// types). Each row: label, a thin bar with a 4px rounded end, and the
// value at the bar tip — so every value is readable without hovering.
// `detail` adds context on hover/focus (native tooltip) and to the
// accessible name. Works in server components (no client state).
//
// rows: [{ key, label, value, display?, color?, detail? }]
// `color` is the entity's series colour (e.g. Wordle = slot 1); omit it
// for a single-series chart, which uses slot 1 for every bar.

export default function BarList({ rows, label, max }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data in this period.</p>;
  }
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const pct = Math.max(row.value > 0 ? 1.5 : 0, (row.value / top) * 100);
        const shown = row.display ?? row.value.toLocaleString();
        return (
          <li
            key={row.key ?? row.label}
            title={row.detail ?? undefined}
            className="group grid grid-cols-[minmax(4.5rem,8rem)_1fr] items-center gap-3 text-sm"
          >
            <span className="truncate text-slate-700 dark:text-slate-200">
              {row.swatch !== false && row.color ? (
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-baseline"
                  style={{ background: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="relative h-3 flex-1">
                <span
                  className="absolute inset-y-0 left-0 rounded-r transition-opacity group-hover:opacity-80"
                  style={{ width: `${pct}%`, background: row.color ?? "var(--viz-series-1)" }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-slate-900 tabular-nums dark:text-white">
                {shown}
                {row.detail ? <span className="sr-only"> — {row.detail}</span> : null}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
