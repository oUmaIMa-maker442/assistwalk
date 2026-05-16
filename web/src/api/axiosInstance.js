import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081',   // à ajuster selon ton environnement
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT dans les headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les réponses 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;