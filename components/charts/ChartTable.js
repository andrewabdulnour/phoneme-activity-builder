// Collapsible table view of a chart's data — the accessible equivalent
// of every chart, so no value is only available by hovering.

export default function ChartTable({ caption, columns, rows, format = {} }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300">
        Show data table
      </summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`py-1.5 pr-3 font-medium ${c.numeric ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-1.5 pr-3 text-slate-700 dark:text-slate-200 ${c.numeric ? "text-right tabular-nums" : ""}`}
                  >
                    {format[c.key] ? format[c.key](row[c.key], row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
