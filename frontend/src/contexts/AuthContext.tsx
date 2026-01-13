import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'director' | 'viewer' | 'team_leader';
  is_active: number;
  created_at: string;
  last_login: string | null;
  azure_team_leader_id?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount if token exists
  useEffect(() => {
    if (accessToken) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (shouldRetry: boolean = true) => {
    try {
      const response = await apiClient.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      // Token might be expired, try to refresh (but only if shouldRetry is true to prevent loops)
      if (shouldRetry) {
        await refreshAuth();
      } else {
        // If we're already in a retry, just logout
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user: userData } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await apiClient.post('/api/auth/logout', null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token } = response.data;

      localStorage.setItem('accessToken', access_token);
      setAccessToken(access_token);

      // Fetch user with new token, but don't retry if this fails (prevents infinite loop)
      await fetchCurrentUser(false);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
