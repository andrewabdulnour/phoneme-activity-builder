"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MIN_DURATION_MS = 500; // ignore instant bounces and redirects

// Measures visible time on each page and reports it to
// /api/telemetry/page-view, which feeds "average time on page" on the
// dashboard. A visit ends when the visitor navigates to another page or
// hides the tab (switches tab, minimises, closes). Returning to a hidden
// tab starts a new visit. navigator.sendBeacon delivers the report even
// while the page is being unloaded.
function report(path, durationMs) {
  if (durationMs < MIN_DURATION_MS) return;
  const body = JSON.stringify({ path, durationMs: Math.round(durationMs) });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/telemetry/page-view", blob)) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/telemetry/page-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export default function PageTimeTracker() {
  const pathname = usePathname();
  const visit = useRef(null); // { path, startedAt } while the page is visible

  useEffect(() => {
    const start = () => {
      if (document.visibilityState === "visible") {
        visit.current = { path: pathname, startedAt: performance.now() };
      }
    };
    const end = () => {
      if (!visit.current) return;
      report(visit.current.path, performance.now() - visit.current.startedAt);
      visit.current = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? end() : start());

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", end);
    return () => {
      // Route change (or unmount): close the visit for the previous path.
      end();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", end);
    };
  }, [pathname]);

  return null;
}
