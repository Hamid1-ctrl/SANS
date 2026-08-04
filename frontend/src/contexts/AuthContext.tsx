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
  signInWithPopup,
  sendPasswordResetEmail
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
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auth) {
      const checkLocalToken = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const response = await api.get<User>('/auth/me');
            setUser(response.data);
          } catch (err) {
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      };
      checkLocalToken();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Do not auto-login if user is currently on the registration page
      if (window.location.pathname.startsWith('/register')) {
        setIsLoading(false);
        return;
      }

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
          
          await logout();
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
    if (auth) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        } catch (firebaseError: any) {
          // Self-healing provisioning for default seed accounts on Firebase Auth
          const seedEmails = [
            'admin.sans@sans.edu', 
            'student.sans@sans.edu', 
            'lecturer.sans@sans.edu', 
            'rep.sans@sans.edu'
          ];
          if (seedEmails.includes(credentials.email.toLowerCase()) && credentials.password === 'password') {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
            } catch (createErr) {
              throw firebaseError;
            }
          } else {
            throw firebaseError;
          }
        }

        if (userCredential) {
          const token = await userCredential.user.getIdToken(false);
          localStorage.setItem('accessToken', token);
          const response = await api.get<User>('/auth/me');
          setUser(response.data);
          return;
        }
      } catch (fbError: any) {
        console.warn("Firebase authentication bypassed/failed, attempting direct SANS API login fallback...", fbError);
      }
    }

    // Fallback to direct ASP.NET Core database authentication
    const response = await api.post<{ accessToken?: string; token?: string; user: User }>('/auth/login', credentials);
    const token = response.data.accessToken || response.data.token;
    if (token) {
      localStorage.setItem('accessToken', token);
    }
    setUser(response.data.user || response.data);
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    if (!auth) {
      // Direct backend API registration fallback
      await api.post('/auth/register', data);
      return;
    }

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
    if (!auth) {
      throw new Error('Google Sign-In requires Firebase environment variables to be set in Vercel. Please check your VITE_FIREBASE_API_KEY settings.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
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

  const resetPassword = async (email: string): Promise<void> => {
    if (!auth) {
      throw new Error('Password reset requires Firebase to be configured.');
    }
    await sendPasswordResetEmail(auth, email.trim());
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    registerWithGoogle,
    resetPassword,
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
