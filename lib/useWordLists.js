"use client";

import { useEffect, useState } from "react";
import { api, describeError } from "./apiClient";

// Loads every saved word list (with words and phonemes) from the API for
// the builder pages. Since Assessment 4 the builders read words only
// from the database — the seed loads the HCE corpus as three word lists
// — so there is no separate hard-coded word source to keep in sync.
export function useWordLists() {
  const [state, setState] = useState({ lists: [], loading: true, error: "" });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/word-lists")
      .then(({ wordLists }) => {
        if (!cancelled) setState({ lists: wordLists, loading: false, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ lists: [], loading: false, error: describeError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// The list a builder opens on: the first list whose dominant phoneme
// length matches, else the first list with any words.
export function defaultListFor(lists, length) {
  return (
    lists.find((l) => l.phonemeLength === length && l.wordCount > 0) ??
    lists.find((l) => l.wordCount > 0) ??
    lists[0] ??
    null
  );
}
