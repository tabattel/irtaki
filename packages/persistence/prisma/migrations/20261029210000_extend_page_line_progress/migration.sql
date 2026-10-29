ALTER TABLE "ActivityAyahTrace"
  ADD COLUMN "lineNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "pageLineCount" INTEGER,
  ADD COLUMN "mushafPageNumber" INTEGER;

ALTER TABLE "ActivityResult"
  ALTER COLUMN "quantity" TYPE DECIMAL(10, 4);

ALTER TABLE "ProgressRecord"
  ALTER COLUMN "quantity" TYPE DECIMAL(10, 4);
