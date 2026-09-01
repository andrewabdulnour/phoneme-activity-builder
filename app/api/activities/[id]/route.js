import {
  badRequest,
  jsonOk,
  notFound,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { activityUpdateSchema, validate } from "@/lib/validation";
import { deleteActivity, getActivity, updateActivity } from "@/lib/activities";

export const dynamic = "force-dynamic";

// GET /api/activities/:id
export const GET = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const activity = await getActivity(id);
  if (!activity) return notFound("Activity not found");
  return jsonOk({ activity });
});

// PATCH /api/activities/:id
export const PATCH = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(activityUpdateSchema, body);
  if (errors) return badRequest("Validation failed", errors);
  if (Object.keys(data).length === 0) {
    return badRequest("Provide at least one field to update");
  }

  const existing = await getActivity(id);
  if (!existing) return notFound("Activity not found");

  const result = await updateActivity(id, data);
  if (result.error) return badRequest(result.error);
  return jsonOk({ activity: result.activity });
});

export const PUT = PATCH;

// DELETE /api/activities/:id
export const DELETE = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  const existing = await getActivity(id);
  if (!existing) return notFound("Activity not found");
  await deleteActivity(id);
  return jsonOk({ deleted: true, id });
});
