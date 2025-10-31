import type { WorkflowConfig, QueryResponse } from '../../types/workflow.types.js';
export declare class WorkflowExecutor {
    private llmOrchestrator;
    private vectorDB;
    private cache;
    private memoryService;
    constructor();
    executeWorkflow(config: WorkflowConfig, query: string, userId: string, useCache?: boolean): Promise<QueryResponse>;
    /**
     * Generate final result based on executed steps
     */
    private generateFinalResult;
    /**
     * Updated validation - no longer requires answer generation step
     */
    private validateConfiguration;
    /**
     * Calculate confidence for retrieval-only workflows
     */
    private calculateRetrievalConfidence;
    /**
     * Execute workflow as a graph - supports parallel and sequential execution
     */
    private executeWorkflowGraph;
    /**
     * Find entry steps (steps with no incoming connections)
     */
    private findEntrySteps;
    /**
     * Execute workflow starting from entry points
     */
    private executeFromEntryPoints;
    /**
     * Execute a step and all its downstream dependencies
     */
    private executeStepWithDependencies;
    /**
     * Wait for all parent steps to complete
     */
    private waitForParentSteps;
    /**
     * Execute a single step and return output
     */
    private executeSingleStep;
    /**
     * Execute query rewrite step
     */
    private executeQueryRewrite;
    /**
     * Execute retrieval step
     */
    private executeRetrieval;
    /**
     * Execute rerank step
     */
    private executeRerank;
    /**
     * Execute answer generation step
     */
    private executeAnswerGeneration;
    /**
     * Execute post process step
     */
    private executePostProcess;
    /**
     * Execute memory retrieval step
     */
    private executeMemoryRetrieve;
    /**
     * Execute memory summarize step
     */
    private executeMemorySummarize;
    /**
     * Execute memory update step
     */
    private executeMemoryUpdate;
    /**
     * Calculate memory importance based on context
     */
    private calculateMemoryImportance;
    /**
     * Extract tags from context for memory organization
     */
    private extractTags;
    /**
     * Handle memory deduplication
     */
    private handleMemoryDeduplication;
    private calculateConfidence;
}
//# sourceMappingURL=workflow-executor.service.d.ts.map