-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('opus');

-- CreateTable
CREATE TABLE "Reciter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT NOT NULL,
    "riwayaId" INTEGER NOT NULL,

    CONSTRAINT "Reciter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioTrack" (
    "id" TEXT NOT NULL,
    "ayahId" INTEGER NOT NULL,
    "reciterId" TEXT NOT NULL,
    "format" "AudioFormat" NOT NULL,
    "durationMs" INTEGER,
    "sourceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reciter_riwayaId_idx" ON "Reciter"("riwayaId");

-- CreateIndex
CREATE INDEX "AudioTrack_ayahId_idx" ON "AudioTrack"("ayahId");

-- CreateIndex
CREATE INDEX "AudioTrack_reciterId_idx" ON "AudioTrack"("reciterId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioTrack_ayahId_reciterId_format_key" ON "AudioTrack"("ayahId", "reciterId", "format");

-- AddForeignKey
ALTER TABLE "Reciter" ADD CONSTRAINT "Reciter_riwayaId_fkey" FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioTrack" ADD CONSTRAINT "AudioTrack_ayahId_fkey" FOREIGN KEY ("ayahId") REFERENCES "Ayah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioTrack" ADD CONSTRAINT "AudioTrack_reciterId_fkey" FOREIGN KEY ("reciterId") REFERENCES "Reciter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
