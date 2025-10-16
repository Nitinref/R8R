import type { WorkflowConfig, QueryResponse } from '../../types/workflow.types.js';
export declare class WorkflowExecutor {
    private llmOrchestrator;
    private vectorDB;
    private cache;
    constructor();
    executeWorkflow(config: WorkflowConfig, query: string, useCache?: boolean): Promise<QueryResponse>;
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
     * Execute a step and all its downstream dependencies - FIXED VERSION
     */
    /**
    * Execute a step and all its downstream dependencies - FIXED VERSION
    */
    private executeStepWithDependencies;
    /**
     * Wait for all parent steps to complete - FIXED VERSION
     */
    private waitForParentSteps;
    /**
     * Execute a single step
     */
    private executeSingleStep;
    private executeQueryRewrite;
    private executeRetrieval;
    private executeRerank;
    private executeAnswerGeneration;
    private executePostProcess;
    private calculateConfidence;
    private validateConfiguration;
}
//# sourceMappingURL=workflow-executor.service.d.ts.map