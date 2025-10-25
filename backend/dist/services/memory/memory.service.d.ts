import type { MemoryServiceResponse, StoreMemoryRequest, RetrieveMemoryRequest, UpdateMemoryImportanceRequest, MemoryRetrieveConfig } from '../../types/memory.types.js';
export declare class MemoryService {
    private qdrant;
    private openai;
    private collectionName;
    private embeddingDimension;
    constructor();
    private initializeMemoryCollection;
    storeMemory(request: StoreMemoryRequest): Promise<MemoryServiceResponse>;
    retrieveMemories(request: RetrieveMemoryRequest, config?: MemoryRetrieveConfig): Promise<MemoryServiceResponse>;
    hybridSearch(request: RetrieveMemoryRequest, keywordWeight?: number): Promise<MemoryServiceResponse>;
    updateImportance(request: UpdateMemoryImportanceRequest): Promise<MemoryServiceResponse>;
    summarizeMemories(memoryIds: string[], userId: string, preserveDetails?: boolean): Promise<MemoryServiceResponse>;
    cleanup(userId: string, maxMemories: number): Promise<void>;
    deleteMemoryFromVectorDB(memoryId: string): Promise<void>;
    getStats(userId: string, workflowId?: string): Promise<any>;
    healthCheck(): Promise<{
        database: boolean;
        vectorDb: boolean;
        openai: boolean;
        details: any;
    }>;
    private generateEmbedding;
    private compressMemoryContent;
    private validateMemoryRequest;
    private applyKeywordBoost;
}
export declare function getMemoryService(): MemoryService;
//# sourceMappingURL=memory.service.d.ts.map