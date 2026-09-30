import axios from 'axios';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { API_BASE_URL } from '../constants/config';

const storage = createMMKV();

// Base URL for Laravel Backend
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor to attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getString('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// Interceptor to handle global errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        storage.remove('auth_token');
      } catch (e) {
        // fallback
      }
      // Dispatch redirect to login here if navigation is integrated
    }
    return Promise.reject(error);
  }
);
export default apiClient;
export { storage };
