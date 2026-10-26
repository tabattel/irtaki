-- Keep existing annotations and assign them to the reading mode.
ALTER TABLE "Annotation"
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'qiraa';

CREATE INDEX "Annotation_userId_mode_idx"
ON "Annotation"("userId", "mode");
