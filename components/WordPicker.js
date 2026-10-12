"use client";

// Checkbox list for choosing exactly which words go into a Word Search.
// Used by the Word Search builder and the saved-activity form, so
// teachers pick their own target words instead of getting a fixed set.
// Words with more phonemes than the grid can hold are shown disabled.
export default function WordPicker({ words, selectedIds, onChange, maxPhonemes, maxSelected = 10 }) {
  const selected = new Set(selectedIds);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < maxSelected) next.add(id);
    onChange(words.filter((w) => next.has(w.id)).map((w) => w.id));
  }

  if (!words.length) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">This word list has no words yet.</p>;
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Words to include ({selected.size}/{maxSelected})
      </legend>
      <div className="mt-1.5 max-h-56 overflow-y-auto rounded-md border border-slate-300 p-1 dark:border-slate-600">
        {words.map((w) => {
          const tooLong = maxPhonemes != null && w.phonemes.length > maxPhonemes;
          const checked = selected.has(w.id);
          const full = !checked && selected.size >= maxSelected;
          return (
            <label
              key={w.id}
              className={`flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors ${
                tooLong || full
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-800"
              }`}
              title={tooLong ? `Too long for a ${maxPhonemes} × ${maxPhonemes} grid` : undefined}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={tooLong || full}
                onChange={() => toggle(w.id)}
              />
              <span className="font-medium text-slate-800 dark:text-slate-100">{w.display}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {w.phonemes.map((p) => `/${p}/`).join(" ")}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
