import axios from 'axios';

// Default to deployed Render URL if not set in local env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vaultoran-1.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trustvault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle instant session revocation (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and trigger event for AuthContext
      const isAuthRoute = error.config.url.includes('/api/auth/login') || error.config.url.includes('/api/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('trustvault_token');
        localStorage.removeItem('trustvault_user');
        window.dispatchEvent(new CustomEvent('trustvault_session_revoked', {
          detail: error.response.data?.error || 'Session revoked or expired. Please log in again.'
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
