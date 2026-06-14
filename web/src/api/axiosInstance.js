import axios from 'axios';
import { getToken, logout } from '../utils/auth';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;
