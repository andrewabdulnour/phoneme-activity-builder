"use client";

import { LAYOUT_COOKIE, THEME_COOKIE } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

// Rendered client-side only (see ThemeSettingsLoader), because the
// selected button depends on cookies the server render cannot see.
// All state lives in <ThemeProvider>; this component is just the UI.

const THEME_CHOICES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LAYOUT_CHOICES = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ThemeSettings() {
  const { theme, resolvedTheme, setTheme, layout, setLayout } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Theme</legend>
        <ChoiceGroup label="Theme" options={THEME_CHOICES} value={theme} onChange={setTheme} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {theme === "system" && `Following your device setting (currently ${resolvedTheme}). `}
          Stored in a <code>{THEME_COOKIE}</code> cookie so your choice persists across visits.
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Layout density</legend>
        <ChoiceGroup label="Layout density" options={LAYOUT_CHOICES} value={layout} onChange={setLayout} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Controls page padding for teachers who prefer a denser layout, stored in a{" "}
          <code>{LAYOUT_COOKIE}</code> cookie.
        </p>
      </fieldset>
    </div>
  );
}
