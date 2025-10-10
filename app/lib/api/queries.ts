import { apiClient } from './client';
// @ts-ignore
import { QueryRequest, QueryResponse, QueryLog } from '@/backend/src/types/workflow.types';

export const queriesApi = {
  execute: async (request: QueryRequest): Promise<QueryResponse> => {
    return apiClient.post('/api/query', request);
  },

  getHistory: async (params?: {
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: QueryLog[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.workflowId) queryParams.append('workflowId', params.workflowId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return apiClient.get(`/api/query/history?${queryParams.toString()}`);
  },
};
