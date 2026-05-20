import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Auto-attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});
export const register = (data) => API.post('/auth/register', data);

// OTP
export const sendOTP = (data) => API.post('/otp/send', data);
export const verifyOTP = (data) => API.post('/otp/verify', data);
export const resendOTP = (data) => API.post('/otp/resend', data);


// Scripts
export const generateScript = (data) => API.post('/scripts/generate', data);
export const getHistory = (params) => API.get('/scripts/history', { params });
export const toggleFavorite = (id) => API.post(`/scripts/${id}/favorite`);
export const getFavorites = () => API.get('/scripts/favorites');
export const deleteScript = (id) => API.delete(`/scripts/${id}`);

// User
export const getMe = () => API.get('/users/me');
export const updateMe = (data) => API.put('/users/me', data);
export const getMyStats = () => API.get('/users/me/stats');

// Admin
export const getTemplates = () => API.get('/admin/templates');
export const createTemplate = (data) => API.post('/admin/templates', data);
export const updateTemplate = (id, data) => API.put(`/admin/templates/${id}`, data);
export const deleteTemplate = (id) => API.delete(`/admin/templates/${id}`);
export const getAdminStats = () => API.get('/admin/stats');

// Video Studio
export const generateVideo = (data) => API.post('/video/generate', data);
export const getVideoStatus = (jobId) => API.get(`/video/status/${jobId}`);
export const getVideoHistory = () => API.get('/video/history');
export const getVideoDownloadUrl = (jobId) => `/api/video/download/${jobId}`;

export default API;
