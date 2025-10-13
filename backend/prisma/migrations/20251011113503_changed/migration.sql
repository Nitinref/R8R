/*
  Warnings:

  - You are about to drop the column `hallucinationRate` on the `WorkflowAnalytics` table. All the data in the column will be lost.
  - You are about to drop the `SystemMetrics` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "canRead" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canWrite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QueryLog" ADD COLUMN     "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sources" SET DEFAULT '[]',
ALTER COLUMN "llmsUsed" SET DEFAULT '[]',
ALTER COLUMN "retrieversUsed" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "vectorIndexName" TEXT,
ADD COLUMN     "vectorNamespace" TEXT;

-- AlterTable
ALTER TABLE "WorkflowAnalytics" DROP COLUMN "hallucinationRate";

-- DropTable
DROP TABLE "public"."SystemMetrics";

-- CreateTable
CREATE TABLE "ApiKeyWorkflow" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "vectorIds" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKeyWorkflow_apiKeyId_idx" ON "ApiKeyWorkflow"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiKeyWorkflow_workflowId_idx" ON "ApiKeyWorkflow"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyWorkflow_apiKeyId_workflowId_key" ON "ApiKeyWorkflow"("apiKeyId", "workflowId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_workflowId_idx" ON "Document"("workflowId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "QueryLog_status_idx" ON "QueryLog"("status");

-- AddForeignKey
ALTER TABLE "ApiKeyWorkflow" ADD CONSTRAINT "ApiKeyWorkflow_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeyWorkflow" ADD CONSTRAINT "ApiKeyWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
