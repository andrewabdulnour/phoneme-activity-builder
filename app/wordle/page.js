"use client";

import { useState } from "react";
import WordleGame from "@/components/WordleGame";
import { PHONEME_LENGTHS, getWordsByLength, getWord } from "@/lib/phonemeData";
import { generateWordleHtml } from "@/lib/generateWordleHtml";
import { downloadHtmlFile } from "@/lib/download";

export default function WordleBuilderPage() {
  const [length, setLength] = useState(3);
  const [wordName, setWordName] = useState(getWordsByLength(3)[0].word);
  const [teacherNote, setTeacherNote] = useState("");

  const wordOptions = getWordsByLength(length);
  const word = getWord(length, wordName);

  function handleLengthChange(nextLength) {
    setLength(nextLength);
    setWordName(getWordsByLength(nextLength)[0].word);
  }

  function handleGenerate() {
    const html = generateWordleHtml({ word, length, teacherNote });
    downloadHtmlFile(`phoneme-wordle-${word.word}.html`, html);
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Build a Wordle activity</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Choose a phoneme length (the difficulty) and a target word from the fixed HCE phoneme word
        list, then preview the phoneme Wordle below before generating a downloadable version.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Difficulty (phoneme length)
            </span>
            <select
              value={length}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {Object.entries(PHONEME_LENGTHS).map(([len, d]) => (
                <option key={len} value={len}>
                  {d.label} — {d.maxGuesses} guesses
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Target word</span>
            <select
              value={wordName}
              onChange={(e) => setWordName(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {wordOptions.map((w) => (
                <option key={w.word} value={w.word}>
                  {w.display} — {w.phonemes.map((p) => `/${p}/`).join(" ")}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {wordOptions.length} words available at this length, from the unit&apos;s fixed HCE
              phoneme corpus.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Note for students (optional)
            </span>
            <input
              type="text"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="e.g. Focus on the TH sound today"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Generate .html file
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downloads a single, self-contained HTML page you can open in any browser or share with
            students.
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <WordleGame key={`${word.word}-${length}`} word={word} length={length} />
        </div>
      </div>
    </div>
  );
}
