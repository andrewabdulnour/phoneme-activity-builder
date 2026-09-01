// Small helpers for consistent JSON API responses across all route
// handlers. Every error body has the shape { error: string, details? }.

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
// leaking a stack trace, and Prisma "record not found" errors (P2025)
// become a clean 404.
export function withErrorHandling(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err?.code === "P2025") return notFound("Record not found");
      if (err?.code === "P2002") {
        return conflict("A record with those unique values already exists");
      }
      console.error("[api] unhandled error:", err);
      return serverError();
    }
  };
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
