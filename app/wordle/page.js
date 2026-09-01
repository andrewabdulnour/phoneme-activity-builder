"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WordleGame from "@/components/WordleGame";
import { PHONEME_LENGTHS, getWordsByLength, getWord } from "@/lib/phonemeData";
import { generateWordleHtml } from "@/lib/generateWordleHtml";
import { downloadHtmlFile } from "@/lib/download";
import { api } from "@/lib/apiClient";

const CORPUS = "__corpus__";

export default function WordleBuilderPage() {
  const [length, setLength] = useState(3);
  const [wordName, setWordName] = useState(getWordsByLength(3)[0].word);
  const [teacherNote, setTeacherNote] = useState("");

  // Optional: pull the word pool from a saved database word list instead
  // of the fixed HCE corpus (Assessment 2 integration).
  const [source, setSource] = useState(CORPUS);
  const [lists, setLists] = useState([]);

  useEffect(() => {
    api
      .get("/api/word-lists")
      .then(({ wordLists }) => setLists(wordLists))
      .catch(() => setLists([]));
  }, []);

  const activeList = lists.find((l) => l.id === source) ?? null;

  const wordOptions = useMemo(() => {
    if (!activeList) return getWordsByLength(length);
    const atLength = activeList.words.filter((w) => w.phonemes.length === length);
    return (atLength.length ? atLength : activeList.words).map((w) => ({
      word: w.text,
      display: w.display,
      phonemes: w.phonemes,
    }));
  }, [activeList, length]);

  const word =
    wordOptions.find((w) => w.word === wordName) ?? wordOptions[0] ?? getWord(length, wordName);

  function handleLengthChange(nextLength) {
    setLength(nextLength);
    const next = activeList
      ? (activeList.words.filter((w) => w.phonemes.length === nextLength)[0] ??
          activeList.words[0])
      : null;
    setWordName(next ? next.text : getWordsByLength(nextLength)[0].word);
  }

  function handleSourceChange(next) {
    setSource(next);
    const list = lists.find((l) => l.id === next);
    if (list) {
      const first =
        list.words.filter((w) => w.phonemes.length === length)[0] ?? list.words[0];
      setWordName(first ? first.text : "");
    } else {
      setWordName(getWordsByLength(length)[0].word);
    }
  }

  function handleGenerate() {
    const html = generateWordleHtml({ word, length: word.phonemes.length, teacherNote });
    downloadHtmlFile(`phoneme-wordle-${word.word}.html`, html);
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Build a Wordle activity</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Choose a phoneme length (the difficulty) and a target word, preview the phoneme Wordle, then
        generate a downloadable version. Words come from the fixed HCE corpus, or from a{" "}
        <Link href="/word-lists" className="text-indigo-600 hover:underline dark:text-indigo-400">
          saved word list
        </Link>
        . To save reusable configurations, use the{" "}
        <Link href="/activities" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Activities
        </Link>{" "}
        page.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Word source</span>
            <select
              value={source}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value={CORPUS}>Fixed HCE corpus (90 words)</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.wordCount} words)
                </option>
              ))}
            </select>
          </label>

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
              value={word?.word ?? ""}
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
              {wordOptions.length} words available
              {activeList ? ` from "${activeList.name}"` : " from the fixed HCE corpus"}.
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
            disabled={!word}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Generate .html file
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downloads a single, self-contained HTML page you can open in any browser or share with
            students.
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          {word ? (
            <WordleGame key={`${source}-${word.word}-${word.phonemes.length}`} word={word} length={word.phonemes.length} />
          ) : (
            <p className="text-sm text-slate-500">This word list has no words yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
