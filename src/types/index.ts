export interface AuthCredentials {
  username: string;
  password: string;
}
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  username: string;
  roles: string[];
}

export interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  user: User | null;
}

export interface TokenPayload {
  username: string;
  roles: string[];
  exp: number;
  iat?: number;
}

// API Response types
export interface OasisProject {
  id: string;
  name: string;
  // Add other project properties as needed
}

export interface DocumentData {
  mrn: string;
  // Add other document properties as needed
}

export interface OasisResult {
  mrn: string;
  // Add other result properties as needed
}

// API Error response
export interface ApiError {
  message: string;
  status: number;
  timestamp?: string;
}
