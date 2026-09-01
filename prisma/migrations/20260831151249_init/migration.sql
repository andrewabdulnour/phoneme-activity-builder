-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phonemeLength" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordListId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayText" TEXT NOT NULL,
    "phonemeCount" INTEGER NOT NULL DEFAULT 0,
    "hint" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Phoneme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "Phoneme_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityConfig" (
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
    CONSTRAINT "ActivityConfig_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WordList_name_idx" ON "WordList"("name");

-- CreateIndex
CREATE INDEX "Word_wordListId_idx" ON "Word"("wordListId");

-- CreateIndex
CREATE INDEX "Phoneme_wordId_idx" ON "Phoneme"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_wordId_position_key" ON "Phoneme"("wordId", "position");

-- CreateIndex
CREATE INDEX "ActivityConfig_wordListId_idx" ON "ActivityConfig"("wordListId");

-- CreateIndex
CREATE INDEX "ActivityConfig_type_idx" ON "ActivityConfig"("type");
