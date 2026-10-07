-- CreateTable
CREATE TABLE "GenerationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "activityId" TEXT,
    "wordListId" TEXT,
    "difficulty" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'preview',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "outputBytes" INTEGER,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT,
    "activityType" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "wordListId" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "maxGuesses" INTEGER,
    "prefillFirst" BOOLEAN NOT NULL DEFAULT false,
    "targetWordId" TEXT,
    "gridSize" INTEGER,
    "hint" TEXT,
    "teacherNote" TEXT,
    "outputSettings" JSONB,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityConfig_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityConfig_targetWordId_fkey" FOREIGN KEY ("targetWordId") REFERENCES "Word" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityConfig" ("createdAt", "difficulty", "gridSize", "hint", "id", "maxGuesses", "name", "outputSettings", "prefillFirst", "targetWordId", "teacherNote", "type", "updatedAt", "wordListId") SELECT "createdAt", "difficulty", "gridSize", "hint", "id", "maxGuesses", "name", "outputSettings", "prefillFirst", "targetWordId", "teacherNote", "type", "updatedAt", "wordListId" FROM "ActivityConfig";
DROP TABLE "ActivityConfig";
ALTER TABLE "new_ActivityConfig" RENAME TO "ActivityConfig";
CREATE INDEX "ActivityConfig_wordListId_idx" ON "ActivityConfig"("wordListId");
CREATE INDEX "ActivityConfig_type_idx" ON "ActivityConfig"("type");
CREATE INDEX "ActivityConfig_targetWordId_idx" ON "ActivityConfig"("targetWordId");
CREATE TABLE "new_WordList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phonemeLength" INTEGER NOT NULL DEFAULT 3,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WordList" ("createdAt", "description", "id", "name", "phonemeLength", "updatedAt") SELECT "createdAt", "description", "id", "name", "phonemeLength", "updatedAt" FROM "WordList";
DROP TABLE "WordList";
ALTER TABLE "new_WordList" RENAME TO "WordList";
CREATE INDEX "WordList_name_idx" ON "WordList"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GenerationEvent_createdAt_idx" ON "GenerationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationEvent_status_idx" ON "GenerationEvent"("status");

-- CreateIndex
CREATE INDEX "GenerationEvent_activityType_idx" ON "GenerationEvent"("activityType");

-- CreateIndex
CREATE INDEX "GenerationEvent_wordListId_idx" ON "GenerationEvent"("wordListId");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_action_idx" ON "AuditEvent"("entityType", "action");
