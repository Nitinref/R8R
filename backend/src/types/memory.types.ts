// types/memory.types.ts

/**
 * Memory Types
 */
export type MemoryType = 
  | 'conversation'
  | 'fact' 
  | 'preference'
  | 'decision'
  | 'insight'
  | 'feedback'
  | 'instruction'
  | 'explanation';

/**
 * Memory Entry - Stored memory structure
 */
export interface MemoryEntry {
  id: string;
  userId: string;
  workflowId?: string;
  query: string;
  response: string;
  embedding: number[];
  importance: number;
  type: MemoryType;
  tags: string[];
  accessCount: number;
  lastAccessed?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory Match - Result from memory retrieval
 */
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

/**
 * Memory Service Responses
 */
export interface MemoryServiceResponse {
  success: boolean;
  data?: {
    stored?: MemoryEntry;
    memories?: MemoryMatch[];
    summarized?: {
      original: MemoryEntry[];
      summary: MemoryEntry;
    };
    export?: {
      format: 'json' | 'csv';
      content: any;
      count: number;
    };
  };
  stats?: {
    embeddingTime?: number;
    retrievalTime?: number;
    totalTime?: number;
    searchType?: string;
    compressionSaved?: number;
    totalProcessed?: number;
  };
  error?: string;
}

/**
 * Memory Store Request
 */
export interface StoreMemoryRequest {
  userId: string;
  workflowId?: string;
  query: string;
  response: string;
  metadata?: {
    importance?: number;
    type?: MemoryType;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Memory Retrieve Request
 */
export interface RetrieveMemoryRequest {
  userId: string;
  workflowId?: string;
  query: string;
  topK?: number;
  minScore?: number;
  filters?: MemoryFilters;
}

/**
 * Memory Update Importance Request
 */
export interface UpdateMemoryImportanceRequest {
  memoryId: string;
  userId: string;
  feedbackScore: number; // -1 to 1
  reason?: string;
}

/**
 * Memory Filters for Retrieval
 */
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

/**
 * Memory Node Configuration Types
 */

// Memory Retrieve Node Config
export interface MemoryRetrieveConfig {
  enabled: boolean;
  retrieval: {
    topK: number;
    minScore: number;
    includeMetadata: boolean;
    useReranking: boolean;
    useHybridSearch?: boolean;
    keywordWeight?: number;
    relevanceThreshold?: number;
  };
  filters?: MemoryFilters;
}

// Memory Update Node Config
export interface MemoryUpdateConfig {
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
}

// Memory Summarize Node Config
export interface MemorySummarizeConfig {
  enabled: boolean;
  triggers: {
    minMemories: number;
    maxSimilarity: number;
    minGroupSize?: number;
  };
  strategy: {
    preserveDetails: boolean;
  };
}

/**
 * Memory Execution Context
 */
export interface MemoryExecutionContext {
  currentQuery: string;
  rewrittenQuery?: string;
  answer?: string;
  confidence?: number;
  retrievedMemories: MemoryMatch[];
  metadata: {
    memoriesUsed?: number;
    memoryRelevance?: number;
    memoryRetrievalTime?: number;
    memoryRetrievalStrategy?: string;
    topMemoryScore?: number;
    memoryStored?: boolean;
    memoryId?: string;
    memoryImportance?: number;
    memoryType?: string;
    memoryTags?: string[];
    storageTime?: number;
    memoryValidationFailed?: boolean;
    memoryValidationErrors?: string[];
    duplicateFound?: boolean;
    duplicatesCount?: number;
    memoriesSummarized?: boolean;
    groupsProcessed?: number;
    summarizedCount?: number;
    summarizationResults?: any[];
    compressionRatio?: number;
    memoryError?: string;
    [key: string]: any;
  };
  userId?: string;
  workflowId?: string;
}

/**
 * Memory Node Types
 */
export type MemoryNodeType = 
  | 'memory_retrieve'
  | 'memory_update' 
  | 'memory_summarize';

/**
 * Memory Consolidation Status
 */
export type ConsolidationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Memory Analytics
 */
export interface MemoryAnalytics {
  total: number;
  byType: Record<string, number>;
  avgImportance: number;
  totalAccessCount: number;
  lastAccessed?: Date;
  totalCharacters: number;
  avgMemorySize: number;
}

/**
 * Memory Export Options
 */
export interface MemoryExportOptions {
  format: 'json' | 'csv';
  includeEmbeddings?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Memory Search Options
 */
export interface MemorySearchOptions {
  query?: string;
  workflowId?: string;
  types?: MemoryType[];
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'importance' | 'recency' | 'created';
}

/**
 * Memory Health Check
 */
export interface MemoryHealthCheck {
  database: boolean;
  vectorDb: boolean;
  openai: boolean;
  details: Record<string, any>;
}

/**
 * Memory Batch Operations
 */
export interface MemoryBatchStoreRequest {
  memories: StoreMemoryRequest[];
}

export interface MemoryBatchStoreResponse {
  success: boolean;
  data?: {
    stored: MemoryEntry[];
    failed?: Array<{
      request: StoreMemoryRequest;
      error: string;
    }>;
  };
  stats?: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    totalTime: number;
  };
}

/**
 * Memory Similarity Search Result
 */
export interface MemorySimilarityResult {
  memory: MemoryEntry;
  similarity: number;
  distance: number;
  rank: number;
}

/**
 * Memory Usage Statistics
 */
export interface MemoryUsageStats {
  userId: string;
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  averageImportance: number;
  totalAccessCount: number;
  mostAccessedMemories: MemoryEntry[];
  recentMemories: MemoryEntry[];
  storageSize: {
    totalCharacters: number;
    averageMemorySize: number;
    estimatedVectorSize: number;
  };
}

/**
 * Memory Cleanup Options
 */
export interface MemoryCleanupOptions {
  maxMemories?: number;
  minImportance?: number;
  maxAgeDays?: number;
  excludeTypes?: MemoryType[];
  dryRun?: boolean;
}

/**
 * Memory Compression Result
 */
export interface MemoryCompressionResult {
  original: {
    query: string;
    response: string;
    totalLength: number;
  };
  compressed: {
    query: string;
    response: string;
    totalLength: number;
  };
  compressionRatio: number;
  tokensSaved: number;
}

/**
 * Memory Feedback Types
 */
export interface MemoryFeedback {
  memoryId: string;
  userId: string;
  type: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  reason?: string;
  context?: {
    query: string;
    wasHelpful: boolean;
    timestamp: Date;
  };
}

/**
 * Memory Retrieval Log
 */
export interface MemoryRetrievalLog {
  id: string;
  memoryId: string;
  userId: string;
  query: string;
  similarity: number;
  rank: number;
  usedInResponse: boolean;
  responseQuality?: number; // 0-1 scale
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Memory Consolidation Job
 */
export interface MemoryConsolidationJob {
  id: string;
  userId: string;
  status: ConsolidationStatus;
  sourceMemoryIds: string[];
  resultMemoryId?: string;
  stats: {
    originalCount: number;
    tokensReduced: number;
    compressionRatio: number;
    processingTime: number;
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Memory Vector Search Parameters
 */
export interface VectorSearchParams {
  vector: number[];
  topK: number;
  minScore?: number;
  filters?: MemoryFilters;
  includeMetadata?: boolean;
  scoreThreshold?: number;
}

/**
 * Memory Embedding Generation Request
 */
export interface EmbeddingGenerationRequest {
  text: string;
  model?: string;
  dimensions?: number;
}

/**
 * Memory Embedding Generation Response
 */
export interface EmbeddingGenerationResponse {
  success: boolean;
  embedding?: number[];
  dimensions?: number;
  model?: string;
  error?: string;
}

/**
 * Memory System Configuration
 */
export interface MemorySystemConfig {
  vectorDb: {
    provider: 'qdrant' | 'weaviate' | 'pinecone';
    url: string;
    apiKey?: string;
    collectionName: string;
  };
  embeddingModel: {
    provider: 'openai' | 'local';
    model: string;
    dimensions: number;
    apiKey?: string;
  };
  summarizationModel: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    maxTokens: number;
  };
  retention: {
    maxMemoriesPerUser: number;
    defaultExpirationDays: number;
    cleanupSchedule: string; // cron expression
  };
  performance: {
    batchSize: number;
    cacheEnabled: boolean;
    cacheTTL: number;
    maxConcurrentOperations: number;
  };
}

/**
 * Memory Operation Metrics
 */
export interface MemoryOperationMetrics {
  operation: 'store' | 'retrieve' | 'update' | 'summarize' | 'delete';
  userId: string;
  duration: number;
  success: boolean;
  memoryCount?: number;
  embeddingTime?: number;
  retrievalTime?: number;
  tokensUsed?: number;
  timestamp: Date;
  error?: string;
}

/**
 * Memory Cache Entry
 */
export interface MemoryCacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  ttl: number; // time to live in seconds
  hits: number;
  lastAccessed: Date;
}

/**
 * Memory Search Result with Highlights
 */
export interface MemorySearchResult {
  memory: MemoryEntry;
  score: number;
  highlights: {
    query: string[];
    response: string[];
  };
  context: {
    similarMemories: MemoryMatch[];
    userPatterns: string[];
  };
}

/**
 * Memory Personalization Profile
 */
export interface MemoryPersonalizationProfile {
  userId: string;
  preferredMemoryTypes: MemoryType[];
  frequentlyUsedTags: string[];
  importanceWeights: {
    recency: number;
    frequency: number;
    relevance: number;
    userFeedback: number;
  };
  learningStyle: 'detailed' | 'concise' | 'examples' | 'step-by-step';
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  lastUpdated: Date;
}

/**
 * Memory-Augmented RAG Context
 */
export interface MemoryAugmentedRAGContext {
  originalQuery: string;
  enhancedQuery: string;
  retrievedDocuments: any[];
  retrievedMemories: MemoryMatch[];
  combinedContext: string;
  memoryInfluence: {
    queryExpansion: string[];
    contextEnhancement: string[];
    confidenceBoost: number;
  };
  metadata: {
    memoryRetrievalTime: number;
    memoryCount: number;
    averageRelevance: number;
    memoryTypesUsed: MemoryType[];
  };
}