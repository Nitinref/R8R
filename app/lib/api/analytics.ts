import { apiClient } from './client';
import { DashboardStats } from '../types/api.types';

export const analyticsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    return apiClient.get('/api/analytics/dashboard');
  },

  getWorkflowAnalytics: async (workflowId: string): Promise<any> => {
    return apiClient.get(`/api/analytics/workflow/${workflowId}`);
  },
};
