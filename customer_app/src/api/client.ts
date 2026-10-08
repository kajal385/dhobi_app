import axios from 'axios';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { API_BASE_URL } from '../constants/config';

let _mmkvInstance: any = null;
const _memoryStorage = new Map<string, any>();

function getMMKV() {
  if (!_mmkvInstance) {
    try {
      _mmkvInstance = createMMKV();
    } catch (e) {
      // Nitro not ready yet
    }
  }
  return _mmkvInstance;
}

const storage = {
  getString: (key: string): string | undefined => {
    try {
      const instance = getMMKV();
      if (instance) return instance.getString(key);
    } catch (e) {}
    return _memoryStorage.get(key);
  },
  set: (key: string, value: any): void => {
    _memoryStorage.set(key, value);
    try {
      const instance = getMMKV();
      if (instance) instance.set(key, value);
    } catch (e) {}
  },
  delete: (key: string): void => {
    _memoryStorage.delete(key);
    try {
      const instance = getMMKV();
      if (instance) {
        if (typeof instance.delete === 'function') instance.delete(key);
        else if (typeof instance.remove === 'function') instance.remove(key);
      }
    } catch (e) {}
  },
  remove: (key: string): void => {
    _memoryStorage.delete(key);
    try {
      const instance = getMMKV();
      if (instance) {
        if (typeof instance.delete === 'function') instance.delete(key);
        else if (typeof instance.remove === 'function') instance.remove(key);
      }
    } catch (e) {}
  },
  contains: (key: string): boolean => {
    try {
      const instance = getMMKV();
      if (instance) return instance.contains(key);
    } catch (e) {}
    return _memoryStorage.has(key);
  },
  clearAll: (): void => {
    _memoryStorage.clear();
    try {
      const instance = getMMKV();
      if (instance) instance.clearAll();
    } catch (e) {}
  },
};

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
        if (typeof (storage as any).delete === 'function') (storage as any).delete('auth_token');
        if (typeof storage.remove === 'function') storage.remove('auth_token');
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
