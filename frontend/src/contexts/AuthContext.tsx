import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';
import api from '../lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginWithGoogle: () => Promise<{ isNewUser: boolean; email?: string; firstName?: string; lastName?: string; firebaseUid?: string }>;
  registerWithGoogle: (data: Omit<RegisterRequest, 'password'> & { firebaseUid: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Use cached token (handles automatic expiry/refresh in background)
          const token = await firebaseUser.getIdToken(false);
          localStorage.setItem('accessToken', token);
          
          // Fetch SANS user profile
          const response = await api.get<User>('/auth/me');
          setUser(response.data);
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 404) {
            console.warn("No SANS database profile matching Firebase UID found.");
          }
          
          const isRegistering = window.location.pathname.startsWith('/register');
          if (!isRegistering) {
            await logout();
          } else {
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        localStorage.removeItem('accessToken');
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    } catch (firebaseError: any) {
      // Self-healing provisioning for default seed administrator on Firebase Auth
      if (credentials.email.toLowerCase() === 'admin.sans@sans.edu' && credentials.password === 'password') {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
        } catch (createErr) {
          throw firebaseError;
        }
      } else {
        throw firebaseError;
      }
    }
    
    // Use the newly issued token
    const token = await userCredential.user.getIdToken(false);
    localStorage.setItem('accessToken', token);
    
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 404) {
        try {
          await userCredential.user.delete();
        } catch (delErr) {
          console.error("Failed to delete orphaned user during login:", delErr);
        }
      }
      throw error;
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    // 1. Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    
    try {
      // 2. Register the user in SANS backend, passing the firebaseUid
      await api.post('/auth/register', {
        ...data,
        firebaseUid: userCredential.user.uid
      });
    } catch (error) {
      // If backend registration fails, clean up Firebase user
      await userCredential.user.delete();
      throw error;
    } finally {
      // 3. Sign out since SANS register does not auto-login
      await signOut(auth);
    }
  };

  const loginWithGoogle = async (): Promise<{ isNewUser: boolean; email?: string; firstName?: string; lastName?: string; firebaseUid?: string }> => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;
    
    const token = await firebaseUser.getIdToken(false);
    localStorage.setItem('accessToken', token);
    
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
      return { isNewUser: false };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 404) {
        const nameParts = firebaseUser.displayName?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        return {
          isNewUser: true,
          email: firebaseUser.email || '',
          firstName,
          lastName,
          firebaseUid: firebaseUser.uid
        };
      }
      throw error;
    }
  };

  const registerWithGoogle = async (data: Omit<RegisterRequest, 'password'> & { firebaseUid: string }): Promise<void> => {
    await api.post('/auth/register', {
      ...data,
      password: '' // Allowed blank password for Google SSO in backend
    });
    
    const meResponse = await api.get<User>('/auth/me');
    setUser(meResponse.data);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('accessToken');
    setUser(null);
    queryClient.clear();
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch (error) {
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    registerWithGoogle,
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
