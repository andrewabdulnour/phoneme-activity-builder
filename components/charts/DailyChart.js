"use client";

import { useEffect, useRef, useState } from "react";
import ChartTable from "./ChartTable";

// Stacked daily column chart: successful generations (neutral) with failed
// generations (status red) stacked on top, so failure spikes stand out.
// Hover or arrow keys (when focused) show a per-day tooltip; every value
// is also in the "Show data table" view below the chart.

const PLOT_HEIGHT = 180;
const AXIS_BAND = 26;
const LEFT = 36;
const TOP = 8;
const GAP = 2; // surface gap between stacked segments

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

function niceMax(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= value) * magnitude;
  return step * 4;
}

// Column with a 4px rounded data-end and a square base.
function columnPath(x, y, w, h, rounded) {
  if (h <= 0) return "";
  const r = rounded ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

export default function DailyChart({ data, title }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(...data.map((d) => d.success + d.failed), 0));
  const plotWidth = Math.max(100, width - LEFT - 4);
  const band = plotWidth / data.length;
  const barWidth = Math.max(2, Math.min(24, band * 0.7));
  const y = (v) => TOP + PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;
  const tickEvery = Math.ceil(data.length / 6);
  const totalFailed = data.reduce((s, d) => s + d.failed, 0);
  const totalSuccess = data.reduce((s, d) => s + d.success, 0);

  function onKeyDown(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setActive((i) => {
      const current = i ?? data.length - 1;
      return e.key === "ArrowRight" ? Math.min(data.length - 1, current + 1) : Math.max(0, current - 1);
    });
  }

  const activeDay = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? LEFT + band * active + band / 2 : 0;

  return (
    <figure className="m-0">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
        <LegendSwatch color="var(--viz-neutral)" label="Successful" />
        <LegendSwatch color="var(--status-critical)" label="Failed" />
      </div>
      <div ref={wrapRef} className="relative w-full" onMouseLeave={() => setActive(null)}>
        <svg
          width={width}
          height={TOP + PLOT_HEIGHT + AXIS_BAND}
          role="img"
          tabIndex={0}
          aria-label={`${title}: ${totalSuccess} successful and ${totalFailed} failed generations over ${data.length} days. Use the left and right arrow keys to read each day.`}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="block rounded focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1={LEFT}
                x2={LEFT + plotWidth}
                y1={y(max * f)}
                y2={y(max * f)}
                stroke={f === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                strokeWidth="1"
              />
              <text
                x={LEFT - 6}
                y={y(max * f)}
                dy="0.32em"
                textAnchor="end"
                fontSize="11"
                fill="var(--viz-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(max * f).toLocaleString()}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = LEFT + band * i + (band - barWidth) / 2;
            const successTop = y(d.success);
            const failedHeight = PLOT_HEIGHT * (d.failed / max);
            const faded = active !== null && active !== i;
            return (
              <g key={d.date} opacity={faded ? 0.45 : 1}>
                <path
                  d={columnPath(x, successTop, barWidth, TOP + PLOT_HEIGHT - successTop, d.failed === 0)}
                  fill="var(--viz-neutral)"
                />
                {d.failed > 0 && (
                  <path
                    d={columnPath(
                      x,
                      successTop - failedHeight - (d.success ? GAP : 0),
                      barWidth,
                      failedHeight,
                      true
                    )}
                    fill="var(--status-critical)"
                  />
                )}
                {/* Hit target: the whole day band, taller than the mark. */}
                <rect
                  x={LEFT + band * i}
                  y={TOP}
                  width={band}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                />
                {i % tickEvery === 0 || i === data.length - 1 ? (
                  <text
                    x={LEFT + band * i + band / 2}
                    y={TOP + PLOT_HEIGHT + 17}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--viz-muted)"
                  >
                    {shortDate(d.date)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {activeDay && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
            style={{ left: Math.min(Math.max(tooltipLeft, 72), width - 72) }}
          >
            <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">
              {new Date(`${activeDay.date}T00:00:00`).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
            <TooltipRow color="var(--viz-neutral)" value={activeDay.success} label="successful" />
            <TooltipRow color="var(--status-critical)" value={activeDay.failed} label="failed" />
            <TooltipRow value={activeDay.pageViews} label="page views" />
          </div>
        )}
      </div>

      <ChartTable
        caption={title}
        columns={[
          { key: "date", label: "Date" },
          { key: "success", label: "Successful", numeric: true },
          { key: "failed", label: "Failed", numeric: true },
          { key: "pageViews", label: "Page views", numeric: true },
          { key: "created", label: "Activities created", numeric: true },
        ]}
        rows={data}
      />
    </figure>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function TooltipRow({ color, value, label }) {
  return (
    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
      {color ? (
        <span aria-hidden="true" className="inline-block h-0.5 w-3" style={{ background: color }} />
      ) : (
        <span aria-hidden="true" className="inline-block w-3" />
      )}
      <strong className="font-semibold text-slate-900 dark:text-white">{value.toLocaleString()}</strong>
      {label}
    </p>
  );
}
