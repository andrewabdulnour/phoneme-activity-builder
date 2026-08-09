"use client";

// Accessible hover/focus tooltip. Shows on mouse hover AND keyboard
// focus so the phoneme hints work for keyboard-only and screen-reader
// users, not just mouse users.
export default function Tooltip({ label, children }) {
  return (
    <span className="relative inline-flex group focus-within:z-10">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap
                   rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0
                   shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100
                   dark:bg-slate-100 dark:text-slate-900"
      >
        {label}
      </span>
    </span>
  );
}
