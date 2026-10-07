"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 30_000;

// Re-runs the server component (fresh database numbers) on a timer, or on
// demand. router.refresh() keeps the current render on screen until the
// new one arrives, so the page never flashes or jumps.
export default function AutoRefresh({ renderedAt }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => startTransition(() => router.refresh()), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, router]);

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
      <span aria-live="polite">
        {pending ? "Updating…" : `Updated ${new Date(renderedAt).toLocaleTimeString("en-AU")}`}
      </span>
      <label className="inline-flex items-center gap-1.5">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Auto-refresh (30s)
      </label>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Refresh now
      </button>
    </div>
  );
}
