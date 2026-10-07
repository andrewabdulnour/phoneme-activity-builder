"use client";

import { useMemo, useRef, useState } from "react";
import { generateWordSearchGrid } from "@/lib/wordSearchGenerator";
import { ALL_PHONEMES, tooltipFor } from "@/lib/phonemeData";

function straightPath(start, end) {
  const [r0, c0] = start;
  const [r1, c1] = end;
  if (r0 !== r1 && c0 !== c1 && Math.abs(r1 - r0) !== Math.abs(c1 - c0)) return null;
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
  return Array.from({ length: len }, (_, i) => [r0 + dr * i, c0 + dc * i]);
}

function pathsMatch(a, b) {
  if (a.length !== b.length) return false;
  const forward = a.every(([r, c], i) => b[i][0] === r && b[i][1] === c);
  const backward = a.every(([r, c], i) => b[b.length - 1 - i][0] === r && b[b.length - 1 - i][1] === c);
  return forward || backward;
}

const DEFAULT_MESSAGE =
  "Click/tap and drag across phonemes to find each word — or use Tab, arrow keys and Enter.";

export default function WordSearchGame({ wordList, size }) {
  const [seed, setSeed] = useState(0);
  const entries = useMemo(
    () => wordList.map((w) => ({ label: w.display, units: w.phonemes })),
    [wordList]
  );
  const { grid, placements } = useMemo(
    () => generateWordSearchGrid(entries, size, ALL_PHONEMES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, size, seed]
  );

  const [found, setFound] = useState(new Set());
  const [selecting, setSelecting] = useState([]);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [focusPos, setFocusPos] = useState([0, 0]);
  const [selectStart, setSelectStart] = useState(null);
  const draggingRef = useRef(false);
  const startRef = useRef(null);
  const gridRef = useRef(null);

  function cellKey(r, c) {
    return r + "-" + c;
  }

  function isFoundCell(r, c) {
    for (const w of found) {
      const p = placements.find((pl) => pl.label === w);
      if (p?.cells?.some(([pr, pc]) => pr === r && pc === c)) return true;
    }
    return false;
  }

  function evaluateSelection(path) {
    if (!path || path.length < 2) return;
    const match = placements.find(
      (p) => p.cells && !found.has(p.label) && pathsMatch(p.cells, path)
    );
    if (match) {
      const nextFound = new Set(found).add(match.label);
      setFound(nextFound);
      setMessage(
        nextFound.size === wordList.length
          ? "All words found! Puzzle complete."
          : `Found "${match.label}" (${match.units.join(" ")})! (${nextFound.size}/${wordList.length})`
      );
    }
  }

  // --- Pointer (mouse/touch) drag selection ---
  function onPointerDown(r, c) {
    draggingRef.current = true;
    startRef.current = [r, c];
    setSelecting([[r, c]]);
  }
  function onPointerEnter(r, c) {
    if (!draggingRef.current) return;
    const path = straightPath(startRef.current, [r, c]);
    if (path) setSelecting(path);
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    evaluateSelection(selecting);
    setSelecting([]);
  }

  // --- Keyboard selection: arrow keys move a roving focus cell, Enter
  // marks the start then (on a second press) submits the straight-line
  // path to the currently focused cell — the same validation the mouse
  // drag uses, so any word reachable by mouse is reachable by keyboard. ---
  function focusCell(r, c) {
    setFocusPos([r, c]);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector(`[data-row="${r}"][data-col="${c}"]`)?.focus();
    });
  }

  function onGridKeyDown(e) {
    const [r, c] = focusPos;
    let next = null;
    if (e.key === "ArrowUp") next = [Math.max(0, r - 1), c];
    else if (e.key === "ArrowDown") next = [Math.min(size - 1, r + 1), c];
    else if (e.key === "ArrowLeft") next = [r, Math.max(0, c - 1)];
    else if (e.key === "ArrowRight") next = [r, Math.min(size - 1, c + 1)];
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!selectStart) {
        setSelectStart([r, c]);
        setSelecting([[r, c]]);
      } else {
        evaluateSelection(selecting);
        setSelectStart(null);
        setSelecting([]);
      }
      return;
    } else if (e.key === "Escape") {
      setSelectStart(null);
      setSelecting([]);
      return;
    } else {
      return;
    }
    e.preventDefault();
    focusCell(next[0], next[1]);
    if (selectStart) {
      const path = straightPath(selectStart, next);
      setSelecting(path || [selectStart]);
    }
  }

  const selectingKeys = new Set(selecting.map(([r, c]) => cellKey(r, c)));

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSeed((s) => s + 1);
            setFound(new Set());
            setSelecting([]);
            setSelectStart(null);
            setMessage(DEFAULT_MESSAGE);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Shuffle layout
        </button>
      </div>

      <p role="status" aria-live="polite" className="mb-3 min-h-6 max-w-md text-center text-sm font-medium text-slate-700 dark:text-slate-300">
        {message}
      </p>

      <div className="flex flex-wrap justify-center gap-6" onPointerUp={onPointerUp} onPointerLeave={() => draggingRef.current && onPointerUp()}>
        <div
          ref={gridRef}
          role="grid"
          aria-label="Phoneme word search grid. Arrow keys to move, Enter to start and finish a selection."
          onKeyDown={onGridKeyDown}
          className="grid touch-none select-none gap-0.5 rounded-lg border border-slate-300 bg-slate-300 p-0.5 dark:border-slate-700 dark:bg-slate-700"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) => (
            // role="row" wrappers give the ARIA grid its required row
            // structure; `display: contents` keeps the CSS grid layout.
            <div key={r} role="row" className="contents">
              {row.map((token, c) => {
                const key = cellKey(r, c);
                const isSelecting = selectingKeys.has(key);
                const isFound = isFoundCell(r, c);
                const isFocusable = focusPos[0] === r && focusPos[1] === c;
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    data-row={r}
                    data-col={c}
                    tabIndex={isFocusable ? 0 : -1}
                    title={tooltipFor(token)}
                    aria-label={`Row ${r + 1}, column ${c + 1}: ${token}. ${tooltipFor(token)}`}
                    onFocus={() => setFocusPos([r, c])}
                    onPointerDown={() => onPointerDown(r, c)}
                    onPointerEnter={() => onPointerEnter(r, c)}
                    className={`flex h-9 min-w-8 cursor-pointer items-center justify-center rounded-sm px-0.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:h-10 sm:min-w-9 sm:text-sm ${
                      isFound
                        ? "bg-emerald-500 text-white"
                        : isSelecting
                        ? "bg-amber-400 text-white"
                        : "bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="min-w-[14rem] rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Find these words</h2>
          <ul className="flex flex-col gap-1.5">
            {wordList.map((w) => (
              <li
                key={w.word}
                title={`${w.display} — ${w.phonemes.map((p) => `/${p}/`).join(" ")}`}
                className={`cursor-help rounded px-2 py-1 text-sm font-semibold tracking-wide ${
                  found.has(w.display)
                    ? "text-emerald-600 line-through dark:text-emerald-400"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {w.phonemes.map((p) => `/${p}/`).join(" ")}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Hover or focus a word to reveal its English spelling.
          </p>
        </div>
      </div>
    </div>
  );
}
