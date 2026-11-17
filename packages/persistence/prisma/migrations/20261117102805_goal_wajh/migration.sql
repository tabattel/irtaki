-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "wajhId" INTEGER;

-- CreateIndex
CREATE INDEX "Goal_wajhId_idx" ON "Goal"("wajhId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_wajhId_fkey" FOREIGN KEY ("wajhId") REFERENCES "Wajh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

