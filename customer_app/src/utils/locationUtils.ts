import { PermissionsAndroid, Platform } from 'react-native';

// ✅ Use React Native's built-in Geolocation (works with RN 0.86 New Architecture)
// No need for react-native-geolocation-service which crashes on New Arch
import Geolocation from '@react-native-community/geolocation';

export interface GeocodedAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  pincode: string;
  label: string;
  latitude: number;
  longitude: number;
}

/** Request Android fine & coarse location permission */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
      granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

/** Get the device's current GPS coordinates fast and accurately */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    // 1. High Accuracy GPS first with zero stale cache to pinpoint exact device GPS coordinates
    Geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        console.warn('High accuracy GPS error, trying fallback:', err);
        // 2. Fallback to network/cell location if high-accuracy GPS is slow/unavailable
        Geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => {
            // 3. Fallback to default Wakad, Pune coordinates if device location is completely disabled
            resolve({ latitude: 18.5980, longitude: 73.7680 });
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress> {
  const GOOGLE_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';
  const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Try Google Maps Geocoding first
    const response = await fetch(googleUrl, { signal: controller.signal });
    const json = await response.json();

    if (json.status === 'OK' && json.results && json.results.length > 0) {
      clearTimeout(timeoutId);
      let city = '';
      let pincode = '';
      
      // Comprehensive check across all returned results for postal_code and city
      for (const res of json.results) {
        for (const component of res.address_components || []) {
          if (!city && (component.types.includes('locality') || component.types.includes('sublocality_level_1') || component.types.includes('administrative_area_level_2'))) {
            city = component.long_name;
          }
          if (!pincode && component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }
      }

      const primaryResult = json.results[0];
      return {
        address_line1: primaryResult.formatted_address,
        city: city || 'Pune',
        pincode: pincode || '411057',
        label: 'Selected Location',
        latitude,
        longitude,
      };
    }
    
    // If Google fails (e.g. API key lacks permissions), throw error to trigger Nominatim fallback
    throw new Error('Google Maps Geocoding failed');
  } catch (err) {
    // Fallback to Nominatim (OpenStreetMap)
    try {
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'DhobiApp/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await response.json();

      if (json.error || !json.display_name) {
        throw new Error('Nominatim also failed');
      }

      const { address } = json;
      const city = address.city || address.town || address.village || address.suburb || address.county || address.state_district || 'Pune';
      const pincode = address.postcode || address.postal_code || '411057';

      return {
        address_line1: json.display_name,
        city,
        pincode,
        label: 'Selected Location',
        latitude,
        longitude,
      };
    } catch (fallbackErr: any) {
      clearTimeout(timeoutId);
      throw new Error('Could not resolve address for your location.');
    }
  }
}

/** Calculate distance and travel time from customer coordinates to shop location */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  const mins = Math.round(d * 8);
  const distStr = d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  return `${distStr} away (${mins > 0 ? mins : 5} mins)`;
}
