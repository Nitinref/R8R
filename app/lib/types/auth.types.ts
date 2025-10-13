export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  isActive: boolean;
  // Add these properties if they're missing:
  canRead?: boolean;    // Make optional if not always present
  canWrite?: boolean;   // Make optional if not always present
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiKeyCreateResponse {
  apiKey: string;
  name: string;
  createdAt: string;
  message: string;
}

export interface ApiKeyListResponse {
  apiKeys: ApiKey[];
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
}