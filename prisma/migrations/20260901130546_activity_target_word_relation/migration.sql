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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
