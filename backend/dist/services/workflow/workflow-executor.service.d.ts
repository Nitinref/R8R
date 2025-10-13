import type { WorkflowConfig, QueryResponse } from '../../types/workflow.types.js';
export declare class WorkflowExecutor {
    private llmOrchestrator;
    private vectorDB;
    private cache;
    constructor();
    executeWorkflow(config: WorkflowConfig, query: string, useCache?: boolean): Promise<QueryResponse>;
    private validateConfiguration;
    private executeSteps;
    private findEntrySteps;
    private executeStepRecursive;
    private executeSingleStep;
    private executeRetrieval;
    private executeQueryRewrite;
    private executeRerank;
    private executeAnswerGeneration;
    private executePostProcess;
    private calculateConfidence;
}
//# sourceMappingURL=workflow-executor.service.d.ts.map