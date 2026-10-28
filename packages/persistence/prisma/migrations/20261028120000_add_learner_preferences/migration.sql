CREATE TABLE "LearnerPreference" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearnerPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearnerPreference_learnerId_key"
ON "LearnerPreference"("learnerId");

ALTER TABLE "LearnerPreference"
ADD CONSTRAINT "LearnerPreference_learnerId_fkey"
FOREIGN KEY ("learnerId") REFERENCES "Learner"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
