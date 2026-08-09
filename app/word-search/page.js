"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PHONEME_LENGTHS, getWordSearchList } from "@/lib/phonemeData";
import { generateWordSearchHtml } from "@/lib/generateWordSearchHtml";
import { downloadHtmlFile } from "@/lib/download";

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

const SIZE_OPTIONS = [8, 10, 12];

export default function WordSearchBuilderPage() {
  const [length, setLength] = useState(3);
  const [size, setSize] = useState(10);
  const [teacherNote, setTeacherNote] = useState("");

  const wordList = getWordSearchList(length);

  function handleGenerate() {
    const html = generateWordSearchHtml({ wordList, size, teacherNote, length });
    downloadHtmlFile(`phoneme-word-search-${length}phoneme.html`, html);
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Build a Word Search</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Choose a phoneme length and grid size. Each grid cell holds one phoneme (not one English
        letter) — the fixed 5-word list for this stage is drawn from the unit&apos;s HCE phoneme
        corpus.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Word phoneme length
            </span>
            <select
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {Object.entries(PHONEME_LENGTHS).map(([len, d]) => (
                <option key={len} value={len}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Grid size</span>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} × {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Note for students (optional)
            </span>
            <input
              type="text"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="e.g. Circle each word you find"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Word list: {wordList.map((w) => w.display).join(", ")}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Generate .html file
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downloads a single, self-contained HTML page with a puzzle baked in — no server needed.
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <WordSearchGame key={`${length}-${size}`} wordList={wordList} size={size} />
        </div>
      </div>
    </div>
  );
}
