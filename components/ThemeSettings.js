"use client";

import { useState } from "react";
import { LAYOUT_COOKIE, THEME_COOKIE, readCookie, writeCookie } from "@/lib/theme";

// This component is only ever rendered client-side (see the
// next/dynamic(..., { ssr: false }) import in app/settings/page.js), so
// reading document.cookie directly during the initial render is safe —
// there's no server-rendered markup for it to disagree with.
function initialCookieValue(name, fallback) {
  return readCookie(name) || fallback;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LAYOUT_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

function applyTheme(theme) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeSettings() {
  const [theme, setTheme] = useState(() => initialCookieValue(THEME_COOKIE, "system"));
  const [layout, setLayout] = useState(() => initialCookieValue(LAYOUT_COOKIE, "comfortable"));

  function handleTheme(value) {
    setTheme(value);
    writeCookie(THEME_COOKIE, value);
    applyTheme(value);
  }

  function handleLayout(value) {
    setLayout(value);
    writeCookie(LAYOUT_COOKIE, value);
    document.documentElement.setAttribute("data-layout", value);
  }

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Theme</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={theme === opt.value}
              onClick={() => handleTheme(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                theme === opt.value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Stored in a <code>{THEME_COOKIE}</code> cookie so your choice persists across visits.
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Layout density</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Layout density">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={layout === opt.value}
              onClick={() => handleLayout(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                layout === opt.value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Controls page padding for teachers who prefer a denser layout, stored in a{" "}
          <code>{LAYOUT_COOKIE}</code> cookie.
        </p>
      </fieldset>
    </div>
  );
}
