export const GOOGLE_MAPS_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';
export const BASE_URL = 'https://dhobi-api.bizz-manager.com/public';
export const API_BASE_URL = `${BASE_URL}/api/v1`;
export const ADMIN_BASE_URL = 'https://dhobi-admin.bizz-manager.com';

/**
 * Resolve relative or old image/media URLs to reachable backend or CDN URLs
 */
export const resolveImageUrl = (path?: string | null): string => {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  // If pointing to localhost, local IP or old dev ports, rewrite to BASE_URL
  if (
    trimmed.includes('192.168.') ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1')
  ) {
    return trimmed.replace(
      /^https?:\/\/[^/]+(\/dhobi_backend\/public)?/,
      BASE_URL
    );
  }

  // If pointing to previous local subdirectories
  if (trimmed.includes('/dhobi_backend/public')) {
    return trimmed.replace(/^https?:\/\/[^/]+\/dhobi_backend\/public/, BASE_URL);
  }

  // If already a full http:// or https:// external URL (e.g. unsplash, mixkit, or remote host)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Banners uploaded via Admin Web Panel are hosted on ADMIN_BASE_URL
  if (cleanPath.startsWith('/uploads/banners/')) {
    return `${ADMIN_BASE_URL}${cleanPath}`;
  }

  return `${BASE_URL}${cleanPath}`;
};

