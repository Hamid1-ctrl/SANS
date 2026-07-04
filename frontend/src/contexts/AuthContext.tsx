import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import api from '../lib/axios';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const registry = JSON.parse(localStorage.getItem('mockUsersRegistry') || '[]');
    
    const defaultUsers = [
      {
        id: 'mock-id-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'student.sans@sans.edu',
        phoneNumber: '+1 (555) 234-5678',
        studentId: 'STU102435',
        role: 0,
        isActive: true,
        password: 'password',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-id-456',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'lecturer.sans@sans.edu',
        phoneNumber: '+1 (555) 345-6789',
        studentId: 'LECT402',
        role: 1,
        isActive: true,
        password: 'password',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-id-789',
        firstName: 'Arthur',
        lastName: 'Dent',
        email: 'rep.sans@sans.edu',
        phoneNumber: '+1 (555) 456-7890',
        studentId: 'REP102435',
        role: 2,
        isActive: true,
        password: 'password',
        createdAt: new Date().toISOString()
      }
    ];

    let registryChanged = false;
    defaultUsers.forEach(defUser => {
      const existingIdx = registry.findIndex((u: any) => u.email.toLowerCase() === defUser.email.toLowerCase());
      if (existingIdx === -1) {
        registry.push(defUser);
        registryChanged = true;
      } else if (!registry[existingIdx].password) {
        registry[existingIdx] = defUser;
        registryChanged = true;
      }
    });

    if (registryChanged) {
      localStorage.setItem('mockUsersRegistry', JSON.stringify(registry));
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshUser();
    } else {
      setMockUser();
    }
  }, []);

  const setMockUser = () => {
    const activeEmail = localStorage.getItem('mockActiveEmail');
    let registeredUser: User | null = null;
    
    if (activeEmail) {
      const registry = JSON.parse(localStorage.getItem('mockUsersRegistry') || '[]');
      registeredUser = registry.find((u: User) => u.email.toLowerCase() === activeEmail.toLowerCase()) || null;
    }

    const mockUser: User = registeredUser || {
      id: 'mock-id-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'student.sans@sans.edu',
      phoneNumber: '+1 (555) 234-5678',
      studentId: 'STU102435',
      role: 0, // Student
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setUser(mockUser);
    setIsLoading(false);
  };

  const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      const { accessToken, refreshToken, user: userData } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      
      return response.data;
    } catch (error) {
      console.warn('API error bypassed. Using mock user for prototype simulation:', error);
      
      const registry = JSON.parse(localStorage.getItem('mockUsersRegistry') || '[]');
      const registeredUser = registry.find((u: any) => u.email.toLowerCase() === credentials.email.toLowerCase());

      if (!registeredUser) {
        throw new Error('Account not found. Please verify your email.');
      }

      if (registeredUser.password && registeredUser.password !== credentials.password) {
        throw new Error('Invalid email or password.');
      }

      // Convert back to base User without the password field
      const { password, ...mockUser } = registeredUser;
      
      setUser(mockUser as User);
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('mockActiveEmail', mockUser.email);
      return {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser as User
      };
    }
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      const { accessToken, refreshToken, user: userData } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(userData);
      
      return response.data;
    } catch (error) {
      console.warn('API error bypassed. Using mock user for prototype simulation:', error);
      const mockUser: User = {
        id: `mock-id-${Math.random().toString(36).substr(2, 9)}`,
        firstName: data.firstName || 'John',
        lastName: data.lastName || 'Doe',
        email: data.email || 'student.sans@sans.edu',
        phoneNumber: data.phoneNumber || '+1 (555) 234-5678',
        studentId: data.studentId || 'STU102435',
        role: data.role,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      // Save this user with password to the local registry so we can load their role on login / refresh
      const registry = JSON.parse(localStorage.getItem('mockUsersRegistry') || '[]');
      const existingIdx = registry.findIndex((u: any) => u.email.toLowerCase() === mockUser.email.toLowerCase());
      if (existingIdx === -1) {
        registry.push({
          ...mockUser,
          password: data.password
        });
        localStorage.setItem('mockUsersRegistry', JSON.stringify(registry));
      } else {
        registry[existingIdx] = {
          ...registry[existingIdx],
          ...mockUser,
          password: data.password
        };
        localStorage.setItem('mockUsersRegistry', JSON.stringify(registry));
      }
      
      setUser(mockUser);
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('mockActiveEmail', mockUser.email);
      return {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('mockActiveEmail');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.warn('Auth refresh error. Bypassing and keeping mock user active for prototype.');
      setMockUser();
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
