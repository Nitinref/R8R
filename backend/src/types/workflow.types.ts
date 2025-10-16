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

// Frontend node structure (what the UI creates)
export interface WorkflowNode {
  id: string;
  type: StepType;
  position: { x: number; y: number };
  data: {
    label: string;
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
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// Backend executable step structure
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

// Complete workflow configuration
export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  // Store both representations
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  steps: WorkflowStep[]; // Computed from nodes + edges
  entryPoint?: string; // ID of the first step
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface QueryRequest {
  workflowId: string;
  query: string;
  metadata?: Record<string, any>;
}

// ✅ UPDATED: Added rewrittenQuery field
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
  // ✅ NEW: Track the optimized query
}

// ✅ UPDATED: Renamed documents to retrievedDocs for clarity
export interface ExecutionContext {
  originalQuery: string;
  currentQuery: string;
  rewrittenQuery: string | null; // ✅ NEW: Track rewritten query separately
  retrievedDocs: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    score: number;
  }>;
  answer?: string;
  confidence?: number;
  metadata: Record<string, any>;
}