export const GOOGLE_MAPS_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';
export const BASE_URL = 'http://192.168.1.15:8000';
export const API_BASE_URL = `${BASE_URL}/api/v1`;

/**
 * Resolve relative or old image URLs to full backend URLs
 */
export const resolveImageUrl = (path?: string | null): string => {
  if (!path) return '';
  const trimmed = String(path).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  // Replace old local/dev hosts if present
  if (trimmed.includes('127.0.0.1') || trimmed.includes('localhost') || trimmed.includes('192.168.')) {
    const cleaned = trimmed.replace(
      /^https?:\/\/[^/]+(\/dhobi_backend\/public)?/,
      BASE_URL
    );
    return cleaned;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${cleanPath}`;
};
