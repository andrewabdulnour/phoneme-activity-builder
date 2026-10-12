"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import WordPicker from "@/components/WordPicker";
import { Alert, BTN_PRIMARY, CARD, FIELD_LABEL, INPUT, LINK } from "@/components/forms";
import { generateWordSearchHtml } from "@/lib/generateWordSearchHtml";
import { downloadHtmlFile } from "@/lib/download";
import { generateWithTelemetry } from "@/lib/generationTelemetry";
import { defaultListFor, useWordLists } from "@/lib/useWordLists";
import {
  DEFAULT_GRID_SIZE,
  DIFFICULTY_LEVELS,
  GRID_SIZES,
  pickWordSearchWords,
  slugify,
  toGeneratorWord,
} from "@/lib/activityRules";

// The puzzle layout is randomised (Math.random) at render time, so it
// must only ever run in the browser — server-rendering it would bake
// in one random grid while the client immediately computes a
// different one, causing a hydration mismatch.
const WordSearchGame = dynamic(() => import("@/components/WordSearchGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[24rem] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Building puzzle…
    </div>
  ),
});

export default function WordSearchBuilderPage() {
  const { lists, loading, error } = useWordLists();
  const [length, setLength] = useState(3);
  const [size, setSize] = useState(DEFAULT_GRID_SIZE);
  const [listId, setListId] = useState("");
  // null = no explicit choice yet, so the default words for the length are used.
  const [chosenIds, setChosenIds] = useState(null);
  const [teacherNote, setTeacherNote] = useState("");
  const [generateError, setGenerateError] = useState("");

  const list = lists.find((l) => l.id === listId) ?? defaultListFor(lists, length);
  const selectedIds = useMemo(
    () =>
      chosenIds ??
      (list ? pickWordSearchWords(list.words, { length, gridSize: size }).map((w) => w.id) : []),
    [chosenIds, list, length, size]
  );
  // Memoised so unrelated re-renders (e.g. typing a note) keep the same
  // array and the preview grid is not reshuffled.
  const wordList = useMemo(
    () =>
      list
        ? pickWordSearchWords(list.words, { wordIds: selectedIds, gridSize: size }).map(toGeneratorWord)
        : [],
    [list, selectedIds, size]
  );

  function handleListChange(next) {
    setListId(next);
    setChosenIds(null);
  }

  function handleLengthChange(next) {
    setLength(next);
    setChosenIds(null);
  }

  function handleGenerate() {
    setGenerateError("");
    let html;
    try {
      html = generateWithTelemetry({
        activityType: "WORD_SEARCH",
        wordListId: list?.id,
        difficulty: length,
        build: () => generateWordSearchHtml({ wordList, size, teacherNote, length }),
      });
    } catch (err) {
      setGenerateError(`Could not generate the Word Search file: ${err.message}`);
      return;
    }
    downloadHtmlFile(`phoneme-word-search-${slugify(list.name)}.html`, html);
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Build a Word Search</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Choose a word list, tick the words to hide and pick a grid size. Each grid cell holds one
        phoneme (not one English letter). Add your own words on the{" "}
        <Link href="/word-lists" className={LINK}>
          Word Lists
        </Link>{" "}
        page, or save reusable configurations on the{" "}
        <Link href="/activities" className={LINK}>
          Activities
        </Link>{" "}
        page.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className={`${CARD} flex flex-col gap-5`}>
          <Alert>{error && `Could not load word lists: ${error}`}</Alert>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Word list</span>
            <select
              value={list?.id ?? ""}
              onChange={(e) => handleListChange(e.target.value)}
              disabled={loading || !lists.length}
              className={INPUT}
            >
              {loading && <option value="">Loading…</option>}
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.wordCount} words)
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Default length</span>
              <select
                value={length}
                onChange={(e) => handleLengthChange(Number(e.target.value))}
                className={INPUT}
              >
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d.length} value={d.length}>
                    {d.length} phonemes
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Grid size</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} className={INPUT}>
                {GRID_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {list && (
            <WordPicker
              words={list.words}
              selectedIds={selectedIds}
              onChange={setChosenIds}
              maxPhonemes={size}
            />
          )}

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Note for students (optional)</span>
            <input
              type="text"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="e.g. Circle each word you find"
              className={INPUT}
            />
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={wordList.length === 0}
            className={`mt-2 ${BTN_PRIMARY}`}
          >
            Generate .html file
          </button>
          <Alert>{generateError}</Alert>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downloads a single, self-contained HTML page with a puzzle baked in — no server needed.
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          {wordList.length ? (
            <WordSearchGame
              key={`${list.id}-${size}-${selectedIds.join(",")}`}
              wordList={wordList}
              size={size}
            />
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {loading ? "Loading words…" : "Tick at least one word to build a puzzle."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
