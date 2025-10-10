export enum StepType {
  QUERY_REWRITE = 'query_rewrite',
  RETRIEVAL = 'retrieval',
  RERANK = 'rerank',
  ANSWER_GENERATION = 'answer_generation',
  POST_PROCESS = 'post_process'
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
  HYBRID = 'hybrid'
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  config: {
    llm?: {
      provider: LLMProvider;
      model: string;
      fallback?: { provider: LLMProvider; model: string }[];
      temperature?: number;
      maxTokens?: number;
    };
    retriever?: {
      type: RetrieverType;
      config: Record<string, any>;
    };
    prompt?: string;
    [key: string]: any;
  };
  nextSteps?: string[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
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
  sources: Array<{
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }>;
  confidence?: number;
  latency: number;
  llmsUsed: string[];
  retrieversUsed: string[];
  cached?: boolean;
}
