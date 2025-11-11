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
    private validateConfiguration;
    private calculateRetrievalConfidence;
    /**
     * Execute workflow as a graph - supports parallel and sequential execution
     * FIXED: Better race condition handling
     */
    private executeWorkflowGraph;
    private findEntrySteps;
    private executeFromEntryPoints;
    /**
     * FIXED: Better race condition handling with inProgress tracking
     */
    private executeStepWithDependencies;
    /**
     * NEW: Wait for a specific step to complete
     */
    private waitForStepCompletion;
    private waitForParentSteps;
    private executeSingleStep;
    private executeQueryRewrite;
    private getImprovedQueryRewritePrompt;
    private addStrategyGuidance;
    private cleanQueryResponse;
    private assessQueryQuality;
    private calculateStringSimilarity;
    private extractKeyConcepts;
    private conceptsAreSimilar;
    private executeRetrieval;
    private executeRerank;
    private executeAnswerGeneration;
    private executePostProcess;
    private executeMemoryRetrieve;
    private executeMemorySummarize;
    private executeMemoryUpdate;
    private calculateMemoryImportance;
    private extractTags;
    private handleMemoryDeduplication;
    private calculateConfidence;
}
//# sourceMappingURL=workflow-executor.service.d.ts.map