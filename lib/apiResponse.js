// Small helpers for consistent JSON API responses across all route
// handlers. Every error body has the shape { error: string, details? }.

import { normaliseRoute, recordRequest } from "./metrics";

export function jsonOk(data, init = {}) {
  return Response.json(data, { status: 200, ...init });
}

export function jsonCreated(data) {
  return Response.json(data, { status: 201 });
}

export function jsonError(status, error, details) {
  const body = { error };
  if (details !== undefined) body.details = details;
  return Response.json(body, { status });
}

export const badRequest = (error, details) => jsonError(400, error, details);
export const notFound = (error = "Not found") => jsonError(404, error);
export const conflict = (error) => jsonError(409, error);
export const serverError = (error = "Internal server error") => jsonError(500, error);

// Wraps a route handler so any unexpected throw becomes a 500 instead of
// leaking a stack trace, and database rule violations become clean 4xx
// responses (see dbErrorResponse). Every request is also timed and reported to the
// in-memory request metrics (GET /api/metrics).
export function withErrorHandling(handler) {
  return async (...args) => {
    const startedAt = performance.now();
    const response = await runSafely(handler, args);
    const request = args[0];
    if (request?.url) {
      recordRequest({
        method: request.method,
        route: normaliseRoute(new URL(request.url).pathname),
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
    return response;
  };
}

async function runSafely(handler, args) {
  try {
    return await handler(...args);
  } catch (err) {
    const response = dbErrorResponse(err);
    if (response) return response;
    console.error("[api] unhandled error:", err);
    return serverError();
  }
}

// The API validates input before writing, but the database has the final
// say (unique keys, foreign keys, CHECK constraints). Map those Prisma /
// PostgreSQL errors onto the HTTP status a client can act on.
function dbErrorResponse(err) {
  switch (err?.code) {
    case "P2025":
      return notFound("Record not found");
    case "P2002": {
      const fields = [].concat(err.meta?.target ?? []).join(", ");
      return conflict(
        fields
          ? `A record with the same ${fields} already exists`
          : "A record with those unique values already exists"
      );
    }
    case "P2003":
      return badRequest("A referenced record does not exist");
    case "P2004":
      return badRequest("The change breaks a database rule", err.meta?.database_error);
  }
  // CHECK constraint violations can surface without a Prisma code.
  if (/violates check constraint/i.test(err?.message ?? "")) {
    return badRequest("The change breaks a database rule");
  }
  return null;
}

// Parse a JSON request body, returning { data } or { response } where
// `response` is a ready-to-return 400 for malformed JSON.
export async function readJson(request) {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return { response: badRequest("Request body must be valid JSON") };
  }
}
