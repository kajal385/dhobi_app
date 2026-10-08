import axios from 'axios';
import { storage } from '../api/client'; // using existing storage for token
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = storage.getString('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      if (typeof (storage as any).delete === 'function') (storage as any).delete('auth_token');
      if (typeof storage.remove === 'function') storage.remove('auth_token');
    } catch (e) { }
    return Promise.reject(error);
  }
);

export default api;
