// Shared form styling for the builder pages and management screens.
// Previously each component kept its own copy of these class strings,
// which drifted; one definition keeps every control's hover and focus
// feedback consistent (A1 feedback: not every control had the same
// mouse-over/border feedback).

export const CARD =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export const INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:border-indigo-400 focus:border-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-400";

export const BTN_PRIMARY =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50";

export const BTN_GHOST =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-400 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";

export const LINK =
  "text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200";

export const FIELD_LABEL = "text-sm font-medium text-slate-700 dark:text-slate-200";

export function Alert({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      {children}
    </p>
  );
}
