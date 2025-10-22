export declare enum StepType {
    QUERY_REWRITE = "query_rewrite",
    RETRIEVAL = "retrieval",
    RERANK = "rerank",
    ANSWER_GENERATION = "answer_generation",
    POST_PROCESS = "post_process",
    MEMORY_UPDATE = "memory_update",// UPPERCASE
    MEMORY_SUMMARIZE = "memory_summarize",// UPPERCASE
    MEMORY_RETRIEVE = "memory_retrieve"
}
export declare enum LLMProvider {
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    GOOGLE = "google",
    MISTRAL = "mistral"
}
export declare enum RetrieverType {
    PINECONE = "pinecone",
    WEAVIATE = "weaviate",
    KEYWORD = "keyword",
    HYBRID = "hybrid"
}
export type MemoryType = 'conversation' | 'fact' | 'preference' | 'decision' | 'insight' | 'feedback' | 'instruction' | 'explanation';
export interface MemoryFilters {
    types?: MemoryType[];
    tags?: string[];
    minImportance?: number;
    maxImportance?: number;
    minScore?: number;
    maxScore?: number;
    dateFrom?: Date;
    dateTo?: Date;
    maxAgeDays?: number;
}
export interface WorkflowNode {
    id: string;
    type: StepType;
    position: {
        x: number;
        y: number;
    };
    data: {
        label: string;
        config: {
            llm?: {
                provider: LLMProvider;
                model: string;
                fallback?: {
                    provider: LLMProvider;
                    model: string;
                }[];
                temperature?: number;
                maxTokens?: number;
            };
            retriever?: {
                type: RetrieverType;
                config: Record<string, any>;
            };
            prompt?: string;
            memoryRetrieve?: {
                enabled: boolean;
                topK: number;
                minScore: number;
                includeMetadata: boolean;
                useReranking: boolean;
                useHybridSearch?: boolean;
                keywordWeight?: number;
                relevanceThreshold?: number;
                filters?: MemoryFilters;
            };
            memoryUpdate?: {
                enabled: boolean;
                importance: {
                    auto: boolean;
                    baseScore?: number;
                };
                deduplication: {
                    enabled: boolean;
                    similarityThreshold: number;
                    mergeStrategy: 'summarize' | 'keep_recent' | 'keep_important' | 'merge_metadata';
                };
                retention: {
                    maxMemories: number;
                    enableExpiration: boolean;
                    expirationDays?: number;
                };
            };
            memorySummarize?: {
                enabled: boolean;
                triggers: {
                    minMemories: number;
                    maxSimilarity: number;
                    minGroupSize?: number;
                };
                strategy: {
                    preserveDetails: boolean;
                };
            };
            [key: string]: any;
        };
    };
}
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
}
export interface WorkflowStep {
    id: string;
    type: StepType;
    config: {
        llm?: {
            provider: LLMProvider;
            model: string;
            fallback?: {
                provider: LLMProvider;
                model: string;
            }[];
            temperature?: number;
            maxTokens?: number;
        };
        retriever?: {
            type: RetrieverType;
            config: Record<string, any>;
        };
        prompt?: string;
        memoryRetrieve?: {
            enabled: boolean;
            topK: number;
            minScore: number;
            includeMetadata: boolean;
            useReranking: boolean;
            useHybridSearch?: boolean;
            keywordWeight?: number;
            relevanceThreshold?: number;
            filters?: MemoryFilters;
        };
        memoryUpdate?: {
            enabled: boolean;
            importance: {
                manualValue: number;
                auto: boolean;
                baseScore?: number;
            };
            deduplication: {
                enabled: boolean;
                similarityThreshold: number;
                mergeStrategy: 'summarize' | 'keep_recent' | 'keep_important' | 'merge_metadata';
            };
            retention: {
                maxMemories: number;
                enableExpiration: boolean;
                expirationDays?: number;
            };
        };
        memorySummarize?: {
            topK: number;
            similarityThreshold: any;
            memoryIds: boolean;
            preserveDetails: boolean;
            enabled: boolean;
            triggers: {
                minMemories: number;
                maxSimilarity: number;
                minGroupSize?: number;
            };
            strategy: {
                preserveDetails: boolean;
            };
        };
        [key: string]: any;
    };
    nextSteps?: string[];
}
export interface WorkflowConfig {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    steps: WorkflowStep[];
    entryPoint?: string;
    cacheEnabled?: boolean;
    cacheTTL?: number;
}
export interface QueryRequest {
    workflowId: string;
    query: string;
    metadata?: Record<string, any>;
}
export interface QueryResponse {
    answer: string;
    query: string;
    documents: any[];
    metadata: Record<string, any>;
    sources: Array<{
        content: string;
        metadata: Record<string, any>;
        score?: number;
    }>;
    confidence?: number;
    latency: number;
    llmsUsed: string[];
    retrieversUsed: string[];
    rewrittenQuery: Record<string, string>;
    cached?: boolean;
    memoryContext?: {
        memoriesUsed?: number;
        memoryRelevance?: number;
        memoryRetrievalTime?: number;
        memoryStored?: boolean;
        memoriesSummarized?: boolean;
        memoryError?: string;
    };
}
export interface ExecutionContext {
    originalQuery: string;
    currentQuery: string;
    rewrittenQuery: string | null;
    retrievedDocs: Array<{
        id: string;
        content: string;
        metadata: Record<string, any>;
        score: number;
    }>;
    memoryContext?: {
        retrievedMemories: Array<{
            id: string;
            content: string;
            metadata: {
                query: string;
                response: string;
                timestamp: Date;
                importance: number;
                type: MemoryType;
                tags: string[];
                accessCount: number;
                lastAccessed: Date;
            };
            score: number;
            distance: number;
        }>;
        memoriesUsed?: number;
        memoryRelevance?: number;
        memoryRetrievalTime?: number;
        memoryStored?: boolean;
        memoryId?: string;
        memoryImportance?: number;
        memoryType?: string;
        memoryTags?: string[];
        memoriesSummarized?: boolean;
        groupsProcessed?: number;
        summarizedCount?: number;
        memoryError?: string;
    };
    answer?: string;
    confidence?: number;
    metadata: Record<string, any>;
}
export interface MemoryMatch {
    id: string;
    content: string;
    metadata: {
        query: string;
        response: string;
        timestamp: Date;
        importance: number;
        type: MemoryType;
        tags: string[];
        accessCount: number;
        lastAccessed: Date;
        [key: string]: any;
    };
    score: number;
    distance: number;
}
export interface MemoryServiceResponse {
    success: boolean;
    data?: {
        stored?: any;
        memories?: MemoryMatch[];
        summarized?: {
            original: any[];
            summary: any;
        };
    };
    stats?: {
        embeddingTime?: number;
        retrievalTime?: number;
        totalTime?: number;
    };
    error?: string;
}
export interface MemorySummarizeConfig {
    enabled?: boolean;
    memoryIds?: string[];
    topK?: number;
    similarityThreshold?: number;
    preserveDetails?: boolean;
}
//# sourceMappingURL=workflow.types.d.ts.map