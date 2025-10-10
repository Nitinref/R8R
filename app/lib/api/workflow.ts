import { apiClient } from './client';
import { Workflow, WorkflowConfig } from '../types/workflow.types';

export const workflowsApi = {
  list: async (): Promise<{ workflows: Workflow[] }> => {
    return apiClient.get('/api/workflows');
  },

  get: async (workflowId: string): Promise<{ workflow: Workflow }> => {
    return apiClient.get(`/api/workflows/${workflowId}`);
  },

  create: async (data: {
    name: string;
    description?: string;
    configuration: WorkflowConfig;
  }): Promise<{ workflow: Workflow; message: string }> => {
    return apiClient.post('/api/workflows', data);
  },

  update: async (
    workflowId: string,
    data: Partial<{
      name: string;
      description?: string;
      configuration: WorkflowConfig;
      status: 'draft' | 'active' | 'archived';
    }>
  ): Promise<{ message: string }> => {
    return apiClient.put(`/api/workflows/${workflowId}`, data);
  },

  delete: async (workflowId: string): Promise<{ message: string }> => {
    return apiClient.delete(`/api/workflows/${workflowId}`);
  },
};