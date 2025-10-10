import type { WorkflowConfig, QueryResponse } from '../../types/workflow.types.js';
export declare class WorkflowExecutor {
    private llmOrchestrator;
    private vectorDB;
    private cache;
    constructor();
    executeWorkflow(config: WorkflowConfig, query: string, useCache?: boolean): Promise<QueryResponse>;
}
//# sourceMappingURL=workflow-executor.service.d.ts.map