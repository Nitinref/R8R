interface VectorSearchResult {
    id: string;
    score: number;
    metadata: Record<string, any>;
    content: string;
}
export declare class VectorDBService {
    private pinecone;
    constructor();
    searchPinecone(indexName: string, embedding: number[], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    getEmbedding(text: string): Promise<number[]>;
}
export {};
//# sourceMappingURL=vector-db.service.d.ts.map