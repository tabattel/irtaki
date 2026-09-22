/*
  Warnings:

  - The values [thomone] on the enum `ProgressUnit` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GoalTargetScope" ADD VALUE 'nisf';
ALTER TYPE "GoalTargetScope" ADD VALUE 'roboa';

-- AlterEnum
BEGIN;
CREATE TYPE "ProgressUnit_new" AS ENUM ('quran', 'surah', 'ayah', 'page', 'juz', 'hizb', 'nisf', 'roboa');
ALTER TABLE "Goal" ALTER COLUMN "unit" TYPE "ProgressUnit_new" USING ("unit"::text::"ProgressUnit_new");
ALTER TABLE "ActivityResult" ALTER COLUMN "unit" TYPE "ProgressUnit_new" USING ("unit"::text::"ProgressUnit_new");
ALTER TABLE "ProgressRecord" ALTER COLUMN "unit" TYPE "ProgressUnit_new" USING ("unit"::text::"ProgressUnit_new");
ALTER TYPE "ProgressUnit" RENAME TO "ProgressUnit_old";
ALTER TYPE "ProgressUnit_new" RENAME TO "ProgressUnit";
DROP TYPE "public"."ProgressUnit_old";
COMMIT;
