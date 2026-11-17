-- AlterEnum
ALTER TYPE "RecitationGrade" ADD VALUE 'D';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "wajhId" INTEGER;

-- CreateIndex
CREATE INDEX "Activity_wajhId_idx" ON "Activity"("wajhId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_wajhId_fkey" FOREIGN KEY ("wajhId") REFERENCES "Wajh"("id") ON DELETE SET NULL ON UPDATE CASCADE;

