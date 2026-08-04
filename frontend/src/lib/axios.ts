import axios from 'axios';
import { auth } from './firebase';

let rawUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5018/api').trim();
if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = 'https://' + rawUrl;
}
// Strip any trailing slashes
rawUrl = rawUrl.replace(/\/+$/, '');
// Ensure URL ends with /api
if (!rawUrl.endsWith('/api')) {
  rawUrl = rawUrl + '/api';
}
const API_BASE_URL = rawUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const isPublicEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register') || config.url?.includes('/system/public-stats');
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
