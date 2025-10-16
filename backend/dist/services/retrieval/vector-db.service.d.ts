interface VectorSearchResult {
    id: string;
    score: number;
    metadata: Record<string, any>;
    content: string;
}
export declare class VectorDBService {
    private qdrant;
    private openai;
    private collectionName;
    constructor();
    private initializeCollection;
    searchVectors(embedding: number[], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    upsertDocument(id: string, content: string, metadata?: Record<string, any>): Promise<void>;
    getEmbedding(text: string): Promise<number[]>;
    private buildQdrantFilter;
    getCollectionStats(): Promise<any>;
}
export {};
//# sourceMappingURL=vector-db.service.d.ts.map