import { prisma } from "./prisma";

// Writers for the persisted observability events (Assessment 3). These
// rows are what the dashboard and reports aggregate over time.
//
// Recording usage must never break the feature being used, so every
// writer swallows and logs its own errors instead of throwing.

export const ACTIVITY_TYPES = ["WORDLE", "WORD_SEARCH"];
export const ACTIVITY_TYPE_LABEL = { WORDLE: "Wordle", WORD_SEARCH: "Word Search" };

async function safely(label, write) {
  try {
    return await write();
  } catch (err) {
    console.error(`[telemetry] failed to record ${label}:`, err?.message ?? err);
    return null;
  }
}

export function recordGeneration(event) {
  return safely("generation", () =>
    prisma.generationEvent.create({
      data: {
        activityType: event.activityType,
        source: event.source,
        status: event.status,
        errorMessage: event.errorMessage ?? null,
        activityId: event.activityId ?? null,
        wordListId: event.wordListId ?? null,
        difficulty: event.difficulty ?? null,
        mode: event.mode ?? "preview",
        durationMs: Math.max(0, Math.round(event.durationMs ?? 0)),
        outputBytes: event.outputBytes ?? null,
      },
    })
  );
}

export function recordPageView({ path, durationMs }) {
  return safely("page view", () =>
    prisma.pageView.create({ data: { path, durationMs: Math.round(durationMs) } })
  );
}

// entityType: WORD_LIST | WORD | ACTIVITY; action: CREATE | UPDATE | DELETE
export function recordAudit({ entityType, action, entityId, label, activityType }) {
  return safely("audit event", () =>
    prisma.auditEvent.create({
      data: {
        entityType,
        action,
        entityId,
        label: label ?? null,
        activityType: activityType ?? null,
      },
    })
  );
}
