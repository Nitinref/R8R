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

  createApiKey: async (name: string): Promise<{ apiKey: string }> => {
    console.log('🔄 Creating API key with name:', name);
    try {
      const result = await apiClient.post<{ apiKey: string }>('/api/auth/api-keys', { name });
      console.log('✅ API key creation successful:', result);
      return result;
    } catch (error) {
      console.error('❌ API key creation failed:', error);
      throw error;
    }
  },

  listApiKeys: async (): Promise<{ apiKeys: ApiKey[] }> => {
    console.log('🔄 Listing API keys...');
    try {
      const result = await apiClient.get<{ apiKeys: ApiKey[] }>('/api/auth/api-keys');
      console.log('✅ API keys loaded:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to load API keys:', error);
      throw error;
    }
  },

  deleteApiKey: async (keyId: string): Promise<{ message: string }> => {
    console.log('🔄 Deleting API key:', keyId);
    try {
      const result = await apiClient.delete<{ message: string }>(`/api/auth/api-keys/${keyId}`);
      console.log('✅ API key deleted:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to delete API key:', error);
      throw error;
    }
  },
};