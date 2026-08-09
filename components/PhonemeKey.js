"use client";

import Tooltip from "./Tooltip";
import { tooltipFor } from "@/lib/phonemeData";

const STATUS_CLASSES = {
  green: "bg-emerald-500 border-emerald-500 text-white",
  yellow: "bg-amber-500 border-amber-500 text-white",
  gray: "bg-slate-400 border-slate-400 text-white dark:bg-slate-600 dark:border-slate-600",
};

export default function PhonemeKey({ tile, status, onClick, disabled, size = "md" }) {
  const isCompound = tile.length > 1;
  const sizeClasses = size === "lg" ? "px-4 py-3 text-base" : "px-2.5 py-2.5 text-sm";

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${tile}. ${tooltipFor(tile)}`}
      className={`rounded-md border font-semibold tracking-wide transition-colors
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600
        disabled:opacity-50 ${sizeClasses}
        ${status ? STATUS_CLASSES[status] : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"}
        ${isCompound && !status ? "ring-1 ring-indigo-400" : ""}
      `}
    >
      {tile}
    </button>
  );

  return <Tooltip label={tooltipFor(tile)}>{button}</Tooltip>;
}
