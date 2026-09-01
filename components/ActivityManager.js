"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, describeError } from "@/lib/apiClient";

const CARD =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const BTN_PRIMARY =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

function Alert({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {children}
    </p>
  );
}

const TYPE_LABEL = { WORDLE: "Wordle", WORD_SEARCH: "Word Search" };

export default function ActivityManager() {
  const [activities, setActivities] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "WORDLE",
    wordListId: "",
    difficulty: 3,
    maxGuesses: 7,
    prefillFirst: true,
    gridSize: 10,
    targetWordId: "",
    teacherNote: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [a, l] = await Promise.all([
        api.get("/api/activities"),
        api.get("/api/word-lists"),
      ]);
      setActivities(a.activities);
      setLists(l.wordLists);
      setForm((f) => ({ ...f, wordListId: f.wordListId || l.wordLists[0]?.id || "" }));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const selectedList = useMemo(
    () => lists.find((l) => l.id === form.wordListId) ?? null,
    [lists, form.wordListId]
  );

  async function createActivity(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        wordListId: form.wordListId,
        difficulty: Number(form.difficulty),
        teacherNote: form.teacherNote.trim() || null,
      };
      if (form.type === "WORDLE") {
        payload.maxGuesses = Number(form.maxGuesses);
        payload.prefillFirst = form.prefillFirst;
        if (form.targetWordId) payload.targetWordId = form.targetWordId;
      } else {
        payload.gridSize = Number(form.gridSize);
      }
      await api.post("/api/activities", payload);
      setForm((f) => ({ ...f, name: "", teacherNote: "", targetWordId: "" }));
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, name) {
    if (!confirm(`Delete activity "${name}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/activities/${id}`);
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading activities…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Alert>{error}</Alert>

      <form className={`${CARD} flex flex-col gap-4`} onSubmit={createActivity}>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          New activity configuration
        </h2>

        {lists.length === 0 ? (
          <p className="text-sm text-slate-500">
            Create a word list first on the{" "}
            <a href="/word-lists" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Word Lists
            </a>{" "}
            page.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Name</span>
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Week 3 — TH focus"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Activity type</span>
                <select className={INPUT} value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="WORDLE">Wordle</option>
                  <option value="WORD_SEARCH">Word Search</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Word list</span>
                <select
                  className={INPUT}
                  value={form.wordListId}
                  onChange={(e) => set("wordListId", e.target.value)}
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.wordCount} words)
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Difficulty (phoneme length)
                </span>
                <select
                  className={INPUT}
                  value={form.difficulty}
                  onChange={(e) => set("difficulty", e.target.value)}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} phonemes
                    </option>
                  ))}
                </select>
              </label>

              {form.type === "WORDLE" ? (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Max guesses</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={INPUT}
                      value={form.maxGuesses}
                      onChange={(e) => set("maxGuesses", e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Target word (optional)
                    </span>
                    <select
                      className={INPUT}
                      value={form.targetWordId}
                      onChange={(e) => set("targetWordId", e.target.value)}
                    >
                      <option value="">Auto (first word matching difficulty)</option>
                      {(selectedList?.words ?? []).map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.display} — {w.phonemes.map((p) => `/${p}/`).join(" ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.prefillFirst}
                      onChange={(e) => set("prefillFirst", e.target.checked)}
                    />
                    <span className="text-slate-700 dark:text-slate-200">
                      Pre-fill the first phoneme as a scaffold
                    </span>
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Grid size</span>
                  <select
                    className={INPUT}
                    value={form.gridSize}
                    onChange={(e) => set("gridSize", e.target.value)}
                  >
                    {[8, 10, 12, 14].map((n) => (
                      <option key={n} value={n}>
                        {n} × {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Note for students (optional)
                </span>
                <input
                  className={INPUT}
                  value={form.teacherNote}
                  onChange={(e) => set("teacherNote", e.target.value)}
                  placeholder="Shown in the generated file footer"
                />
              </label>
            </div>

            <button type="submit" className={BTN_PRIMARY} disabled={busy || !form.name.trim()}>
              Save activity
            </button>
          </>
        )}
      </form>

      <div className={CARD}>
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Saved activities ({activities.length})
        </h2>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  <span className="mr-2 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {TYPE_LABEL[a.type] ?? a.type}
                  </span>
                  {a.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.wordListName} · difficulty {a.difficulty}
                  {a.type === "WORDLE"
                    ? ` · ${a.maxGuesses} guesses`
                    : ` · ${a.gridSize}×${a.gridSize} grid`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/activities/${a.id}/generate`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Preview
                </a>
                <a
                  href={`/api/activities/${a.id}/generate?download=1`}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Download .html
                </a>
                <button
                  type="button"
                  onClick={() => remove(a.id, a.name)}
                  disabled={busy}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="py-3 text-sm text-slate-500">No saved activities yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
