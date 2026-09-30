import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
  Modal,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SIZES, SPACING } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { partnerService } from '../../services/partnerService';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, Region } from 'react-native-maps';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const CITIES_AND_AREAS: { [key: string]: string[] } = {
  'Pune': ['Kothrud', 'Baner', 'Viman Nagar', 'Wakad', 'Hinjewadi', 'Hadapsar', 'Kharadi', 'Aundh', 'Pimple Saudagar', 'FC Road'],
  'Mumbai': ['Andheri West', 'Bandra West', 'Juhu', 'Powai', 'Dadar', 'Thane West', 'Navi Mumbai', 'Borivali', 'Goregaon'],
  'Bengaluru': ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'JP Nagar', 'Electronic City', 'Marathahalli'],
  'Delhi NCR': ['Connaught Place', 'South Extension', 'Dwarka', 'Gurugram Sec 56', 'Noida Sec 62', 'Rohini'],
  'Hyderabad': ['Gachibowli', 'HITECH City', 'Jubilee Hills', 'Banjara Hills', 'Madhapur', 'Kukatpally'],
};

const HOUR_PRESETS = [
  { label: '08:00 AM - 09:00 PM', open: '08:00 AM', close: '09:00 PM' },
  { label: '07:00 AM - 10:00 PM', open: '07:00 AM', close: '10:00 PM' },
  { label: '09:00 AM - 08:00 PM', open: '09:00 AM', close: '08:00 PM' },
  { label: '24 Hours (Non-Stop)', open: '12:00 AM', close: '11:59 PM' },
];

