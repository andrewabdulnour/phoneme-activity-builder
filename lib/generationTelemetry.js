// Browser helper for the Wordle / Word Search builder pages: builds the
// activity file, measures how long that took, reports the attempt
// (success or failure) to /api/telemetry/generation, and returns the
// HTML — or throws, so the page can show an error.

export function generateWithTelemetry({ activityType, wordListId, difficulty, build }) {
  const startedAt = performance.now();
  let html;
  let error;
  try {
    html = build();
    if (!html) throw new Error("the generator returned an empty file");
  } catch (err) {
    error = err;
  }

  const payload = {
    activityType,
    status: error ? "FAILED" : "SUCCESS",
    errorMessage: error ? String(error.message ?? error).slice(0, 500) : null,
    wordListId: wordListId ?? null,
    difficulty: difficulty ?? null,
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    outputBytes: html ? new Blob([html]).size : null,
  };
  fetch("/api/telemetry/generation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});

  if (error) throw error;
  return html;
}
