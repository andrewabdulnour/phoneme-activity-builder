-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('WORDLE', 'WORD_SEARCH');

-- CreateEnum
CREATE TYPE "GenerationSource" AS ENUM ('SAVED_ACTIVITY', 'BUILDER');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('preview', 'download');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('WORD_LIST', 'WORD', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phonemeLength" INTEGER NOT NULL DEFAULT 3,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "wordListId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayText" TEXT NOT NULL,
    "phonemeCount" INTEGER NOT NULL DEFAULT 0,
    "hint" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phoneme" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Phoneme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationEvent" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "source" "GenerationSource" NOT NULL,
    "status" "GenerationStatus" NOT NULL,
    "errorMessage" TEXT,
    "activityId" TEXT,
    "wordListId" TEXT,
    "difficulty" INTEGER,
    "mode" "GenerationMode" NOT NULL DEFAULT 'preview',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "outputBytes" INTEGER,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntity" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityId" TEXT NOT NULL,
    "label" TEXT,
    "activityType" "ActivityType",
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordList_name_idx" ON "WordList"("name");

-- CreateIndex
CREATE INDEX "Word_wordListId_idx" ON "Word"("wordListId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_wordListId_text_key" ON "Word"("wordListId", "text");

-- CreateIndex
CREATE INDEX "Phoneme_wordId_idx" ON "Phoneme"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_wordId_position_key" ON "Phoneme"("wordId", "position");

-- CreateIndex
CREATE INDEX "ActivityConfig_wordListId_idx" ON "ActivityConfig"("wordListId");

-- CreateIndex
CREATE INDEX "ActivityConfig_type_idx" ON "ActivityConfig"("type");

-- CreateIndex
CREATE INDEX "ActivityConfig_targetWordId_idx" ON "ActivityConfig"("targetWordId");

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

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phoneme" ADD CONSTRAINT "Phoneme_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityConfig" ADD CONSTRAINT "ActivityConfig_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityConfig" ADD CONSTRAINT "ActivityConfig_targetWordId_fkey" FOREIGN KEY ("targetWordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Database-level integrity rules (hand-written; Prisma's schema language
-- cannot express CHECK constraints). They mirror the ranges in
-- lib/validation.js so invalid rows are rejected even if a write
-- bypasses the API (seed scripts, Prisma Studio, Adminer, a future
-- service). The API still validates first so users get friendly 400s.
-- ---------------------------------------------------------------------

ALTER TABLE "WordList"
  ADD CONSTRAINT "WordList_name_not_blank" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "WordList_phonemeLength_range" CHECK ("phonemeLength" BETWEEN 2 AND 12);

ALTER TABLE "Word"
  ADD CONSTRAINT "Word_text_not_blank" CHECK (length(trim("text")) > 0),
  ADD CONSTRAINT "Word_phonemeCount_range" CHECK ("phonemeCount" BETWEEN 0 AND 12),
  ADD CONSTRAINT "Word_orderIndex_nonnegative" CHECK ("orderIndex" >= 0);

ALTER TABLE "Phoneme"
  ADD CONSTRAINT "Phoneme_symbol_not_blank" CHECK (length(trim("symbol")) > 0),
  ADD CONSTRAINT "Phoneme_position_range" CHECK ("position" BETWEEN 0 AND 11);

ALTER TABLE "ActivityConfig"
  ADD CONSTRAINT "ActivityConfig_name_not_blank" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "ActivityConfig_difficulty_range" CHECK ("difficulty" BETWEEN 2 AND 12),
  ADD CONSTRAINT "ActivityConfig_maxGuesses_range" CHECK ("maxGuesses" IS NULL OR "maxGuesses" BETWEEN 1 AND 12),
  ADD CONSTRAINT "ActivityConfig_gridSize_range" CHECK ("gridSize" IS NULL OR "gridSize" BETWEEN 5 AND 20),
  -- Settings that only make sense for one activity type must be empty
  -- for the other: a Word Search has no guess limit or target word, and
  -- a Wordle has no grid.
  ADD CONSTRAINT "ActivityConfig_type_settings" CHECK (
    ("type" = 'WORDLE' AND "gridSize" IS NULL)
    OR ("type" = 'WORD_SEARCH' AND "maxGuesses" IS NULL AND "targetWordId" IS NULL)
  );

ALTER TABLE "GenerationEvent"
  ADD CONSTRAINT "GenerationEvent_durationMs_nonnegative" CHECK ("durationMs" >= 0),
  ADD CONSTRAINT "GenerationEvent_outputBytes_nonnegative" CHECK ("outputBytes" IS NULL OR "outputBytes" >= 0),
  -- A failed attempt must say why; a successful one has no error.
  ADD CONSTRAINT "GenerationEvent_status_error" CHECK (
    ("status" = 'SUCCESS' AND "errorMessage" IS NULL)
    OR ("status" = 'FAILED' AND "errorMessage" IS NOT NULL)
  );

ALTER TABLE "PageView"
  ADD CONSTRAINT "PageView_durationMs_nonnegative" CHECK ("durationMs" >= 0);