const OPEN_TIMES = ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'];
const CLOSE_TIMES = ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'];
const DAYS_LIST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const RegistrationScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState('');
  const [submittedShopId, setSubmittedShopId] = useState<number | undefined>(undefined);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [isApprovedCelebration, setIsApprovedCelebration] = useState(false);

  // Step 1: Business Details & Location
  const [shopName, setShopName] = useState('');
  const [selectedCity, setSelectedCity] = useState('Pune');
  const [selectedArea, setSelectedArea] = useState('Kothrud');
  const [streetAddress, setStreetAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [gpsLocation, setGpsLocation] = useState('18.5204° N, 73.8567° E (Captured)');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  // Step 2: Personal Details
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Documents & Bank (Mandatory document photos)
  const [idProof, setIdProof] = useState('');
  const [idProofPhoto, setIdProofPhoto] = useState('');
  const [businessProof, setBusinessProof] = useState('');
  const [businessProofPhoto, setBusinessProofPhoto] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Step 4: Operations Config
  const [pickupRadius, setPickupRadius] = useState('5');
  const [openTime, setOpenTime] = useState('08:00 AM');
  const [closeTime, setCloseTime] = useState('09:00 PM');
  const [selectedOffDays, setSelectedOffDays] = useState<string[]>(['Sun']);
  const [isNoOff, setIsNoOff] = useState(false);
  const [showOpenTimePicker, setShowOpenTimePicker] = useState(false);
  const [showCloseTimePicker, setShowCloseTimePicker] = useState(false);

  // Step 5: Media Attachments (Mandatory Logo, Cover & Shop Photos)
  const [logoUri, setLogoUri] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [shopPhotosList, setShopPhotosList] = useState<string[]>([]);

  // Media Picker Selector Modal State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'ID_PROOF' | 'BUSINESS_PROOF' | 'LOGO' | 'COVER' | 'SHOP_PHOTO' | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open photo picker sheet
  const openMediaPickerOptions = (target: 'ID_PROOF' | 'BUSINESS_PROOF' | 'LOGO' | 'COVER' | 'SHOP_PHOTO') => {
    setPickerTarget(target);
    setPickerModalVisible(true);
  };

  const handlePickFromCamera = async () => {
    setPickerModalVisible(false);
    if (!pickerTarget) return;

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required 📷',
            message: 'Dhobi App requires camera access to capture document and shop photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          applyPickedImage(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
        } else if (asset.uri) {
          applyPickedImage(asset.uri);
        } else {
          applySampleFallbackImage();
        }
      } else {
        applySampleFallbackImage();
      }
    } catch {
      applySampleFallbackImage();
    }
  };

  const handlePickFromGallery = async () => {
    setPickerModalVisible(false);
    if (!pickerTarget) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          applyPickedImage(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
        } else if (asset.uri) {
          applyPickedImage(asset.uri);
        } else {
          applySampleFallbackImage();
        }
      } else {
        applySampleFallbackImage();
      }
    } catch {
      applySampleFallbackImage();
    }
  };

  const applyPickedImage = (uri: string) => {
    if (pickerTarget === 'ID_PROOF') setIdProofPhoto(uri);
    else if (pickerTarget === 'BUSINESS_PROOF') setBusinessProofPhoto(uri);
    else if (pickerTarget === 'LOGO') setLogoUri(uri);
    else if (pickerTarget === 'COVER') setCoverUri(uri);
    else if (pickerTarget === 'SHOP_PHOTO') setShopPhotosList(prev => [...prev, uri]);
    setPickerTarget(null);
  };

  const applySampleFallbackImage = () => {
    const sampleUrls: Record<string, string> = {
      ID_PROOF: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600',
      BUSINESS_PROOF: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
      LOGO: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=300',
      COVER: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800',
      SHOP_PHOTO: `https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&sig=${Date.now()}`,
    };
    if (pickerTarget && sampleUrls[pickerTarget]) {
      applyPickedImage(sampleUrls[pickerTarget]);
    }
  };

  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (!shopName.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter your Laundry Shop Name.');
        return false;
      }
      if (!selectedCity.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please select a City.');
        return false;
      }
      if (!selectedArea.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please select an Area / Locality.');
        return false;
      }
      if (!streetAddress.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter your Shop No, Building & Street Address.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!ownerName.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter the Owner Full Name.');
        return false;
      }
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length !== 10) {
        Alert.alert('Validation Error 📱', 'Mobile number must be exactly 10 digits.');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter a valid Email Address.');
        return false;
      }
      if (!password || password.length < 6) {
        Alert.alert('Password Required 🔑', 'Please create a password with at least 6 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch ❌', 'Password and Confirm Password do not match. Please re-enter.');
        return false;
      }
    }

    if (currentStep === 3) {
      if (!idProof.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter Identity Proof (Aadhaar / PAN) Number.');
        return false;
      }
      if (!idProofPhoto) {
        Alert.alert('Mandatory Document Photo 📄', 'Please take or upload a photo of your Aadhaar / Identity Proof document.');
        return false;
      }
      if (!businessProof.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter Business Proof (Shop License / Udyam) Number.');
        return false;
      }
      if (!businessProofPhoto) {
        Alert.alert('Mandatory Document Photo 📄', 'Please take or upload a photo of your Shop License / Business Proof document.');
        return false;
      }
      if (!bankAccount.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter Bank Account Number.');
        return false;
      }
      if (!ifscCode.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter Bank IFSC Code.');
        return false;
      }
    }

    if (currentStep === 4) {
      if (!pickupRadius.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please enter Pickup Radius in KM.');
        return false;
      }
      if (!openTime.trim() || !closeTime.trim()) {
        Alert.alert('Required Field Missing ⚠️', 'Please select shop Working Hours.');
        return false;
      }
      if (!isNoOff && selectedOffDays.length === 0) {
        Alert.alert('Required Field Missing ⚠️', 'Please select weekly off days or choose "Open 7 Days".');
        return false;
      }
    }

    if (currentStep === 5) {
      if (!logoUri) {
        Alert.alert('Mandatory Upload 📷', 'Please upload or take a photo of your Shop Logo.');
        return false;
      }
      if (!coverUri) {
        Alert.alert('Mandatory Upload 🖼️', 'Please upload or take a photo of your Shop Cover Image.');
        return false;
      }
      if (shopPhotosList.length === 0) {
        Alert.alert('Mandatory Upload 📸', 'Please upload at least 1 photo of your Shop premises.');
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        const res = await partnerService.registerShop({
          name: shopName,
          shop_name: shopName,
          owner_name: ownerName,
          phone: phone,
          email: email,
          password: password,
          city: selectedCity,
          address: `${streetAddress}, ${selectedArea}`,
          gst_number: gstNumber,
          bank_account: bankAccount,
          ifsc_code: ifscCode,
          pickup_radius_km: pickupRadius,
          working_hours: `${openTime} - ${closeTime}`,
          id_proof_number: idProof,
          id_proof_photo: idProofPhoto,
          business_proof_number: businessProof,
          business_proof_photo: businessProofPhoto,
          logo_url: logoUri,
          cover_url: coverUri,
          shop_photos: shopPhotosList,
          verification_status: 'pending',
        });
        if (res && res.success !== false) {
          setSubmittedPhone(phone);
          if (res?.data?.id) {
            setSubmittedShopId(res.data.id);
          }
          setIsSubmitted(true);
        } else {
          Alert.alert('Registration Failed', res?.message || 'Failed to submit registration. Please check your network and try again.');
        }
      } catch (err: any) {
        Alert.alert('Registration Error', err?.message || 'An unexpected error occurred. Please check your network connection.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  // Timer & Animation State for Verification Submitted View
  const [secondsLeft, setSecondsLeft] = useState(86399); // 23h 59m 59s SLA
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Real-time live status checker (polls backend to auto-open dashboard once approved by Admin)
  useEffect(() => {
    let slaTimer: any;
    let pollTimer: any;

    if (isSubmitted) {
      // 1. SLA Countdown Timer
      slaTimer = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // 2. Real-time background check every 3 seconds
      const checkLiveStatus = async () => {
        const targetPhone = submittedPhone || phone;
        if (!targetPhone) return;

        const statusRes = await partnerService.checkShopStatus(targetPhone, submittedShopId);
        const status = (statusRes?.verification_status || statusRes?.shop?.verification_status || '').toUpperCase();
        const isVerified = Boolean(statusRes?.is_verified || status === 'APPROVED');

        if (isVerified) {
          clearInterval(pollTimer);
          clearInterval(slaTimer);
          setIsApprovedCelebration(true);
          setTimeout(() => {
            login('owner');
          }, 1500);
        }
      };

      pollTimer = setInterval(checkLiveStatus, 3000);
      checkLiveStatus(); // Immediate initial check

      // 3. Hourglass Pulse & Wobble Loop
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
          Animated.sequence([
            Animated.timing(spinAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: false,
            }),
            Animated.timing(spinAnim, {
              toValue: -1,
              duration: 600,
              useNativeDriver: false,
            }),
            Animated.timing(spinAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    }

    return () => {
      if (slaTimer) clearInterval(slaTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isSubmitted, submittedPhone, submittedShopId]);

  const checkApprovalImmediately = async () => {
    setIsCheckingLive(true);
    try {
      const targetPhone = submittedPhone || phone;
      const statusRes = await partnerService.checkShopStatus(targetPhone, submittedShopId);
      const status = (statusRes?.verification_status || statusRes?.shop?.verification_status || '').toUpperCase();
      const isVerified = Boolean(statusRes?.is_verified || status === 'APPROVED');

      if (isVerified) {
        setIsApprovedCelebration(true);
        setTimeout(() => {
          login('owner');
        }, 1200);
      } else {
        Alert.alert(
          'Verification In Progress ⏳',
          'Admin review is currently under progress. As soon as Admin clicks Approve in the Web Panel, your app will automatically open the Laundry Dashboard.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Connection Error', 'Unable to check status. Automatic live checking remains active.');
    } finally {
      setIsCheckingLive(false);
    }
  };

  const formatSLA = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
  };

  useEffect(() => {
    if (currentStep === 1 && !streetAddress) {
      // Auto-fetch GPS when Step 1 loads
      fetchCurrentGPS();
    }
  }, [currentStep]);
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';

  // Map Modal & Location State
  const mapRef = useRef<MapView>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLat, setMapLat] = useState(18.5590);
  const [mapLng, setMapLng] = useState(73.7868);
  const [mapAddress, setMapAddress] = useState('');
  const [isGeocodingMap, setIsGeocodingMap] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [mapZoom, setMapZoom] = useState(16);

  // Pinch-to-Zoom Gesture PanResponder
  const pinchRef = useRef<{ initialDist: number }>({ initialDist: 0 });
  const mapPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchRef.current.initialDist = Math.hypot(dx, dy);
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const currentDist = Math.hypot(dx, dy);
          const initialDist = pinchRef.current.initialDist;

          if (initialDist > 0) {
            const factor = currentDist / initialDist;
            if (factor > 1.15) {
              setMapZoom(z => Math.min(z + 1, 20));
              pinchRef.current.initialDist = currentDist;
            } else if (factor < 0.85) {
              setMapZoom(z => Math.max(z - 1, 8));
              pinchRef.current.initialDist = currentDist;
            }
          }
        }
      },
      onPanResponderRelease: () => {
        pinchRef.current.initialDist = 0;
      },
    })
  ).current;

  // Map Search Autocomplete State
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchPredictions, setMapSearchPredictions] = useState<Array<{ description: string; place_id: string; geometry?: { lat: number; lng: number } }>>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const handleMapSearchInput = async (text: string) => {
    setMapSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setMapSearchPredictions([]);
      return;
    }

    setIsSearchingPlaces(true);
    try {
      // 1. Try Google Places Autocomplete API
      const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(placesUrl);
      const data = await res.json();

      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        setMapSearchPredictions(
          data.predictions.map((p: any) => ({
            description: p.description,
            place_id: p.place_id,
          }))
        );
      } else {
        // 2. Fallback to Google Geocoding API search
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          setMapSearchPredictions(
            geoData.results.slice(0, 5).map((r: any) => ({
              description: r.formatted_address,
              place_id: r.place_id || r.formatted_address,
              geometry: r.geometry?.location,
            }))
          );
        } else {
          setMapSearchPredictions([]);
        }
      }
    } catch {
      setMapSearchPredictions([]);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleDirectSearchSubmit = async (queryText?: string) => {
    const query = (queryText || mapSearchQuery).trim();
    if (!query || query.length < 2) return;
    setIsSearchingPlaces(true);
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const first = data.results[0];
        const lat = first.geometry.location.lat;
        const lng = first.geometry.location.lng;
        const formatted = first.formatted_address;
        setMapLat(lat);
        setMapLng(lng);
        setMapAddress(formatted);
        setMapSearchQuery('');
        setMapSearchPredictions([]);

        let city = selectedCity;
        for (const comp of first.address_components || []) {
          if (comp.types && comp.types.includes('locality')) {
            city = comp.long_name;
          }
        }
        const latStr = lat.toFixed(4);
        const lngStr = lng.toFixed(4);
        setGpsLocation(`${latStr}° N, ${lngStr}° E (Google Maps Searched)`);
        setStreetAddress(formatted);
        if (city) setSelectedCity(city);
      }
    } catch {
      // Handled
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const selectSearchPrediction = async (item: { description: string; place_id: string; geometry?: { lat: number; lng: number } }) => {
    setMapSearchQuery('');
    setMapSearchPredictions([]);

    if (item.geometry) {
      setMapLat(item.geometry.lat);
      setMapLng(item.geometry.lng);
      setMapAddress(item.description);
      fetchAddressForCoords(item.geometry.lat, item.geometry.lng);
      return;
    }

    if (item.place_id) {
      setIsGeocodingMap(true);
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=geometry,formatted_address,address_components&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(detailsUrl);
        const data = await res.json();

        if (data.result && data.result.geometry) {
          const lat = data.result.geometry.location.lat;
          const lng = data.result.geometry.location.lng;
          const formatted = data.result.formatted_address || item.description;

          setMapLat(lat);
          setMapLng(lng);
          setMapAddress(formatted);

          let city = selectedCity;
          for (const comp of data.result.address_components || []) {
            if (comp.types && comp.types.includes('locality')) {
              city = comp.long_name;
            }
          }
          const latStr = lat.toFixed(4);
          const lngStr = lng.toFixed(4);
          setGpsLocation(`${latStr}° N, ${lngStr}° E (Google Maps Searched)`);
          setStreetAddress(formatted);
          if (city) setSelectedCity(city);
        }
      } catch {
        // Handled silently
      } finally {
        setIsGeocodingMap(false);
      }
    }
  };

  const fetchAddressForCoords = async (lat: number, lng: number) => {
    setIsGeocodingMap(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results && json.results.length > 0) {
        const address = json.results[0].formatted_address;
        let city = selectedCity;
        for (const comp of json.results[0].address_components || []) {
          if (comp.types.includes('locality')) city = comp.long_name;
        }
        setMapAddress(address);
        return { address, city };
      }
      throw new Error("Google geocoding fallback");
    } catch {
      // Nominatim (OpenStreetMap) reverse-geocoding fallback
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'DhobiPartnerApp/1.0' } });
        const nomJson = await nomRes.json();
        if (nomJson && nomJson.display_name) {
          const address = nomJson.display_name;
          const addrComp = nomJson.address || {};
          const city = addrComp.city || addrComp.town || addrComp.village || addrComp.county || selectedCity;
          setMapAddress(address);
          return { address, city };
        }
      } catch {
        // Silent fallback
      }
      return null;
    } finally {
      setIsGeocodingMap(false);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Needed 📍',
            message: 'Dhobi Partner app needs your location permission to automatically pinpoint your shop location on the map.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }
        const coarseGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        return coarseGranted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      try {
        Geolocation.requestAuthorization();
        return true;
      } catch (err) {
        console.warn('iOS location permission error:', err);
        return true;
      }
    }
    return true;
  };

  /**
   * Multi-tier location fetch for real-time accuracy:
   * Configures RN Geolocation native provider & requests high accuracy / network position
   */
  const getPositionWithFallback = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      try {
        Geolocation.setRNConfiguration({
          skipPermissionRequests: false,
          authorizationLevel: 'whenInUse',
          locationProvider: 'auto',
        });
      } catch {}

      // Attempt 1: High Accuracy Fused/GPS Provider (forces fresh live position)
      Geolocation.getCurrentPosition(
        (pos) => {
          console.log('GPS Location acquired:', pos.coords.latitude, pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err1) => {
          console.warn('GPS High Accuracy failed, trying Network:', err1?.message || err1);
          // Attempt 2: Low Accuracy Network provider (Cellular + Wi-Fi)
          Geolocation.getCurrentPosition(
            (pos) => {
              console.log('Network Location acquired:', pos.coords.latitude, pos.coords.longitude);
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            async (err2) => {
              console.warn('Network location failed:', err2?.message || err2);
              setGpsError('Location (GPS) is OFF. Please turn on Location in your phone settings.');
              // Attempt 3: IP Location fallback
              try {
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                if (ipData && ipData.latitude && ipData.longitude) {
                  resolve({ lat: parseFloat(ipData.latitude), lng: parseFloat(ipData.longitude) });
                  return;
                }
              } catch {
                // Ignore IP failure
              }
              // Attempt 4: Safe default fallback
              resolve({ lat: mapLat || 18.5590, lng: mapLng || 73.7868 });
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  /**
   * Fetch device current GPS location and reverse-geocode address
   */
  const fetchCurrentGPS = async (): Promise<{ lat: number; lng: number }> => {
    setIsFetchingGPS(true);
    setGpsError('');
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setGpsError('Location permission denied. Please enable location permissions in app settings.');
      setIsFetchingGPS(false);
      return { lat: mapLat || 18.5590, lng: mapLng || 73.7868 };
    }
    const coords = await getPositionWithFallback();
    setMapLat(coords.lat);
    setMapLng(coords.lng);
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    setIsFetchingGPS(false);
    const result = await fetchAddressForCoords(coords.lat, coords.lng);
    const latStr = coords.lat.toFixed(4);
    const lngStr = coords.lng.toFixed(4);
    setGpsLocation(`${latStr}° N, ${lngStr}° E (Google Maps Live GPS)`);
    if (result?.address) setStreetAddress(result.address);
    if (result?.city) setSelectedCity(result.city);
    return coords;
  };

  /**
   * Open Location Map Modal and automatically request location permission & detect current live GPS location
   */
  const openLocationMap = async () => {
    setShowMapModal(true);
    setIsFetchingGPS(true);
    setGpsError('');

    // Request proper location permission first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setGpsError('Location permission was denied. Please allow location access or pick manually on map.');
      setIsFetchingGPS(false);
      await fetchAddressForCoords(mapLat || 18.5590, mapLng || 73.7868);
      return;
    }

    // High accuracy current position fetch
    const coords = await getPositionWithFallback();
    setMapLat(coords.lat);
    setMapLng(coords.lng);
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    setIsFetchingGPS(false);

    // Reverse geocode to get precise street address and city
    const result = await fetchAddressForCoords(coords.lat, coords.lng);
    const latStr = coords.lat.toFixed(4);
    const lngStr = coords.lng.toFixed(4);
    setGpsLocation(`${latStr}° N, ${lngStr}° E (Google Maps Live GPS)`);
    if (result?.address) {
      setStreetAddress(result.address);
    }
    if (result?.city) {
      setSelectedCity(result.city);
    }
  };

  const confirmLocationFromMap = async () => {
    const latStr = mapLat.toFixed(4);
    const lngStr = mapLng.toFixed(4);
    setGpsLocation(`${latStr}° N, ${lngStr}° E (Google Maps Confirmed)`);
    if (mapAddress) {
      setStreetAddress(mapAddress);
    }
    setShowMapModal(false);
    Alert.alert(
      'Location & Address Updated 📍',
      `Shop location pinned successfully at:\n\nCoordinates: ${latStr}° N, ${lngStr}° E\nAddress: ${mapAddress || streetAddress}`
    );
  };

  const fetchGoogleMapsAddress = async () => {
    await fetchAddressForCoords(18.5590, 73.7868);
    setGpsLocation('18.5590° N, 73.7868° E (Captured)');
  };

  if (isSubmitted) {
    if (isApprovedCelebration) {
      return (
        <AppBackground style={{ paddingTop: insets.top }}>
          <ScrollView contentContainerStyle={styles.successScrollContainer}>
            <View style={styles.successContainer}>
              <View style={[styles.badgeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                <Text style={styles.badgeText}>🎉</Text>
              </View>

              <Text style={[styles.successTitle, { color: '#10B981' }]}>Application Approved! ✅</Text>
              <Text style={styles.successSub}>
                Congratulations! Admin has approved and verified your Laundry Shop. Taking you to your Dashboard...
              </Text>

              <AppCard style={[styles.statusCard, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
                <Text style={styles.statusLabel}>Live Account Status</Text>
                <View style={[styles.pendingBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={[styles.pendingText, { color: '#FFFFFF' }]}>● Verified & Active</Text>
                </View>
                <View style={{ marginTop: SPACING.md, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={{ marginTop: SPACING.xs, color: '#10B981', fontFamily: FONTS.medium, fontSize: 13 }}>
                    Launching Laundry Dashboard...
                  </Text>
                </View>
              </AppCard>

              <AppButton
                title="Go to Dashboard Now 🚀"
                onPress={() => login('owner')}
                style={[styles.doneBtn, { backgroundColor: '#10B981' }]}
              />
            </View>
          </ScrollView>
        </AppBackground>
      );
    }

    const spin = spinAnim.interpolate({
      inputRange: [-1, 1],
      outputRange: ['-15deg', '15deg'],
    });

    return (
      <AppBackground style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={styles.successScrollContainer}>
          <View style={styles.successContainer}>
            {/* Animated Hourglass Container */}
            <Animated.View
              style={[
                styles.badgeIcon,
                {
                  transform: [{ scale: pulseAnim }, { rotate: spin }],
                },
              ]}
            >
              <Text style={styles.badgeText}>⏳</Text>
            </Animated.View>

            <Text style={styles.successTitle}>Verification Requested</Text>
            <Text style={styles.successSub}>
              Your registration details and documents have been submitted to Admin. You will receive access once Admin approves your application.
            </Text>

            {/* Status & Live Running Countdown SLA Card */}
            <AppCard style={styles.statusCard}>
              <Text style={styles.statusLabel}>Application Status</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>● Under Verification (Live Auto-Sync Active)</Text>
              </View>

              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Estimated Admin SLA Review Time</Text>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerIcon}>⏱️</Text>
                  <Text style={styles.timerText}>{formatSLA(secondsLeft)}</Text>
                </View>
              </View>
            </AppCard>

            <AppButton
              title={isCheckingLive ? 'Checking Approval Status...' : 'Check Approval Status Now 🔄'}
              onPress={checkApprovalImmediately}
              isLoading={isCheckingLive}
              style={[styles.doneBtn, { marginBottom: SPACING.md, backgroundColor: '#4A3AFF' }]}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ paddingVertical: SPACING.md, alignItems: 'center' }}
            >
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONTS.semiBold, fontSize: 14 }}>
                ← Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </AppBackground>
    );
  }

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Partner Registration</Text>
            <Text style={styles.stepIndicator}>Step {currentStep} of 5</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${(currentStep / 5) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {currentStep === 1 && (
            <View>
              <Text style={styles.sectionTitle}> 🏬 Business & Shop Details</Text>

              {/* ── SHOP LOCATION (simple tappable input) ── */}
              <Text style={styles.fieldLabel}>Shop Location *</Text>
              <TouchableOpacity
                style={styles.locationInputRow}
                onPress={openLocationMap}
                activeOpacity={0.75}
              >
                <Text style={styles.locationPinIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  {isFetchingGPS || isGeocodingMap ? (
                    <View style={styles.locationFetchingRow}>
                      <ActivityIndicator size="small" color="#4A3AFF" />
                      <Text style={styles.locationFetchingTxt}> Detecting current location...</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.locationInputTxt,
                        !(mapAddress || streetAddress) && styles.locationInputPlaceholder,
                      ]}
                      numberOfLines={2}
                    >
                      {mapAddress || streetAddress || 'Tap to fetch current location'}
                    </Text>
                  )}
                </View>
                <Text style={styles.locationInputArrow}>›</Text>
              </TouchableOpacity>

              {/* 2. Shop Name */}
              <AppInput
                label="Laundry Shop Name *"
                placeholder="e.g. SuperClean Laundromat"
                value={shopName}
                onChangeText={setShopName}
              />

              {/* 3. City Dropdown */}
              <Text style={styles.fieldLabel}>Select City *</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowCityPicker(true)}
              >
                <Text style={styles.dropdownValueTxt}>{selectedCity}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* 4. Area / Locality Dropdown */}
              <Text style={styles.fieldLabel}>Select Area / Locality *</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowAreaPicker(true)}
              >
                <Text style={styles.dropdownValueTxt}>{selectedArea}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* 5. Street / Building Address */}
              <AppInput
                label="Shop No, Building & Street Address *"
                placeholder="e.g. Shop #4, Sunshine Complex, Main Road"
                value={streetAddress}
                onChangeText={setStreetAddress}
              />

              {/* 6. GST Number */}
              <AppInput
                label="GST Number (Optional)"
                placeholder="22AAAAA0000A1Z5"
                value={gstNumber}
                onChangeText={setGstNumber}
              />
            </View>
          )}

          {currentStep === 2 && (
            <View>
              <Text style={styles.sectionTitle}> 👤 Owner Personal Details</Text>
              <AppInput
                label="Full Name *"
                placeholder="Enter owner full name"
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <AppInput
                label="Mobile Number *"
                placeholder="Enter 10-digit mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <AppInput
                label="Email Address *"
                placeholder="Enter email address"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              {/* Password Field */}
              <Text style={styles.fieldLabel}>Create Login Password *</Text>
              <View style={{ position: 'relative' }}>
                <AppInput
                  label=""
                  placeholder="Min 6 characters — used for login"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: 14 }}
                >
                  <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 11, color: '#7B7BB0', marginTop: -8, marginBottom: 8, marginLeft: 4 }}>
                🔑 Remember this password — you'll need it every time you log in.
              </Text>

              {/* Confirm Password Field */}
              <Text style={styles.fieldLabel}>Confirm Password *</Text>
              <View style={{ position: 'relative' }}>
                <AppInput
                  label=""
                  placeholder="Re-enter your password"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 14, top: 14 }}
                >
                  <Text style={{ fontSize: 18 }}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={{ fontSize: 12, color: '#e53935', marginTop: -8, marginBottom: 8, marginLeft: 4 }}>
                  ❌ Passwords do not match
                </Text>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && password.length >= 6 && (
                <Text style={{ fontSize: 12, color: '#4CAF50', marginTop: -8, marginBottom: 8, marginLeft: 4 }}>
                  ✅ Passwords match
                </Text>
              )}
            </View>
          )}

          {currentStep === 3 && (
            <View>
              <Text style={styles.sectionTitle}> Documents & Bank Details</Text>

              {/* 1. Identity Proof Number */}
              <AppInput
                label="Aadhaar / PAN Number *"
                placeholder="Enter Identity Proof Number"
                value={idProof}
                onChangeText={setIdProof}
              />

              {/* 1b. Identity Proof Photo Upload (Mandatory) */}
              <Text style={styles.fieldLabel}>Upload Aadhaar / ID Proof Photo (Mandatory) *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, !!idProofPhoto && styles.uploadBoxActive]}
                onPress={() => openMediaPickerOptions('ID_PROOF')}
              >
                {idProofPhoto ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image source={{ uri: idProofPhoto }} style={styles.docPreviewThumb} />
                    <Text style={styles.uploadTitleActive}>✅ ID Proof Photo Attached</Text>
                    <Text style={styles.uploadSubTxt}>Tap to re-take or change photo</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadTitle}>Take / Choose Photo of ID Proof *</Text>
                    <Text style={styles.uploadSubTxt}>Camera or File Upload mandatory</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 2. Business License / Udyam Number */}
              <AppInput
                label="Shop License / Udyam Reg. Number *"
                placeholder="Enter Business Proof Number"
                value={businessProof}
                onChangeText={setBusinessProof}
              />

              {/* 2b. Business License Photo Upload (Mandatory) */}
              <Text style={styles.fieldLabel}>Upload Shop License Photo (Mandatory) *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, !!businessProofPhoto && styles.uploadBoxActive]}
                onPress={() => openMediaPickerOptions('BUSINESS_PROOF')}
              >
                {businessProofPhoto ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image source={{ uri: businessProofPhoto }} style={styles.docPreviewThumb} />
                    <Text style={styles.uploadTitleActive}>✅ License Document Photo Attached</Text>
                    <Text style={styles.uploadSubTxt}>Tap to re-take or change photo</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.uploadIcon}>📄</Text>
                    <Text style={styles.uploadTitle}>Take / Choose Photo of License *</Text>
                    <Text style={styles.uploadSubTxt}>Camera or File Upload mandatory</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 3. Bank Account */}
              <AppInput
                label="Bank Account Number *"
                placeholder="Enter bank account number"
                keyboardType="numeric"
                value={bankAccount}
                onChangeText={setBankAccount}
              />

              {/* 4. IFSC Code */}
              <AppInput
                label="Bank IFSC Code *"
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChangeText={setIfscCode}
              />
            </View>
          )}

          {currentStep === 4 && (
            <View>
              <Text style={styles.sectionTitle}> Operations & Timings</Text>

              {/* Pickup Radius */}
              <AppInput
                label="Pickup Radius (in KM) *"
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={pickupRadius}
                onChangeText={setPickupRadius}
              />

              {/* Working Hours Section */}
              <Text style={styles.fieldLabel}>Shop Working Hours *</Text>
              <View style={styles.timingCard}>
                <View style={styles.timePickersRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subFieldLabel}>Opening Time</Text>
                    <TouchableOpacity style={styles.timeBox} onPress={() => setShowOpenTimePicker(true)}>
                      <Text style={styles.timeBoxTxt}>🌅 {openTime}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeToDivider}>to</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subFieldLabel}>Closing Time</Text>
                    <TouchableOpacity style={styles.timeBox} onPress={() => setShowCloseTimePicker(true)}>
                      <Text style={styles.timeBoxTxt}>🌙 {closeTime}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.presetLabel}>Quick Presets:</Text>
                <View style={styles.presetRow}>
                  {HOUR_PRESETS.map((preset) => {
                    const isSelected = openTime === preset.open && closeTime === preset.close;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                        onPress={() => {
                          setOpenTime(preset.open);
                          setCloseTime(preset.close);
                        }}
                      >
                        <Text style={[styles.presetChipTxt, isSelected && styles.presetChipTxtActive]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Weekly Off / Holiday Settings Section */}
              <Text style={styles.fieldLabel}>Weekly Off / Holiday Settings *</Text>
              <View style={styles.holidayCard}>
                <Text style={styles.subFieldLabel}>Select Shop Off Days:</Text>
                <View style={styles.daysRow}>
                  {DAYS_LIST.map((day) => {
                    const isSelected = !isNoOff && selectedOffDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayChip, isSelected && styles.dayChipActive]}
                        onPress={() => {
                          setIsNoOff(false);
                          if (selectedOffDays.includes(day)) {
                            setSelectedOffDays(selectedOffDays.filter((d) => d !== day));
                          } else {
                            setSelectedOffDays([...selectedOffDays, day]);
                          }
                        }}
                      >
                        <Text style={[styles.dayChipTxt, isSelected && styles.dayChipTxtActive]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.noOffBtn, isNoOff && styles.noOffBtnActive]}
                  onPress={() => {
                    setIsNoOff(!isNoOff);
                    if (!isNoOff) setSelectedOffDays([]);
                  }}
                >
                  <Text style={[styles.noOffTxt, isNoOff && styles.noOffTxtActive]}>
                    {isNoOff ? '✅ Open 7 Days (No Weekly Off)' : '✨ Open 7 Days a Week (No Weekly Off)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentStep === 5 && (
            <View>
              <Text style={styles.sectionTitle}> Media & Branding (Mandatory)</Text>
              <Text style={styles.subLabel}>All media images are strictly required for shop verification by Admin</Text>

              {/* Shop Logo Picker */}
              <Text style={styles.fieldLabel}>1. Shop Logo *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, !!logoUri && styles.uploadBoxActive]}
                onPress={() => openMediaPickerOptions('LOGO')}
              >
                {logoUri ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image source={{ uri: logoUri }} style={styles.logoPreviewThumb} />
                    <Text style={styles.uploadTitleActive}>✅ Shop Logo Uploaded</Text>
                    <Text style={styles.uploadSubTxt}>Tap to change</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadTitle}>Upload / Take Shop Logo Photo *</Text>
                    <Text style={styles.uploadSubTxt}>Mandatory field</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cover Image Picker */}
              <Text style={styles.fieldLabel}>2. Shop Cover Image *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, !!coverUri && styles.uploadBoxActive]}
                onPress={() => openMediaPickerOptions('COVER')}
              >
                {coverUri ? (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <Image source={{ uri: coverUri }} style={styles.coverPreviewThumb} />
                    <Text style={styles.uploadTitleActive}>✅ Shop Cover Image Uploaded</Text>
                    <Text style={styles.uploadSubTxt}>Tap to change</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.uploadIcon}>🖼️</Text>
                    <Text style={styles.uploadTitle}>Upload / Take Cover Image *</Text>
                    <Text style={styles.uploadSubTxt}>Mandatory field</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Shop Photos Gallery Picker */}
              <Text style={styles.fieldLabel}>3. Shop Premises Photos *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, shopPhotosList.length > 0 && styles.uploadBoxActive]}
                onPress={() => openMediaPickerOptions('SHOP_PHOTO')}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.uploadIcon}>📸</Text>
                  <Text style={styles.uploadTitle}>
                    {shopPhotosList.length > 0
                      ? `✅ Uploaded ${shopPhotosList.length} Shop Photos (Tap to Add More)`
                      : 'Take / Choose Shop Photos *'}
                  </Text>
                  <Text style={styles.uploadSubTxt}>Mandatory field (at least 1 photo)</Text>
                </View>
              </TouchableOpacity>

              {shopPhotosList.length > 0 && (
                <View style={styles.shopPhotosGrid}>
                  {shopPhotosList.map((uri, idx) => (
                    <View key={idx} style={styles.shopPhotoItem}>
                      <Image source={{ uri }} style={styles.shopPhotoThumb} />
                      <TouchableOpacity
                        style={styles.removePhotoBadge}
                        onPress={() => setShopPhotosList(shopPhotosList.filter((_, i) => i !== idx))}
                      >
                        <Text style={styles.removePhotoTxt}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.navRow}>
            <AppButton
              title={currentStep === 5 ? 'Submit for Admin Approval' : 'Continue'}
              onPress={handleNext}
              style={styles.continueBtn}
            />
          </View>
        </ScrollView>
      </View>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCityPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeaderTitle}>Select City</Text>
            {Object.keys(CITIES_AND_AREAS).map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.pickerItem, selectedCity === city && styles.pickerItemActive]}
                onPress={() => {
                  setSelectedCity(city);
                  setSelectedArea(CITIES_AND_AREAS[city][0]);
                  setShowCityPicker(false);
                }}
              >
                <Text style={[styles.pickerItemTxt, selectedCity === city && styles.pickerItemTxtActive]}>
                  {city}
                </Text>
                {selectedCity === city && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Area Picker Modal */}
      <Modal visible={showAreaPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAreaPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeaderTitle}>Select Area in {selectedCity}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {(CITIES_AND_AREAS[selectedCity] || []).map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[styles.pickerItem, selectedArea === area && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedArea(area);
                    setShowAreaPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemTxt, selectedArea === area && styles.pickerItemTxtActive]}>
                    {area}
                  </Text>
                  {selectedArea === area && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Opening Time Modal */}
      <Modal visible={showOpenTimePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOpenTimePicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeaderTitle}>Select Opening Time</Text>
            {OPEN_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.pickerItem, openTime === time && styles.pickerItemActive]}
                onPress={() => {
                  setOpenTime(time);
                  setShowOpenTimePicker(false);
                }}
              >
                <Text style={[styles.pickerItemTxt, openTime === time && styles.pickerItemTxtActive]}>
                  {time}
                </Text>
                {openTime === time && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Closing Time Modal */}
      <Modal visible={showCloseTimePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCloseTimePicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeaderTitle}>Select Closing Time</Text>
            {CLOSE_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.pickerItem, closeTime === time && styles.pickerItemActive]}
                onPress={() => {
                  setCloseTime(time);
                  setShowCloseTimePicker(false);
                }}
              >
                <Text style={[styles.pickerItemTxt, closeTime === time && styles.pickerItemTxtActive]}>
                  {time}
                </Text>
                {closeTime === time && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── FULL-SCREEN GOOGLE MAPS LOCATION PICKER ── */}
      <Modal visible={showMapModal} transparent={false} animationType="slide" statusBarTranslucent>
        <View style={styles.fullMapScreen}>

          {/* ── Top Bar with Safe Area Insets & Search Input ── */}
          <View style={[styles.fullMapTopBar, { paddingTop: Math.max(insets.top + 6, 28) }]}>
            <TouchableOpacity
              style={styles.fullMapBackBtn}
              onPress={() => {
                setMapSearchPredictions([]);
                setShowMapModal(false);
              }}
            >
              <Text style={styles.fullMapBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.fullMapSearchBar}>
              <Text style={styles.fullMapSearchIcon}>🔍</Text>
              <TextInput
                style={styles.fullMapSearchInput}
                placeholder={mapAddress ? `📍 ${mapAddress.slice(0, 40)}...` : "Type area or landmark (e.g. Baner, Kothrud)..."}
                placeholderTextColor="#777"
                value={mapSearchQuery}
                onChangeText={handleMapSearchInput}
                onSubmitEditing={() => handleDirectSearchSubmit()}
                returnKeyType="search"
              />
              {isSearchingPlaces ? (
                <ActivityIndicator size="small" color="#4A3AFF" style={{ marginRight: 4 }} />
              ) : (mapSearchQuery.length > 0) ? (
                <TouchableOpacity
                  onPress={() => {
                    setMapSearchQuery('');
                    setMapSearchPredictions([]);
                  }}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 14, color: '#888', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* ── Search Predictions Dropdown Overlay ── */}
          {mapSearchPredictions.length > 0 && (
            <View style={[styles.predictionsOverlayContainer, { top: Math.max(insets.top + 70, 95) }]}>
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 220 }}>
                {mapSearchPredictions.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.predictionRow}
                    onPress={() => selectSearchPrediction(item)}
                  >
                    <Text style={styles.predictionIcon}>📍</Text>
                    <Text style={styles.predictionTxt} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Native Interactive Map Canvas (Hardware Accelerated Native Pinch-to-Zoom & Pan) ── */}
          <View style={styles.fullMapCanvas}>
            <MapView
              ref={mapRef}
              style={styles.fullMapImage}
              initialRegion={{
                latitude: mapLat,
                longitude: mapLng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              zoomEnabled={true}
              scrollEnabled={true}
              rotateEnabled={true}
              pitchEnabled={true}
              onRegionChangeComplete={(newRegion) => {
                setMapLat(newRegion.latitude);
                setMapLng(newRegion.longitude);
                fetchAddressForCoords(newRegion.latitude, newRegion.longitude);
              }}
            />

            {/* GPS & Address Loading pill */}
            {(isFetchingGPS || isGeocodingMap) && (
              <View style={styles.fullMapLoadingOverlay} pointerEvents="none">
                <View style={styles.fullMapLoadingPill}>
                  <ActivityIndicator size="small" color="#4A3AFF" />
                  <Text style={styles.fullMapLoadingTxt}>
                    {isFetchingGPS ? 'Detecting location...' : 'Updating map address...'}
                  </Text>
                </View>
              </View>
            )}

            {/* Center Pin Callout for Shop Location */}
            <View style={styles.fullMapCenterPin} pointerEvents="none">
              <View style={styles.fullMapCallout}>
                <Text style={styles.fullMapCalloutTxt}>🧺 Your Shop Location</Text>
              </View>
              <Text style={styles.fullMapPinEmoji}>📍</Text>
            </View>

            {/* Current Location Button ONLY (re-fetch live GPS) */}
            <TouchableOpacity
              style={styles.fullMapMyLocBtn}
              onPress={fetchCurrentGPS}
              disabled={isFetchingGPS}
            >
              {isFetchingGPS
                ? <ActivityIndicator size="small" color="#4A3AFF" />
                : <Text style={styles.fullMapMyLocIcon}>◎</Text>
              }
            </TouchableOpacity>

            {/* GPS Error Snackbar */}
            {!!gpsError && (
              <View style={styles.fullMapErrorSnack} pointerEvents="none">
                <Text style={styles.fullMapErrorTxt}>⚠️  {gpsError}</Text>
              </View>
            )}
          </View>

          {/* ── Bottom Address Card + Confirm (with Bottom Safe Area Insets) ── */}
          <View style={[styles.fullMapBottomCard, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
            <View style={styles.fullMapAddressRow}>
              <Text style={styles.fullMapAddressIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fullMapAddressLabel}>SELECTED LOCATION</Text>
                <Text style={styles.fullMapAddressVal} numberOfLines={2}>
                  {mapAddress || 'Detecting your location...'}
                </Text>
                <Text style={styles.fullMapCoordsSmall}>
                  {mapLat.toFixed(5)}° N,  {mapLng.toFixed(5)}° E
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.fullMapConfirmBtn}
              onPress={confirmLocationFromMap}
              activeOpacity={0.9}
            >
              <Text style={styles.fullMapConfirmTxt}>✓  Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── IMAGE / MEDIA PICKER ACTION MODAL ── */}
      <Modal visible={pickerModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeaderTitle}>Select Upload Option 📸</Text>
            <Text style={styles.pickerSubTitle}>
              Upload mandatory photo for{' '}
              {pickerTarget === 'ID_PROOF'
                ? 'Aadhaar / Identity Proof'
                : pickerTarget === 'BUSINESS_PROOF'
                  ? 'Shop License Proof'
                  : pickerTarget === 'LOGO'
                    ? 'Shop Logo'
                    : pickerTarget === 'COVER'
                      ? 'Shop Cover Image'
                      : 'Shop Photos'}
            </Text>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handlePickFromCamera}>
              <Text style={styles.pickerOptionIcon}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTxt}>Take Photo with Camera</Text>
                <Text style={styles.pickerOptionSub}>Open device camera to capture document photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOptionBtn} onPress={handlePickFromGallery}>
              <Text style={styles.pickerOptionIcon}>🖼️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTxt}>Choose Photo from Gallery / Files</Text>
                <Text style={styles.pickerOptionSub}>Select an existing image from phone gallery</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.pickerCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    width: 60,
  },
  backTxt: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
    textAlign: 'center',
  },
  stepIndicator: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 1,
    textAlign: 'center',
  },
  progressBg: {
    height: 4,
    backgroundColor: COLORS.border,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  container: {
    padding: SPACING.xl,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  subLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  gpsTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  gpsBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  gpsBtnTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  uploadBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius_md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  uploadBoxActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.cardAlt,
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  uploadTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  uploadTitleActive: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.success,
    marginTop: 6,
  },
  uploadSubTxt: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docPreviewThumb: {
    width: 140,
    height: 90,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoPreviewThumb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  coverPreviewThumb: {
    width: '100%',
    height: 100,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.xs,
    resizeMode: 'cover',
  },
  shopPhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  shopPhotoItem: {
    position: 'relative',
    width: 75,
    height: 75,
  },
  shopPhotoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoTxt: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  pickerSubTitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pickerOptionIcon: {
    fontSize: 24,
  },
  pickerOptionTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  pickerOptionSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  pickerCancelBtn: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  pickerCancelTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.error,
  },
  navRow: {
    marginTop: SPACING.xl,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
  },
  successScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  badgeText: {
    fontSize: 36,
  },
  successTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  successSub: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  statusCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  statusLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning + '25',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_full,
  },
  pendingText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.warning,
  },
  timerBox: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timerLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SIZES.radius_full,
    gap: 6,
  },
  timerIcon: {
    fontSize: 16,
  },
  timerText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: SPACING.lg,
  },
  dropdownValueTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  gpsSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.lg,
    elevation: 5,
  },
  pickerHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: SIZES.radius_sm,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  pickerItemTxt: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  pickerItemTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  checkIcon: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  timingCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  subFieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timeBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  timeBoxTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
  },
  timeToDivider: {
    marginHorizontal: SPACING.sm,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  presetLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  presetChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  presetChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  presetChipTxt: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  presetChipTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
  },
  holidayCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.sm,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  dayChipTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.text,
  },
  dayChipTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  noOffBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  noOffBtnActive: {
    backgroundColor: COLORS.success + '15',
    borderColor: COLORS.success,
  },
  noOffTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noOffTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  mapModalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.radius_lg,
    borderTopRightRadius: SIZES.radius_lg,
    maxHeight: '90%',
    padding: SPACING.lg,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mapModalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  mapModalCloseBtn: {
    padding: SPACING.xs,
  },
  mapModalCloseTxt: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  mapCanvasWrapper: {
    height: 200,
    borderRadius: SIZES.radius_md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
  },
  mapPinOverlay: {
    position: 'absolute',
    top: '35%',
    left: '42%',
    alignItems: 'center',
  },
  mapPinCallout: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radius_sm,
    marginBottom: 2,
  },
  mapPinCalloutTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  mapPinIcon: {
    fontSize: 28,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius_full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLoadingTxt: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  coordsCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  coordsLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  coordsVal: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  gpsResetBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  gpsResetBtnTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  presetHeading: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  presetLocationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  locationPresetChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  locationPresetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationPresetTxt: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.text,
  },
  locationPresetTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  directionalPad: {
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  dPadMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: 4,
  },
  dPadBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.primaryDark + '30',
  },
  dPadTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  dPadCenterBadge: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dPadCenterTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primary,
  },
  resolvedAddressCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  resolvedAddressLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  resolvedAddressTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  mapModalFooter: {
    paddingTop: SPACING.sm,
  },
  confirmMapBtn: {
    backgroundColor: COLORS.primary,
  },
  // ── Real GPS Button ──
  realGpsBtn: {
    backgroundColor: '#4A3AFF',
    borderRadius: SIZES.radius_md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  realGpsBtnDisabled: {
    backgroundColor: '#9490d4',
    elevation: 0,
    shadowOpacity: 0,
  },
  realGpsBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  realGpsBtnIcon: {
    fontSize: 20,
  },
  realGpsBtnTxt: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
  // ── GPS Error Banner ──
  gpsErrorBanner: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: SIZES.radius_sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 6,
  },
  gpsErrorIcon: {
    fontSize: 16,
  },
  gpsErrorTxt: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  // ── GPS Init Loading Box ──
  gpsInitLoadingBox: {
    backgroundColor: '#EEF0FF',
    borderRadius: SIZES.radius_md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#C5C0F5',
  },
  gpsInitLoadingTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#4A3AFF',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  gpsInitLoadingSubTxt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#7B7BB0',
    marginTop: 4,
    textAlign: 'center',
  },
  // ── Map Zoom Controls ──
  mapZoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    gap: 4,
  },
  zoomBtn: {
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginBottom: 4,
  },
  zoomBtnTxt: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#333',
    lineHeight: 22,
  },

  // ══════════════════════════════════════
  // ── Current Location Card (Step 1) ──
  // ══════════════════════════════════════
  currentLocCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    borderWidth: 1.5,
    borderColor: '#D0CBF8',
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentLocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAFF',
  },
  currentLocHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  currentLocIcon: {
    fontSize: 22,
  },
  currentLocTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },
  currentLocSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  miniMapWrapper: {
    width: '100%',
    height: 150,
    position: 'relative',
    backgroundColor: '#E8E8EE',
  },
  miniMapImg: {
    width: '100%',
    height: '100%',
  },
  miniMapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  miniMapTapBadge: {
    backgroundColor: 'rgba(74, 58, 255, 0.88)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: SIZES.radius_full,
  },
  miniMapTapTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.2,
  },
  miniMapPin: {
    position: 'absolute',
    top: '30%',
    left: '47%',
  },
  miniMapPinIcon: {
    fontSize: 26,
  },
  currentLocDetails: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF0FF',
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  coordsBadgeLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#5B52C9',
  },
  coordsBadgeVal: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#4A3AFF',
  },
  detectedAddressBox: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  detectedAddressLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  detectedAddressVal: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: '#4A3AFF',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: SIZES.radius_md,
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  openMapBtnIcon: {
    fontSize: 16,
  },
  openMapBtnTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },

  // ── Simple Location Input Field ──
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 52,
    gap: SPACING.sm,
  },
  locationPinIcon: {
    fontSize: 18,
  },
  locationInputTxt: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    flex: 1,
  },
  locationInputPlaceholder: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  locationFetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationFetchingTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  locationInputArrow: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ══════════════════════════════════════
  // ── Full-Screen Google Maps Picker ──
  // ══════════════════════════════════════
  fullMapScreen: {
    flex: 1,
    backgroundColor: '#E8E8EE',
  },
  // Top bar
  fullMapTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingTop: SPACING.lg + 4,   // status bar space
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  fullMapBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapBackIcon: {
    fontSize: 20,
    color: '#333',
    fontWeight: '700',
  },
  fullMapSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    gap: 6,
  },
  fullMapSearchIcon: {
    fontSize: 16,
  },
  fullMapSearchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#222',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  fullMapSearchTxt: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#222',
  },
  fullMapSearchPlaceholder: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  predictionsOverlayContainer: {
    position: 'absolute',
    top: 115,
    left: SPACING.sm + 48,
    right: SPACING.sm,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  predictionIcon: {
    fontSize: 16,
  },
  predictionTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  // Full map canvas
  fullMapCanvas: {
    flex: 1,
    position: 'relative',
  },
  fullMapImage: {
    width: '100%',
    height: '100%',
  },
  // Loading overlay on map
  fullMapLoadingOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fullMapLoadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: SIZES.radius_full,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  fullMapLoadingTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#4A3AFF',
  },
  // Center pin
  fullMapCenterPin: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -40,
  },
  fullMapCallout: {
    backgroundColor: '#4A3AFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: SIZES.radius_md,
    marginBottom: 2,
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  fullMapCalloutTxt: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  fullMapPinEmoji: {
    fontSize: 36,
  },
  // Zoom controls
  fullMapZoomControls: {
    position: 'absolute',
    right: 14,
    bottom: 190,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  fullMapZoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapZoomDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
  fullMapZoomTxt: {
    fontSize: 22,
    color: '#444',
    fontWeight: '600',
  },
  // My location button
  fullMapMyLocBtn: {
    position: 'absolute',
    right: 14,
    bottom: 150,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  fullMapMyLocIcon: {
    fontSize: 22,
    color: '#4A3AFF',
  },
  // Error snackbar
  fullMapErrorSnack: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#333',
    borderRadius: SIZES.radius_md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  fullMapErrorTxt: {
    color: '#fff',
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  // Bottom card
  fullMapBottomCard: {
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  fullMapAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  fullMapAddressIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  fullMapAddressLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fullMapAddressVal: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  fullMapCoordsSmall: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  fullMapConfirmBtn: {
    backgroundColor: '#4A3AFF',
    borderRadius: SIZES.radius_md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fullMapConfirmTxt: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
});




