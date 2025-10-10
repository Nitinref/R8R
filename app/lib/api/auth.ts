import { apiClient } from './client';
import { 
  AuthResponse, 
  LoginCredentials, 
  SignupCredentials,
  ApiKey,
  User 
} from '../types/auth.types';

export const authApi = {
  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/api/auth/register', credentials);
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/api/auth/login', credentials);
  },

  createApiKey: async (name: string): Promise<{ apiKey: string; name: string }> => {
    return apiClient.post('/api/auth/api-keys', { name });
  },

  listApiKeys: async (): Promise<{ apiKeys: ApiKey[] }> => {
    return apiClient.get('/api/auth/api-keys');
  },

  deleteApiKey: async (keyId: string): Promise<{ message: string }> => {
    return apiClient.delete(`/api/auth/api-keys/${keyId}`);
  },
};