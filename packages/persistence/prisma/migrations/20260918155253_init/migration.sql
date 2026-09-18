-- CreateEnum
CREATE TYPE "QiraaRegion" AS ENUM ('madinah', 'makkah', 'basrah', 'damascus', 'kufa');

-- CreateEnum
CREATE TYPE "SurahRevelationType" AS ENUM ('meccan', 'medinan');

-- CreateTable
CREATE TABLE "Qiraa" (
    "id" INTEGER NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "region" "QiraaRegion" NOT NULL,

    CONSTRAINT "Qiraa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Riwaya" (
    "id" INTEGER NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "qiraaId" INTEGER NOT NULL,

    CONSTRAINT "Riwaya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariq" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "riwayaId" INTEGER NOT NULL,

    CONSTRAINT "Tariq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mushaf" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bismillah" TEXT,
    "riwayaId" INTEGER NOT NULL,

    CONSTRAINT "Mushaf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surah" (
    "id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "codedName" TEXT,
    "translatedName" TEXT,
    "numberOfAyahs" INTEGER NOT NULL,
    "firstPage" INTEGER NOT NULL,
    "lastPage" INTEGER NOT NULL,
    "firstJuz" INTEGER NOT NULL,
    "revelationType" "SurahRevelationType" NOT NULL,
    "revelationOrder" INTEGER NOT NULL,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ayah" (
    "id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "surahNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "juz" INTEGER NOT NULL,
    "hizb" INTEGER NOT NULL,
    "manzil" INTEGER NOT NULL,
    "ruku" INTEGER NOT NULL,
    "marker" TEXT NOT NULL,
    "numberInHafs" INTEGER[],

    CONSTRAINT "Ayah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Riwaya_qiraaId_idx" ON "Riwaya"("qiraaId");

-- CreateIndex
CREATE INDEX "Tariq_riwayaId_idx" ON "Tariq"("riwayaId");

-- CreateIndex
CREATE INDEX "Mushaf_riwayaId_idx" ON "Mushaf"("riwayaId");

-- CreateIndex
CREATE UNIQUE INDEX "Surah_number_key" ON "Surah"("number");

-- CreateIndex
CREATE INDEX "Ayah_surahNumber_idx" ON "Ayah"("surahNumber");

-- CreateIndex
CREATE INDEX "Ayah_pageNumber_idx" ON "Ayah"("pageNumber");

-- CreateIndex
CREATE INDEX "Ayah_juz_idx" ON "Ayah"("juz");

-- CreateIndex
CREATE UNIQUE INDEX "Ayah_surahNumber_number_key" ON "Ayah"("surahNumber", "number");

-- AddForeignKey
ALTER TABLE "Riwaya" ADD CONSTRAINT "Riwaya_qiraaId_fkey" FOREIGN KEY ("qiraaId") REFERENCES "Qiraa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariq" ADD CONSTRAINT "Tariq_riwayaId_fkey" FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mushaf" ADD CONSTRAINT "Mushaf_riwayaId_fkey" FOREIGN KEY ("riwayaId") REFERENCES "Riwaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ayah" ADD CONSTRAINT "Ayah_surahNumber_fkey" FOREIGN KEY ("surahNumber") REFERENCES "Surah"("number") ON DELETE RESTRICT ON UPDATE CASCADE;
