-- CreateEnum
CREATE TYPE "RecitationMode" AS ENUM ('tarteel1', 'tarteel2');

-- CreateEnum
CREATE TYPE "RecitationStatus" AS ENUM ('recording', 'uploaded', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "RecitationGrade" AS ENUM ('A', 'B', 'C');

-- CreateTable
CREATE TABLE "Recitation" (
    "id" TEXT NOT NULL,
    "clientSessionId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "activityId" TEXT,
    "mode" "RecitationMode" NOT NULL,
    "riwayaId" INTEGER NOT NULL,
    "tariqId" INTEGER,
    "wajhId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "sampleRate" INTEGER NOT NULL DEFAULT 16000,
    "status" "RecitationStatus" NOT NULL DEFAULT 'recording',
    "originalPath" TEXT,
    "originalFormat" TEXT,
    "originalBytes" INTEGER,
    "originalSha256" TEXT,
    "consentTraining" BOOLEAN NOT NULL DEFAULT false,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecitationSegment" (
    "id" TEXT NOT NULL,
    "tid" SERIAL NOT NULL,
    "recitationId" TEXT NOT NULL,
    "ayahId" INTEGER NOT NULL,
    "repetition" INTEGER NOT NULL DEFAULT 1,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "filePath" TEXT,
    "transcriptRaw" TEXT,
    "wer" DOUBLE PRECISION,
    "exactMatch" BOOLEAN,
    "grade" "RecitationGrade",
    "substitutions" INTEGER,
    "deletions" INTEGER,
    "insertions" INTEGER,
    "referenceWordCount" INTEGER,
    "hypothesisWordCount" INTEGER,
    "normalizationVersion" TEXT,
    "werAlgorithmVersion" TEXT,
    "engineId" TEXT,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecitationSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recitation_clientSessionId_key" ON "Recitation"("clientSessionId");

-- CreateIndex
CREATE INDEX "Recitation_learnerId_startedAt_idx" ON "Recitation"("learnerId", "startedAt");

-- CreateIndex
CREATE INDEX "Recitation_activityId_idx" ON "Recitation"("activityId");

-- CreateIndex
CREATE INDEX "Recitation_riwayaId_tariqId_wajhId_idx" ON "Recitation"("riwayaId", "tariqId", "wajhId");

-- CreateIndex
CREATE INDEX "Recitation_status_idx" ON "Recitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecitationSegment_tid_key" ON "RecitationSegment"("tid");

-- CreateIndex
CREATE INDEX "RecitationSegment_ayahId_idx" ON "RecitationSegment"("ayahId");

-- CreateIndex
CREATE INDEX "RecitationSegment_grade_idx" ON "RecitationSegment"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "RecitationSegment_recitationId_ayahId_repetition_key" ON "RecitationSegment"("recitationId", "ayahId", "repetition");

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_riwayaId_fkey" FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_tariqId_fkey" FOREIGN KEY ("tariqId") REFERENCES "Tariq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_wajhId_fkey" FOREIGN KEY ("wajhId") REFERENCES "Wajh"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecitationSegment" ADD CONSTRAINT "RecitationSegment_recitationId_fkey" FOREIGN KEY ("recitationId") REFERENCES "Recitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecitationSegment" ADD CONSTRAINT "RecitationSegment_ayahId_fkey" FOREIGN KEY ("ayahId") REFERENCES "Ayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
