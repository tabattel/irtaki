-- CreateTable
CREATE TABLE "Wajh" (
    "id" SERIAL NOT NULL,
    "tariqId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wajh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wajh_tariqId_idx" ON "Wajh"("tariqId");

-- CreateIndex
CREATE UNIQUE INDEX "Wajh_tariqId_name_key" ON "Wajh"("tariqId", "name");

-- AddForeignKey
ALTER TABLE "Wajh" ADD CONSTRAINT "Wajh_tariqId_fkey" FOREIGN KEY ("tariqId") REFERENCES "Tariq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
