interface WorkflowExecutionResult {
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    duration: number;
    nodesExecuted: number;
    error?: string;
}
export declare class WorkflowDagExecutor {
    private telegramBot;
    private maxConcurrency;
    constructor(telegramBot?: any);
    executeWorkflow(workflowId: string, telegramChatId: number): Promise<WorkflowExecutionResult>;
    private executeDAG;
    private executeNode;
    private executeNodeByType;
    private executeLLMQuery;
    private executeMemoryQuery;
    private executeMemoryStore;
    private executeDocumentRetrieval;
    private executeApiCall;
    private executeConditional;
    private executeNotification;
    private executeDataProcessing;
    private executeCustomScript;
    private executeDelay;
    private executeWebhook;
    private buildExecutionGraph;
    private validateDAG;
    private getReadyDependents;
    private markDownstreamAsFailed;
}
export {};
//# sourceMappingURL=dag-executor.service.d.ts.map