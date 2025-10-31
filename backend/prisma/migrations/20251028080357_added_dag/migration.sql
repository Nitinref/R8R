-- CreateEnum
CREATE TYPE "WorkflowDagStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowNodeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WorkflowNodeType" AS ENUM ('LLM_QUERY', 'DATA_PROCESSING', 'API_CALL', 'CONDITIONAL', 'NOTIFICATION', 'MEMORY_QUERY', 'MEMORY_STORE', 'DOCUMENT_RETRIEVAL', 'CUSTOM_SCRIPT', 'DELAY', 'WEBHOOK');

-- CreateTable
CREATE TABLE "workflow_dags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowDagStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_dags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_dag_nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkflowNodeType" NOT NULL,
    "config" JSONB NOT NULL,
    "workflowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_dag_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_dag_connections" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_dag_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_dag_runs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowDagStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_dag_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_dag_node_runs" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "status" "WorkflowNodeRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "logs" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_dag_node_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_dags_userId_idx" ON "workflow_dags"("userId");

-- CreateIndex
CREATE INDEX "workflow_dags_status_idx" ON "workflow_dags"("status");

-- CreateIndex
CREATE INDEX "workflow_dag_nodes_workflowId_idx" ON "workflow_dag_nodes"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_dag_connections_fromId_idx" ON "workflow_dag_connections"("fromId");

-- CreateIndex
CREATE INDEX "workflow_dag_connections_toId_idx" ON "workflow_dag_connections"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_dag_connections_fromId_toId_key" ON "workflow_dag_connections"("fromId", "toId");

-- CreateIndex
CREATE INDEX "workflow_dag_runs_workflowId_idx" ON "workflow_dag_runs"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_dag_runs_status_idx" ON "workflow_dag_runs"("status");

-- CreateIndex
CREATE INDEX "workflow_dag_node_runs_nodeId_idx" ON "workflow_dag_node_runs"("nodeId");

-- CreateIndex
CREATE INDEX "workflow_dag_node_runs_workflowRunId_idx" ON "workflow_dag_node_runs"("workflowRunId");

-- CreateIndex
CREATE INDEX "workflow_dag_node_runs_status_idx" ON "workflow_dag_node_runs"("status");

-- AddForeignKey
ALTER TABLE "workflow_dags" ADD CONSTRAINT "workflow_dags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_nodes" ADD CONSTRAINT "workflow_dag_nodes_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_dags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_connections" ADD CONSTRAINT "workflow_dag_connections_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "workflow_dag_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_connections" ADD CONSTRAINT "workflow_dag_connections_toId_fkey" FOREIGN KEY ("toId") REFERENCES "workflow_dag_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_runs" ADD CONSTRAINT "workflow_dag_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow_dags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_node_runs" ADD CONSTRAINT "workflow_dag_node_runs_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "workflow_dag_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_dag_node_runs" ADD CONSTRAINT "workflow_dag_node_runs_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_dag_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
