"use client";

import { IPA_KEYBOARD_GROUPS, KNOWN_PHONEMES_HINT, tooltipFor } from "@/lib/phonemeData";

// A controlled editor for an ordered phoneme sequence. `value` is a
// string[] of IPA tokens; `onChange` receives the next array. Clicking a
// key appends it; clicking a chip (or the DEL key) removes the last.
export default function PhonemePicker({ value, onChange, disabled }) {
  function append(sym) {
    if (disabled) return;
    onChange([...value, sym]);
  }
  function removeAt(index) {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800"
        aria-label="Current phoneme sequence"
      >
        {value.length === 0 && (
          <span className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Tap phonemes below to build the word…
          </span>
        )}
        {value.map((sym, i) => (
          <button
            key={`${sym}-${i}`}
            type="button"
            onClick={() => removeAt(i)}
            disabled={disabled}
            title={`Remove ${sym}`}
            className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-1 text-sm font-semibold text-indigo-800 hover:bg-indigo-200 disabled:opacity-50 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
          >
            /{sym}/<span aria-hidden="true">×</span>
          </button>
        ))}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(value.slice(0, -1))}
            disabled={disabled}
            className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            DEL
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
        {IPA_KEYBOARD_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1">
              {group.rows.flat().map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => append(sym)}
                  disabled={disabled}
                  title={tooltipFor(sym)}
                  aria-label={`Add ${sym}. ${tooltipFor(sym)}`}
                  className="min-w-[2rem] rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">{KNOWN_PHONEMES_HINT}</p>
      </div>
    </div>
  );
}
