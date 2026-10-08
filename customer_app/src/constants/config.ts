export const GOOGLE_MAPS_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';
export const BASE_URL = 'https://dhobi-api.bizz-manager.com/public';
export const API_BASE_URL = `${BASE_URL}/api/v1`;
export const ADMIN_BASE_URL = 'https://dhobi-admin.bizz-manager.com';

export const LOCAL_ADMIN_URL = 'http://192.168.1.21:8080';

/**
 * Resolve relative or old image/media URLs to reachable backend or local admin URLs
 */
export const resolveImageUrl = (path?: string | null): string => {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  // If already a full http:// or https:// URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If pointing to localhost:8080 on developer machine, resolve to LAN IP for devices
    if (trimmed.includes('localhost:8080') || trimmed.includes('127.0.0.1:8080')) {
      return trimmed.replace(/http:\/\/(localhost|127\.0\.0\.1):8080/, LOCAL_ADMIN_URL);
    }
    if (trimmed.includes('/dhobi_backend/public')) {
      return trimmed.replace(/^https?:\/\/[^/]+\/dhobi_backend\/public/, BASE_URL);
    }
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  
  if (cleanPath.startsWith('/uploads/')) {
    return `${LOCAL_ADMIN_URL}${cleanPath}`;
  }
  
  return `${BASE_URL}${cleanPath}`;
};
