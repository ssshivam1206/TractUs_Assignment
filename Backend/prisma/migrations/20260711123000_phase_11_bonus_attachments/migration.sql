-- CreateTable
CREATE TABLE "ContractAttachment" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractAttachment_contractId_createdAt_idx" ON "ContractAttachment"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractAttachment_organisationId_createdAt_idx" ON "ContractAttachment"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
