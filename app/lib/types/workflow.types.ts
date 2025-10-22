export enum StepType {
  QUERY_REWRITE = 'query_rewrite',
  RETRIEVAL = 'retrieval',
  RERANK = 'rerank',
  ANSWER_GENERATION = 'answer_generation',
  POST_PROCESS = 'post_process',
  MEMORY_UPDATE = "memory_update",        // Changed from "MEMORY_UPDATE"
  MEMORY_SUMMARIZE = "memory_summarize",  // Changed from "MEMORY_SUMMARIZE"
  MEMORY_RETRIEVE = "memory_retrieve"     // Changed from "MEMORY_RETRIEVE"
}

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  MISTRAL = 'mistral'
}

export enum RetrieverType {
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate',
  KEYWORD = 'keyword',
  HYBRID = 'hybrid',
   QDRANT = 'qdrant'
}

export interface Position {
  x: number;
  y: number;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  fallback?: Array<{ provider: LLMProvider; model: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface RetrieverConfig {
  type: RetrieverType;
  config: {
    indexName?: string;
    topK?: number;
    [key: string]: any;
  };
}

export interface WorkflowNode {
  id: string;
  type: StepType;
  position: Position;
  config: {
    llm?: LLMConfig;
    retriever?: RetrieverConfig;
    prompt?: string;
    [key: string]: any;
  };
  nextSteps?: string[];
}

export interface WorkflowConfig {
  edges: never[];
  nodes: WorkflowNode[];
  id: string;
  name: string;
  description?: string;
  steps: WorkflowNode[];
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface WorkflowAnalytics {
  id: string;
  workflowId: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgLatency: number;
  avgConfidence: number;
  hallucinationRate: number;
  totalTokensUsed: number;
  estimatedCost: number;
  lastQueryAt?: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  userId: string;
  configuration: WorkflowConfig;
  status: 'draft' | 'active' | 'archived';
  version: number;
  analytics?: WorkflowAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  config: {
    llm?: LLMConfig;
    retriever?: RetrieverConfig;
    prompt?: string;
    [key: string]: any;
  };
  nextSteps?: string[];
}