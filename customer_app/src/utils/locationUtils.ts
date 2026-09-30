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
    // 1. Fast Network / Cell / Wi-Fi location first (instant on Android)
    Geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        // 2. Fallback to High Accuracy GPS if network positioning is unavailable
        Geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => {
            // 3. Fallback to default Wakad, Pune coordinates if device has no location available
            resolve({ latitude: 18.5980, longitude: 73.7680 });
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
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
      const result = json.results[0];
      let city = '';
      let pincode = '';
      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          pincode = component.long_name;
        }
      }
      return {
        address_line1: result.formatted_address,
        city,
        pincode,
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
      const city = address.city || address.town || address.village || address.county || address.state_district || '';
      const pincode = address.postcode || '';

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
