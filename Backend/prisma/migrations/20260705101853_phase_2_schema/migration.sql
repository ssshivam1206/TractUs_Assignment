-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractEventType" AS ENUM ('CREATE', 'UPDATE', 'FINALIZE', 'ARCHIVE', 'DELETE');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "poRefNo" TEXT NOT NULL,
    "poDate" DATE NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "fieldData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEvent" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "eventType" "ContractEventType" NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_organisationId_status_idx" ON "Contract"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Contract_organisationId_clientName_idx" ON "Contract"("organisationId", "clientName");

-- CreateIndex
CREATE INDEX "Contract_organisationId_poRefNo_idx" ON "Contract"("organisationId", "poRefNo");

-- CreateIndex
CREATE INDEX "Contract_organisationId_createdAt_idx" ON "Contract"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractEvent_contractId_createdAt_idx" ON "ContractEvent"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractEvent_organisationId_createdAt_idx" ON "ContractEvent"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractEvent_eventType_createdAt_idx" ON "ContractEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
