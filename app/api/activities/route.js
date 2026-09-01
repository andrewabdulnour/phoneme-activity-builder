import {
  badRequest,
  jsonCreated,
  jsonOk,
  readJson,
  withErrorHandling,
} from "@/lib/apiResponse";
import { activityCreateSchema, validate } from "@/lib/validation";
import { createActivity, listActivities } from "@/lib/activities";

export const dynamic = "force-dynamic";

// GET /api/activities — all saved Wordle / Word Search configurations.
export const GET = withErrorHandling(async () => {
  const activities = await listActivities();
  return jsonOk({ activities });
});

// POST /api/activities — save a new activity configuration for a list.
export const POST = withErrorHandling(async (request) => {
  const { data: body, response } = await readJson(request);
  if (response) return response;

  const { data, errors } = validate(activityCreateSchema, body);
  if (errors) return badRequest("Validation failed", errors);

  const result = await createActivity(data);
  if (result.error) return badRequest(result.error);
  return jsonCreated({ activity: result.activity });
});
