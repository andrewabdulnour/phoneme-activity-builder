"use client";

import dynamic from "next/dynamic";

// Reads cookies directly on mount, so it's excluded from server
// rendering entirely to avoid a hydration mismatch against markup
// that can't know the visitor's saved preference in advance.
const ThemeSettings = dynamic(() => import("./ThemeSettings"), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-slate-500 dark:text-slate-400">Loading preferences…</p>
  ),
});

export default ThemeSettings;
