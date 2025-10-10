import { Workflow, WorkflowAnalytics } from './workflow.types';

// ===================================
// GENERIC API RESPONSES
// ===================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  status: 'error';
  statusCode?: number;
  details?: any;
}

export interface SuccessResponse<T = any> {
  data?: T;
  message: string;
  status: 'success';
}

// ===================================
// PAGINATION
// ===================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ===================================
// QUERY TYPES
// ===================================

export interface QueryRequest {
  workflowId: string;
  query: string;
  metadata?: Record<string, any>;
}

export interface QuerySource {
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  confidence?: number;
  latency: number;
  llmsUsed: string[];
  retrieversUsed: string[];
  cached?: boolean;
}

export interface QueryLog {
  id: string;
  workflowId: string;
  userId: string;
  query: string;
  rewrittenQuery?: string;
  answer: string;
  sources: QuerySource[];
  confidence?: number;
  latency: number;
  llmsUsed: string[];
  retrieversUsed: string[];
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  workflow: {
    id: string;
    name: string;
  };
}

export interface QueryHistoryParams {
  workflowId?: string;
  limit?: number;
  offset?: number;
}

export interface QueryHistoryResponse {
  logs: QueryLog[];
  total?: number;
  page?: number;
  limit?: number;
}

// ===================================
// DASHBOARD & ANALYTICS TYPES
// ===================================

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalQueries: number;
  recentQueries: number;
  avgLatency: number;
  avgConfidence: number;
}

export interface DailyStats {
  date: string;
  query_count: number;
  avg_latency: number;
  avg_confidence: number;
}

export interface WorkflowAnalyticsResponse {
  analytics: WorkflowAnalytics;
  dailyStats: DailyStats[];
}

export interface SystemMetrics {
  id: string;
  date: string;
  totalQueries: number;
  activeUsers: number;
  activeWorkflows: number;
  avgSystemLatency: number;
  errorRate: number;
  createdAt: string;
}

// ===================================
// WORKFLOW API RESPONSE TYPES
// ===================================

export interface WorkflowListResponse {
  workflows: Workflow[];
}

export interface WorkflowGetResponse {
  workflow: Workflow;
}

export interface WorkflowCreateResponse {
  workflow: Workflow;
  message: string;
}

export interface WorkflowUpdateResponse {
  message: string;
  workflow?: Workflow;
}

export interface WorkflowDeleteResponse {
  message: string;
}

// ===================================
// HEALTH CHECK
// ===================================

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime?: number;
  database?: 'connected' | 'disconnected';
  redis?: 'connected' | 'disconnected';
}

// ===================================
// FILE UPLOAD (if needed in future)
// ===================================

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// ===================================
// RATE LIMIT INFO
// ===================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// ===================================
// WEBSOCKET MESSAGES (if using real-time)
// ===================================

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface QueryProgressMessage {
  type: 'query_progress';
  payload: {
    workflowId: string;
    queryId: string;
    step: string;
    progress: number;
    message: string;
  };
}

// ===================================
// EXPORT/IMPORT TYPES
// ===================================

export interface WorkflowExport {
  workflow: Workflow;
  exportedAt: string;
  version: string;
}

export interface WorkflowImport {
  name: string;
  description?: string;
  configuration: any;
}

// ===================================
// BATCH OPERATIONS
// ===================================

export interface BatchQueryRequest {
  workflowId: string;
  queries: string[];
}

export interface BatchQueryResponse {
  results: QueryResponse[];
  successCount: number;
  failureCount: number;
  totalLatency: number;
}
