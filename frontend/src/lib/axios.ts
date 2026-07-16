import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5018/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const isPublicEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Automatically delete Content-Type for FormData uploads to let the browser generate the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Force Firebase to refresh the ID token
          const freshToken = await currentUser.getIdToken(true);
          localStorage.setItem('accessToken', freshToken);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Firebase token force-refresh failed:", refreshError);
        }
      }

      // If token refresh fails, sign out and clean up
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
