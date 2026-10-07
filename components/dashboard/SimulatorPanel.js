"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api, describeError } from "@/lib/apiClient";

// Controls for the usage simulator (POST / DELETE /api/simulate). Adds
// or clears simulated records, then refreshes the dashboard numbers.
export default function SimulatorPanel({ simulatedRecords }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  async function run(fn, describe) {
    setBusy(true);
    setMessage("");
    try {
      const result = await fn();
      setMessage(describe(result));
      startTransition(() => router.refresh());
    } catch (err) {
      setMessage(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const simulate = (days, scale) =>
    run(
      () => api.post("/api/simulate", { days, scale }),
      ({ simulated: s }) =>
        `Added ${s.generations} generations (${s.failedGenerations} failed), ${s.pageViews} page views and ${s.activities} activities over ${s.days} days.`
    );

  const BTN =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        The database currently holds{" "}
        <strong className="text-slate-900 dark:text-white">{simulatedRecords.toLocaleString()}</strong>{" "}
        simulated records. Simulated rows are flagged in the database and can be cleared without
        touching real word lists, activities or usage.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} disabled={busy} onClick={() => simulate(1, 1)}>
          Simulate today
        </button>
        <button type="button" className={BTN} disabled={busy} onClick={() => simulate(7, 2)}>
          Simulate a busy week
        </button>
        <button type="button" className={BTN} disabled={busy} onClick={() => simulate(30, 1)}>
          Simulate 30 days
        </button>
        <button
          type="button"
          disabled={busy || simulatedRecords === 0}
          onClick={() => {
            if (!confirm("Remove all simulated records?")) return;
            run(
              () => api.delete("/api/simulate"),
              ({ removed: r }) =>
                `Removed ${r.generations} generations, ${r.pageViews} page views, ${r.auditEvents} audit events and ${r.activities} activities.`
            );
          }}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
        >
          Clear simulated data
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-slate-700 dark:text-slate-300">
        {busy ? "Working…" : message}
      </p>
    </div>
  );
}
