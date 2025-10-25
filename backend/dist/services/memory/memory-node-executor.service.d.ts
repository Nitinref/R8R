import type { MemoryRetrieveConfig, MemoryUpdateConfig, MemorySummarizeConfig, MemoryExecutionContext } from '../../types/memory.types.js';
export declare class MemoryNodeExecutor {
    private memoryService;
    private llmOrchestrator;
    /**
     * Execute Memory Retrieve Node
     */
    executeMemoryRetrieve(config: MemoryRetrieveConfig, context: MemoryExecutionContext, userId: string, workflowId: string): Promise<MemoryExecutionContext>;
    /**
     * Execute Memory Update Node
     */
    executeMemoryUpdate(config: MemoryUpdateConfig, context: MemoryExecutionContext, userId: string, workflowId: string): Promise<MemoryExecutionContext>;
    /**
     * Execute Memory Summarize Node
     */
    executeMemorySummarize(config: MemorySummarizeConfig, context: MemoryExecutionContext, userId: string, workflowId: string): Promise<MemoryExecutionContext>;
    private rerankMemories;
    private calculateRerankScore;
    private getRecencyScore;
    private getEngagementScore;
    private getLengthScore;
    private calculateAutoImportance;
    private applyContextualImportanceBoost;
    private findDuplicateMemories;
    private handleDuplicateMemories;
    private mergeMemoryMetadata;
    private validateMemoryContent;
    private classifyMemoryType;
    private extractTags;
    private isCommonWord;
    private groupSimilarMemories;
    private calculateMemorySimilarity;
    private applyMemoryExpiration;
}
export declare function getMemoryNodeExecutor(): MemoryNodeExecutor;
//# sourceMappingURL=memory-node-executor.service.d.ts.map