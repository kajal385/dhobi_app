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

  // If already a full http:// or https:// external URL (e.g. unsplash, mixkit, or remote host)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it was pointed to dhobi-api for admin uploads, rewrite to ADMIN_BASE_URL
    if (
      trimmed.includes('dhobi-api.bizz-manager.com') &&
      (trimmed.includes('/uploads/documents/') || trimmed.includes('/uploads/shop-media/') || trimmed.includes('/uploads/banners/') || trimmed.includes('/uploads/laundries/') || trimmed.includes('/uploads/shops/'))
    ) {
      const p = trimmed.substring(trimmed.indexOf('/uploads/'));
      return `${ADMIN_BASE_URL}${p}`;
    }
    return trimmed;
  }

  // If pointing to localhost, local IP or old dev ports, rewrite to reachable URL
  if (
    trimmed.includes('192.168.') ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1')
  ) {
    const clean = trimmed.replace(/^https?:\/\/[^/]+(\/dhobi_backend\/public)?/, '');
    const p = clean.startsWith('/') ? clean : `/${clean}`;
    if (
      p.startsWith('/uploads/documents/') ||
      p.startsWith('/uploads/shop-media/') ||
      p.startsWith('/uploads/banners/') ||
      p.startsWith('/uploads/laundries/') ||
      p.startsWith('/uploads/shops/')
    ) {
      return `${ADMIN_BASE_URL}${p}`;
    }
    return `${BASE_URL}${p}`;
  }

  // If pointing to previous local subdirectories
  if (trimmed.includes('/dhobi_backend/public')) {
    const clean = trimmed.replace(/^https?:\/\/[^/]+\/dhobi_backend\/public/, '');
    const p = clean.startsWith('/') ? clean : `/${clean}`;
    return `${BASE_URL}${p}`;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Shop covers, logos, inside photos, and banners uploaded via Admin Web Panel
  if (
    cleanPath.startsWith('/uploads/documents/') ||
    cleanPath.startsWith('/uploads/shop-media/') ||
    cleanPath.startsWith('/uploads/laundries/') ||
    cleanPath.startsWith('/uploads/shops/')
  ) {
    return `${ADMIN_BASE_URL}${cleanPath}`;
  }

  // Banners are hosted on the backend public storage or locally synced
  if (cleanPath.startsWith('/uploads/banners/')) {
    return `${BASE_URL}${cleanPath}`;
  }

  return `${BASE_URL}${cleanPath}`;
};

