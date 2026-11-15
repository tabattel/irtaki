-- Add riwayaId + tariqId (nullable) to Activity
ALTER TABLE "Activity" ADD COLUMN "riwayaId" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "tariqId" INTEGER;
-- Add riwayaId + tariqId (nullable) to Goal
ALTER TABLE "Goal" ADD COLUMN "riwayaId" INTEGER;
ALTER TABLE "Goal" ADD COLUMN "tariqId" INTEGER;

-- Index
CREATE INDEX "Activity_riwayaId_idx" ON "Activity"("riwayaId");
CREATE INDEX "Activity_tariqId_idx" ON "Activity"("tariqId");
CREATE INDEX "Goal_riwayaId_idx" ON "Goal"("riwayaId");
CREATE INDEX "Goal_tariqId_idx" ON "Goal"("tariqId");

-- Foreign keys (SET NULL for clean deletes)
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_riwayaId_fkey"
  FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tariqId_fkey"
  FOREIGN KEY ("tariqId") REFERENCES "Tariq"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_riwayaId_fkey"
  FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_tariqId_fkey"
  FOREIGN KEY ("tariqId") REFERENCES "Tariq"("id") ON DELETE SET NULL ON UPDATE CASCADE;
