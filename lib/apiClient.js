// Thin browser-side wrapper around fetch for the JSON API. Throws an
// Error whose `.message` is the server's error text and whose `.details`
// carries any field-level validation errors, so components can show a
// useful message without each re-implementing error parsing.

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(payload?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = payload?.details;
    throw err;
  }
  return payload;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
};

// Format an API error (with optional field details) into a single
// human-readable string for an inline alert.
export function describeError(err) {
  if (!err) return "Something went wrong.";
  if (Array.isArray(err.details) && err.details.length) {
    return `${err.message}: ${err.details.map((d) => `${d.path} — ${d.message}`).join("; ")}`;
  }
  return err.message;
}
