"use client";

import { useState } from "react";
import Link from "next/link";
import WordleGame from "@/components/WordleGame";
import { Alert, BTN_PRIMARY, CARD, FIELD_LABEL, INPUT, LINK } from "@/components/forms";
import { generateWordleHtml } from "@/lib/generateWordleHtml";
import { downloadHtmlFile } from "@/lib/download";
import { generateWithTelemetry } from "@/lib/generationTelemetry";
import { defaultListFor, useWordLists } from "@/lib/useWordLists";
import {
  DIFFICULTY_LEVELS,
  slugify,
  toGeneratorWord,
  wordleDefaults,
  wordsAtLength,
} from "@/lib/activityRules";

export default function WordleBuilderPage() {
  const { lists, loading, error } = useWordLists();
  const [length, setLength] = useState(3);
  const [listId, setListId] = useState("");
  const [wordId, setWordId] = useState("");
  const [scaffold, setScaffold] = useState(() => wordleDefaults(3));
  const [teacherNote, setTeacherNote] = useState("");
  const [generateError, setGenerateError] = useState("");

  // Everything below is derived from the loaded lists plus the teacher's
  // choices, so there is no second copy of the words to keep in sync.
  const list = lists.find((l) => l.id === listId) ?? defaultListFor(lists, length);
  const wordOptions = list ? wordsAtLength(list.words, length) : [];
  const target = wordOptions.find((w) => w.id === wordId) ?? wordOptions[0] ?? null;
  const word = target ? toGeneratorWord(target) : null;

  function handleLengthChange(next) {
    setLength(next);
    setWordId("");
    setScaffold(wordleDefaults(next));
  }

  function handleListChange(next) {
    setListId(next);
    setWordId("");
  }

  function handleGenerate() {
    setGenerateError("");
    try {
      const html = generateWithTelemetry({
        activityType: "WORDLE",
        wordListId: list?.id,
        difficulty: word.phonemes.length,
        build: () =>
          generateWordleHtml({
            word,
            length: word.phonemes.length,
            teacherNote,
            maxGuesses: scaffold.maxGuesses,
            prefillFirst: scaffold.prefillFirst,
          }),
      });
      downloadHtmlFile(`phoneme-wordle-${slugify(word.word)}.html`, html);
    } catch (err) {
      setGenerateError(`Could not generate the Wordle file: ${err.message}`);
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Build a Wordle activity</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Choose a word list, a phoneme length (the difficulty) and a target word, preview the
        phoneme Wordle, then generate a downloadable version. Add your own words on the{" "}
        <Link href="/word-lists" className={LINK}>
          Word Lists
        </Link>{" "}
        page, or save reusable configurations on the{" "}
        <Link href="/activities" className={LINK}>
          Activities
        </Link>{" "}
        page.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
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

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Difficulty (phoneme length)</span>
            <select
              value={length}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className={INPUT}
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d.length} value={d.length}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Target word</span>
            <select
              value={target?.id ?? ""}
              onChange={(e) => setWordId(e.target.value)}
              disabled={!wordOptions.length}
              className={INPUT}
            >
              {wordOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.display} — {w.phonemes.map((p) => `/${p}/`).join(" ")}
                </option>
              ))}
            </select>
            {list && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {wordOptions.length} words available from &quot;{list.name}&quot;.
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>Guesses</span>
              <input
                type="number"
                min={1}
                max={12}
                value={scaffold.maxGuesses}
                onChange={(e) =>
                  setScaffold((s) => ({
                    ...s,
                    maxGuesses: Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                className={INPUT}
              />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={scaffold.prefillFirst}
                onChange={(e) => setScaffold((s) => ({ ...s, prefillFirst: e.target.checked }))}
              />
              Pre-fill first phoneme
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Note for students (optional)</span>
            <input
              type="text"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder="e.g. Focus on the TH sound today"
              className={INPUT}
            />
          </label>

          <button type="button" onClick={handleGenerate} disabled={!word} className={`mt-2 ${BTN_PRIMARY}`}>
            Generate .html file
          </button>
          <Alert>{generateError}</Alert>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Downloads a single, self-contained HTML page you can open in any browser or share with
            students.
          </p>
        </aside>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          {word ? (
            <WordleGame
              key={`${target.id}-${scaffold.maxGuesses}-${scaffold.prefillFirst}`}
              word={word}
              maxGuesses={scaffold.maxGuesses}
              prefillFirst={scaffold.prefillFirst}
            />
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {loading ? "Loading words…" : "This word list has no words yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
