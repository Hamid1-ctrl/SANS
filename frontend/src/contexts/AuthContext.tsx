import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import api from '../lib/axios';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { accessToken, refreshToken, user: userData } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    // Register the user - no auto-login, redirect to login page instead
    await api.post<AuthResponse>('/auth/register', data);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch (error) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
