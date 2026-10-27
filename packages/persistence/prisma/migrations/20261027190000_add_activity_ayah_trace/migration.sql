CREATE TYPE "ActivityAyahTraceStatus" AS ENUM (
  'started',
  'completed',
  'partial',
  'failed',
  'skipped'
);

CREATE TABLE "ActivityAyahTrace" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "ayahId" INTEGER NOT NULL,
  "status" "ActivityAyahTraceStatus" NOT NULL DEFAULT 'started',
  "recordedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityAyahTrace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityAyahTrace_activityId_ayahId_key"
  ON "ActivityAyahTrace"("activityId", "ayahId");

CREATE INDEX "ActivityAyahTrace_ayahId_status_idx"
  ON "ActivityAyahTrace"("ayahId", "status");

CREATE INDEX "ActivityAyahTrace_activityId_status_idx"
  ON "ActivityAyahTrace"("activityId", "status");

CREATE INDEX "ActivityAyahTrace_recordedAt_idx"
  ON "ActivityAyahTrace"("recordedAt");

ALTER TABLE "ActivityAyahTrace"
  ADD CONSTRAINT "ActivityAyahTrace_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityAyahTrace"
  ADD CONSTRAINT "ActivityAyahTrace_ayahId_fkey"
  FOREIGN KEY ("ayahId") REFERENCES "Ayah"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
