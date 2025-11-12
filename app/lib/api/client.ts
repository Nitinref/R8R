// @ts-ignore
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { authStorage } from '../utils/auth';

// Instead of localhost
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      // @ts-ignore
      (config) => {
        const token = authStorage.getToken();
        console.log('🔑 Token from authStorage:', token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
            // @ts-ignore
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
            // @ts-ignore
      (response) => response,
            // @ts-ignore
      (error) => {
        console.error('API Error:', error.response?.status, error.config?.url);
        if (error.response?.status === 401) {
          authStorage.clear();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();