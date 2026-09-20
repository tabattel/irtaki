-- CreateEnum
CREATE TYPE "GoalAction" AS ENUM ('read', 'listen', 'recite', 'memorize', 'revise', 'tajwid', 'tadabbur', 'talkin', 'tathbit');

-- CreateEnum
CREATE TYPE "ProgressUnit" AS ENUM ('quran', 'surah', 'ayah', 'page', 'juz', 'hizb', 'nisf', 'roboa', 'thomone');

-- CreateEnum
CREATE TYPE "FrequencyPeriod" AS ENUM ('day', 'week', 'month');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled', 'archived');

-- CreateEnum
CREATE TYPE "GoalTargetScope" AS ENUM ('quran', 'surah', 'juz', 'hizb', 'page', 'page_range', 'ayah', 'ayah_range');

-- CreateEnum
CREATE TYPE "ActivityResultStatus" AS ENUM ('completed', 'partial', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childProfileId" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "action" "GoalAction" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" "ProgressUnit" NOT NULL,
    "frequencyCount" INTEGER NOT NULL,
    "frequencyPeriod" "FrequencyPeriod" NOT NULL,
    "intervalDays" INTEGER,
    "weekday" "Weekday",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTarget" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "scope" "GoalTargetScope" NOT NULL,
    "startValue" TEXT,
    "endValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "goalId" TEXT,
    "action" "GoalAction" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityResult" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "ActivityResultStatus" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" "ProgressUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressRecord" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "goalId" TEXT,
    "activityId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" "ProgressUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Learner_childProfileId_key" ON "Learner"("childProfileId");

-- CreateIndex
CREATE INDEX "Learner_userId_idx" ON "Learner"("userId");

-- CreateIndex
CREATE INDEX "Goal_learnerId_idx" ON "Goal"("learnerId");

-- CreateIndex
CREATE INDEX "Goal_parentGoalId_idx" ON "Goal"("parentGoalId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_startDate_endDate_idx" ON "Goal"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoalTarget_goalId_key" ON "GoalTarget"("goalId");

-- CreateIndex
CREATE INDEX "GoalTarget_scope_idx" ON "GoalTarget"("scope");

-- CreateIndex
CREATE INDEX "Activity_learnerId_idx" ON "Activity"("learnerId");

-- CreateIndex
CREATE INDEX "Activity_goalId_idx" ON "Activity"("goalId");

-- CreateIndex
CREATE INDEX "Activity_startedAt_idx" ON "Activity"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityResult_activityId_key" ON "ActivityResult"("activityId");

-- CreateIndex
CREATE INDEX "ProgressRecord_learnerId_recordedAt_idx" ON "ProgressRecord"("learnerId", "recordedAt");

-- CreateIndex
CREATE INDEX "ProgressRecord_goalId_recordedAt_idx" ON "ProgressRecord"("goalId", "recordedAt");

-- CreateIndex
CREATE INDEX "ProgressRecord_activityId_idx" ON "ProgressRecord"("activityId");

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTarget" ADD CONSTRAINT "GoalTarget_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityResult" ADD CONSTRAINT "ActivityResult_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressRecord" ADD CONSTRAINT "ProgressRecord_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressRecord" ADD CONSTRAINT "ProgressRecord_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressRecord" ADD CONSTRAINT "ProgressRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
