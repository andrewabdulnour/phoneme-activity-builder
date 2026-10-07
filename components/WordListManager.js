"use client";

import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "@/lib/apiClient";
import PhonemePicker from "./PhonemePicker";

const CARD =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const BTN_PRIMARY =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";
const BTN_GHOST =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800";

function Alert({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {children}
    </p>
  );
}

function WordForm({ initial, onSubmit, onCancel, busy }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [phonemes, setPhonemes] = useState(initial?.phonemes ?? []);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!text.trim()) return setError("Enter the English spelling.");
    if (phonemes.length === 0) return setError("Add at least one phoneme.");
    try {
      await onSubmit({ text: text.trim(), hint: hint.trim() || null, phonemes });
      if (!initial) {
        setText("");
        setHint("");
        setPhonemes([]);
      }
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">English spelling</span>
          <input
            className={INPUT}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. chin"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Hint (optional)</span>
          <input
            className={INPUT}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. CH sound"
          />
        </label>
      </div>
      <div className="text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Phonemes (in order)</span>
        <div className="mt-1">
          <PhonemePicker value={phonemes} onChange={setPhonemes} disabled={busy} />
        </div>
      </div>
      <Alert>{error}</Alert>
      <div className="flex gap-2">
        <button type="submit" className={BTN_PRIMARY} disabled={busy}>
          {initial ? "Save changes" : "Add word"}
        </button>
        {onCancel && (
          <button type="button" className={BTN_GHOST} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function WordListManager() {
  const [lists, setLists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingWordId, setEditingWordId] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");

  const refresh = useCallback(async (keepId) => {
    setError("");
    try {
      const { wordLists } = await api.get("/api/word-lists");
      setLists(wordLists);
      setSelectedId((prev) => {
        const target = keepId ?? prev;
        return wordLists.some((l) => l.id === target) ? target : wordLists[0]?.id ?? null;
      });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount. `refresh` is async — every setState call inside
  // it runs after the fetch resolves, not synchronously in the effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const selected = lists.find((l) => l.id === selectedId) ?? null;

  async function run(fn, keepId) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh(keepId);
    } catch (err) {
      setError(describeError(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function createList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = await api
      .post("/api/word-lists", { name: newListName.trim(), description: newListDesc.trim() || null })
      .catch((err) => {
        setError(describeError(err));
        return null;
      });
    if (created) {
      setNewListName("");
      setNewListDesc("");
      await refresh(created.wordList.id);
    }
  }

  if (loading) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading word lists…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Left: list of word lists + create */}
        <div className="flex flex-col gap-4">
          <div className={CARD}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Word lists ({lists.length})
            </h2>
            <ul className="flex flex-col gap-1">
              {lists.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(l.id);
                      setEditingWordId(null);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      l.id === selectedId
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="font-medium">{l.name}</span>
                    <span className="block text-xs opacity-80">
                      {l.wordCount} words · {l.activityCount} activities
                      {l.wordCount === 0 && " · ⚠ empty"}
                    </span>
                  </button>
                </li>
              ))}
              {lists.length === 0 && (
                <li className="text-sm text-slate-600 dark:text-slate-400">No word lists yet — create one below.</li>
              )}
            </ul>
          </div>

          <form className={`${CARD} flex flex-col gap-3`} onSubmit={createList}>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              New word list
            </h2>
            <input
              className={INPUT}
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <input
              className={INPUT}
              placeholder="Description (optional)"
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
            />
            <button type="submit" className={BTN_PRIMARY} disabled={busy || !newListName.trim()}>
              Create list
            </button>
          </form>
        </div>

        {/* Right: selected list detail */}
        <div className="flex flex-col gap-4">
          {!selected && <p className="text-sm text-slate-600 dark:text-slate-400">Select or create a word list.</p>}

          {selected && (
            <>
              <div className={`${CARD} flex flex-wrap items-start justify-between gap-3`}>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selected.name}
                  </h2>
                  {selected.description && (
                    <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                      {selected.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selected.wordCount} words · dominant length {selected.phonemeLength}
                  </p>
                  {selected.wordCount === 0 && (
                    <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                      <span aria-hidden="true">⚠ </span>
                      This list is empty. Activities built from it cannot be generated until you add words.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950 dark:text-red-400"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Delete "${selected.name}" and all its words?`)) {
                      run(() => api.delete(`/api/word-lists/${selected.id}`)).catch(() => {});
                    }
                  }}
                >
                  Delete list
                </button>
              </div>

              <div className={CARD}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Words
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-400">
                        <th className="py-2 pr-3">Word</th>
                        <th className="py-2 pr-3">Phonemes</th>
                        <th className="py-2 pr-3">Hint</th>
                        <th className="py-2">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.words.map((w) => (
                        <tr
                          key={w.id}
                          className="border-b border-slate-100 align-top dark:border-slate-800"
                        >
                          {editingWordId === w.id ? (
                            <td colSpan={4} className="py-3">
                              <WordForm
                                initial={w}
                                busy={busy}
                                onCancel={() => setEditingWordId(null)}
                                onSubmit={async (data) => {
                                  await run(
                                    () => api.patch(`/api/words/${w.id}`, data),
                                    selected.id
                                  );
                                  setEditingWordId(null);
                                }}
                              />
                            </td>
                          ) : (
                            <>
                              <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">
                                {w.display}
                              </td>
                              <td className="py-2 pr-3 tracking-wide text-slate-600 dark:text-slate-300">
                                {w.phonemes.map((p) => `/${p}/`).join(" ")}
                              </td>
                              <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">{w.hint || "—"}</td>
                              <td className="py-2 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  className="mr-2 text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
                                  disabled={busy}
                                  onClick={() => setEditingWordId(w.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                                  disabled={busy}
                                  onClick={() => {
                                    if (confirm(`Delete "${w.display}"?`)) {
                                      run(
                                        () => api.delete(`/api/words/${w.id}`),
                                        selected.id
                                      ).catch(() => {});
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {selected.words.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-3 text-slate-600 dark:text-slate-400">
                            No words yet — add one below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={CARD}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Add a word
                </h3>
                <WordForm
                  busy={busy}
                  onSubmit={(data) =>
                    run(
                      () => api.post(`/api/word-lists/${selected.id}/words`, data),
                      selected.id
                    )
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
