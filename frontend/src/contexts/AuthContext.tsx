import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  sendPasswordResetEmail,
  getAdditionalUserInfo
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

  // This flag blocks onAuthStateChanged from auto-logging in users when we are
  // explicitly managing the auth state ourselves (e.g. during Google sign-in popup).
  // Without this flag, Firebase fires onAuthStateChanged the instant signInWithPopup
  // resolves, which races with loginWithGoogle's isNewUser check.
  const skipNextAuthStateChange = useRef(false);

  useEffect(() => {
    if (!auth) {
      // No Firebase - check for local JWT token only
      const checkLocalToken = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const response = await api.get<User>('/auth/me');
            setUser(response.data);
          } catch {
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
      // Skip this event if we're in the middle of a manual Google sign-in flow.
      // loginWithGoogle sets this flag before calling signInWithPopup and
      // clears it after it has finished making its own decisions.
      if (skipNextAuthStateChange.current) {
        skipNextAuthStateChange.current = false;
        setIsLoading(false);
        return;
      }

      // Do not auto-login while user is on the registration page
      if (window.location.pathname.startsWith('/register')) {
        setIsLoading(false);
        return;
      }

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(false);
          localStorage.setItem('accessToken', token);

          // Fetch SANS user profile from Cloudflare D1
          const response = await api.get<User>('/auth/me');
          setUser(response.data);
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 404) {
            // Firebase session exists but no D1 record - user hasn't registered yet.
            // Sign out Firebase so they are not in a half-authenticated state.
            console.warn('Firebase session active but no D1 profile found. Signing out.');
            await signOut(auth);
            localStorage.removeItem('accessToken');
            setUser(null);
          } else {
            console.error('Failed to fetch user profile:', error);
            setUser(null);
          }
        }
      } else {
        localStorage.removeItem('accessToken');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    if (auth) {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const token = await userCredential.user.getIdToken(false);
      localStorage.setItem('accessToken', token);
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
      return;
    }

    // Fallback: no Firebase configured - hit backend login directly
    const response = await api.post<{ accessToken?: string; token?: string; user: User }>('/auth/login', credentials);
    const token = response.data.accessToken || response.data.token;
    if (token) localStorage.setItem('accessToken', token);
    setUser(response.data.user || (response.data as any));
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    if (!auth) {
      await api.post('/auth/register', data);
      return;
    }

    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

    try {
      // 2. Register in SANS backend (Cloudflare D1)
      await api.post('/auth/register', {
        ...data,
        firebaseUid: userCredential.user.uid
      });
    } catch (error) {
      // Roll back Firebase if backend fails
      await userCredential.user.delete();
      throw error;
    } finally {
      // Always sign out so user must explicitly log in
      await signOut(auth);
    }
  };

  const loginWithGoogle = async (): Promise<{ isNewUser: boolean; email?: string; firstName?: string; lastName?: string; firebaseUid?: string }> => {
    if (!auth) {
      throw new Error('Google Sign-In requires Firebase to be configured.');
    }

    // CRITICAL: Set this flag BEFORE calling signInWithPopup.
    // Firebase will fire onAuthStateChanged as soon as the popup resolves.
    // We must ignore that event and handle the result ourselves below.
    skipNextAuthStateChange.current = true;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, provider);
    } catch (popupError) {
      // If popup fails or is cancelled, clear the flag
      skipNextAuthStateChange.current = false;
      throw popupError;
    }

    // Check whether this is a BRAND NEW Firebase account
    const additionalInfo = getAdditionalUserInfo(userCredential);
    const isFirebaseNewUser = additionalInfo?.isNewUser ?? false;

    const firebaseUser = userCredential.user;

    if (isFirebaseNewUser) {
      // New Firebase account → must complete SANS registration first.
      // Sign out so they are not in a half-authenticated state.
      await signOut(auth);
      localStorage.removeItem('accessToken');
      setUser(null);

      const nameParts = firebaseUser.displayName?.split(' ') || [];
      return {
        isNewUser: true,
        email: firebaseUser.email || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        firebaseUid: firebaseUser.uid
      };
    }

    // Existing Firebase account → try to fetch D1 profile
    try {
      const token = await firebaseUser.getIdToken(false);
      localStorage.setItem('accessToken', token);

      const response = await api.get<User>('/auth/me');
      setUser(response.data);
      return { isNewUser: false };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 404) {
        // Firebase account exists but no D1 record.
        // User previously deleted and re-authenticating — treat as new user needing registration.
        await signOut(auth);
        localStorage.removeItem('accessToken');
        setUser(null);

        const nameParts = firebaseUser.displayName?.split(' ') || [];
        return {
          isNewUser: true,
          email: firebaseUser.email || '',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          firebaseUid: firebaseUser.uid
        };
      }
      throw error;
    }
  };

  const registerWithGoogle = async (data: Omit<RegisterRequest, 'password'> & { firebaseUid: string }): Promise<void> => {
    // Re-authenticate with Firebase so we have a valid token to send with registration
    await api.post('/auth/register', {
      ...data,
      password: ''
    });

    // Sign out so user must explicitly log in after registration
    await signOut(auth);
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    localStorage.removeItem('accessToken');
    setUser(null);
    queryClient.clear();
  };

  const refreshUser = async () => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
    } catch {
      await logout();
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!auth) throw new Error('Password reset requires Firebase to be configured.');
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
