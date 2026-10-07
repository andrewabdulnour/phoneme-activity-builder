"use client";

import { useEffect, useState } from "react";
import PhonemeKey from "./PhonemeKey";
import { IPA_KEYBOARD_GROUPS, PHONEME_LENGTHS } from "@/lib/phonemeData";

const STATUS_RANK = { gray: 0, yellow: 1, green: 2 };

function scoreGuess(guessTiles, target) {
  const statuses = new Array(guessTiles.length).fill("gray");
  const pool = target.slice();

  guessTiles.forEach((tile, i) => {
    if (tile === target[i]) {
      statuses[i] = "green";
      pool[i] = null;
    }
  });
  guessTiles.forEach((tile, i) => {
    if (statuses[i] === "green") return;
    const idx = pool.indexOf(tile);
    if (idx !== -1) {
      statuses[i] = "yellow";
      pool[idx] = null;
    }
  });
  return statuses;
}

// Remounted (via a `key` prop in the parent, keyed on word + length)
// whenever those settings change, so state is simply initialized from
// props rather than reset in an effect.
export default function WordleGame({ word, length }) {
  const settings = PHONEME_LENGTHS[length] || PHONEME_LENGTHS[3];
  const target = word.phonemes;

  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState(() => (settings.prefillFirst ? [target[0]] : []));
  const [keyStatus, setKeyStatus] = useState({});
  const [message, setMessage] = useState(() => `Guess 1 of ${settings.maxGuesses}.`);
  const finished =
    guesses.some((g) => g.statuses.every((s) => s === "green")) || guesses.length >= settings.maxGuesses;

  function handleKey(key) {
    if (finished) return;
    if (key === "DEL") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (key === "ENTER") {
      submitGuess();
      return;
    }
    setCurrent((c) => (c.length < target.length ? [...c, key] : c));
  }

  function submitGuess() {
    if (current.length !== target.length) {
      setMessage(`Not enough phonemes for this ${target.length}-phoneme word.`);
      return;
    }
    const statuses = scoreGuess(current, target);
    setKeyStatus((prev) => {
      const next = { ...prev };
      current.forEach((tile, i) => {
        if (!next[tile] || STATUS_RANK[statuses[i]] > STATUS_RANK[next[tile]]) {
          next[tile] = statuses[i];
        }
      });
      return next;
    });
    const nextGuesses = [...guesses, { tiles: current, statuses }];
    setGuesses(nextGuesses);
    setCurrent([]);

    const isWin = statuses.every((s) => s === "green");
    if (isWin) setMessage("Correct! Well done.");
    else if (nextGuesses.length >= settings.maxGuesses) setMessage("Out of guesses.");
    else setMessage(`Guess ${nextGuesses.length + 1} of ${settings.maxGuesses}.`);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (finished) return;
      if (e.key === "Enter") handleKey("ENTER");
      else if (e.key === "Backspace") handleKey("DEL");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, finished]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-3 text-center dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Target phoneme sequence
        </span>
        <p className="text-lg font-semibold tracking-[0.3em] text-indigo-700 dark:text-indigo-400">
          {target.map((p) => `/${p}/`).join("  ")}
        </p>
      </div>

      <p role="status" aria-live="polite" className="mb-3 min-h-6 text-sm font-medium text-slate-700 dark:text-slate-300">
        {message}
      </p>

      <div className="mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${target.length}, auto)` }}>
        {Array.from({ length: settings.maxGuesses }).map((_, r) => (
          <div key={r} className="contents">
            {Array.from({ length: target.length }).map((__, c) => {
              let text = "";
              let status = "";
              if (r < guesses.length) {
                text = guesses[r].tiles[c];
                status = guesses[r].statuses[c];
              } else if (r === guesses.length && c < current.length) {
                text = current[c];
              }
              const statusClasses = {
                green: "bg-emerald-500 border-emerald-500 text-white",
                yellow: "bg-amber-500 border-amber-500 text-white",
                gray: "bg-slate-400 border-slate-400 text-white dark:bg-slate-600 dark:border-slate-600",
              };
              return (
                <div
                  key={c}
                  className={`flex h-14 w-14 items-center justify-center rounded-md border-2 text-lg font-bold ${
                    status
                      ? statusClasses[status]
                      : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  {text}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-2xl flex-col items-center gap-3">
        {IPA_KEYBOARD_GROUPS.map((group) => (
          <div key={group.label} className="w-full">
            <p className="mb-1 text-center text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {group.label}
            </p>
            <div className="flex flex-col items-center gap-1.5">
              {group.rows.map((row, i) => (
                <div key={i} className="flex flex-wrap justify-center gap-1.5">
                  {row.map((tile) => (
                    <PhonemeKey
                      key={tile}
                      tile={tile}
                      status={keyStatus[tile]}
                      onClick={() => handleKey(tile)}
                      disabled={finished}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => handleKey("DEL")}
            disabled={finished}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            DEL
          </button>
          <button
            type="button"
            onClick={() => handleKey("ENTER")}
            disabled={finished}
            className="rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            ENTER
          </button>
        </div>
      </div>

      {finished && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">The word was:</p>
          <p className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">{word.display}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {target.map((p) => `/${p}/`).join("  ")} → {word.display}
          </p>
        </div>
      )}
    </div>
  );
}
