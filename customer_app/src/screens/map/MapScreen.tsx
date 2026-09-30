import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useColorScheme, TextInput, ScrollView, Platform, FlatList } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { requestLocationPermission, getCurrentLocation, reverseGeocode, GeocodedAddress } from '../../utils/locationUtils';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { useDispatch } from 'react-redux';
import { updateProfile } from '../../store/authSlice';

const GOOGLE_API_KEY = 'AIzaSyBXTHZ-XiK_QmQ6HV6hFqqetu5JR8Pwgnk';

interface PlacePrediction {
  description: string;
  place_id: string;
}

export const MapScreen = ({ navigation, route }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: 18.5204, // Default to Pune
    longitude: 73.8567,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [houseNo, setHouseNo] = useState('');
  const [floor, setFloor] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');

  useEffect(() => {
    isMounted.current = true;
    initLocation();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const initLocation = async () => {
    try {
      setLoading(true);
      const granted = await requestLocationPermission();
      if (granted) {
        const { latitude, longitude } = await getCurrentLocation();
        const initRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(initRegion);
        fetchAddress(latitude, longitude);
        setTimeout(() => {
          mapRef.current?.animateToRegion(initRegion, 800);
        }, 200);
      } else {
        fetchAddress(18.5204, 73.8567);
      }
    } catch (error) {
      console.log('Location fetch failed, using default (Pune)');
      fetchAddress(18.5204, 73.8567);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddress = async (lat: number, lng: number) => {
    if (!isMounted.current) return;
    setResolvingAddress(true);
    try {
      const geocoded = await reverseGeocode(lat, lng);
      if (isMounted.current) {
        const parts = geocoded.address_line1.split(',');
        const labelStr = parts[0].trim();
        const addressStr = parts.slice(1).join(',').trim() || geocoded.address_line1;

        setAddress({
          ...geocoded,
          label: labelStr || 'Selected Location',
          address_line1: addressStr,
        });
      }
    } catch {
      if (isMounted.current) {
        setAddress({
          address_line1: 'Unable to resolve address. Please enter manually.',
          city: '',
          pincode: '',
          label: 'Selected Location',
          latitude: lat,
          longitude: lng,
        });
      }
    } finally {
      if (isMounted.current) setResolvingAddress(false);
    }
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    if (!showForm && !isSearching) {
      setRegion(newRegion);
      fetchAddress(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}`);
        const data = await res.json();
        if (data.status === 'OK') {
          setPredictions(data.predictions);
        } else {
          setPredictions([]);
        }
      } catch (e) {
        console.log('Search error:', e);
      }
    } else {
      setPredictions([]);
      setIsSearching(false);
    }
  };

  const onSelectPlace = async (placeId: string, description: string) => {
    setIsSearching(false);
    setSearchQuery(description);
    setPredictions([]);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`);
      const data = await res.json();
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        fetchAddress(lat, lng);
      }
    } catch (e) {
      console.log('Place details error:', e);
    }
  };

  const onSaveAddress = () => {
    const rawAddress = address?.address_line1 || searchQuery || 'Selected Location, Pune';
    const formattedAddress = houseNo.trim()
      ? `${houseNo}, ${floor ? floor + ', ' : ''}${rawAddress}`
      : rawAddress;

    const parts = formattedAddress.split(',');
    const area = parts.length > 1 ? parts[1].trim() : address?.city || 'Wakad';

    const finalAddress = {
      id: (address as any)?.id || Date.now(),
      label: addressType || 'Selected Location',
      address_line1: formattedAddress,
      city: address?.city || 'Pune',
      pincode: address?.pincode || '411057',
      latitude: address?.latitude || region?.latitude,
      longitude: address?.longitude || region?.longitude,
    };

    // Instantly dispatch to Redux store
    dispatch(
      updateProfile({
        address: formattedAddress,
        area: area,
        city: address?.city || 'Pune',
        pincode: address?.pincode || '411057',
        latitude: finalAddress.latitude,
        longitude: finalAddress.longitude,
      })
    );

    Toast.show({
      type: 'success',
      text1: 'Location Saved & Confirmed! 📍',
      text2: formattedAddress,
    });

    const targetScreen = route?.params?.returnScreen;
    if (targetScreen === 'EditProfile') {
      navigation.navigate({
        name: 'EditProfile',
        params: { selectedAddressFromMap: finalAddress },
        merge: true,
      });
    } else if (targetScreen === 'Profile') {
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
    } else {
      // Return to Booking screen with the newly selected address
      navigation.navigate({
        name: 'Booking',
        params: {
          selectedAddressFromMap: finalAddress,
          currentCombinations: route?.params?.currentCombinations,
        },
        merge: true,
      });
    }
  };

  const handleMyGpsClick = async () => {
    try {
      setResolvingAddress(true);
      const granted = await requestLocationPermission();
      if (granted) {
        const { latitude, longitude } = await getCurrentLocation();
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        fetchAddress(latitude, longitude);
        Toast.show({ type: 'success', text1: 'GPS Location Updated 🎯' });
      }
    } catch (e) {
      console.log('My GPS click error:', e);
    } finally {
      setResolvingAddress(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onUserLocationChange={() => {}}
          onRegionChangeComplete={onRegionChangeComplete}
          scrollEnabled={!showForm}
          zoomEnabled={!showForm}
        />

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#321D8C" />
            <Text style={{ marginTop: 10, color: '#321D8C', fontWeight: '700' }}>Fetching Current Location...</Text>
          </View>
        )}

        {/* Fixed Center Pin */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={[styles.calloutBubble, { backgroundColor: '#1A2F33' }]}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Laundry Pickup Location</Text>
            <Text style={{ color: '#E0E0E0', fontSize: 11 }}>Move pin to your exact location</Text>
            <View style={[styles.calloutTriangle, { borderTopColor: '#1A2F33' }]} />
          </View>
          <View style={styles.pinDotWrapper}>
            <View style={styles.pinOuter}>
              <View style={styles.pinInner} />
            </View>
            <View style={styles.pinLine} />
          </View>
        </View>

        {/* Floating My Location GPS Button */}
        {!showForm && (
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={handleMyGpsClick}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>🎯</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Header / Search */}
      <View style={[styles.searchHeader, { top: Math.max(insets.top, 10) }]}>
        {/* Back button outside the search pill */}
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 20, color: '#333', fontWeight: '600' }}>{'\u2190'}</Text>
          </TouchableOpacity>
          <View style={[styles.searchBar, { backgroundColor: colors.card, flex: 1 }]}>
            <Text style={{ fontSize: 16, color: colors.textLight, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 }}
              placeholder="Search location..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setIsSearching(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); setIsSearching(false); }} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: colors.textLight }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results Dropdown */}
        {isSearching && predictions.length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.card }]}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.searchItem, { borderBottomColor: colors.border }]}
                  onPress={() => onSelectPlace(item.place_id, item.description)}
                >
                  <Text style={{ fontSize: 16, marginRight: 10 }}>📍</Text>
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={[styles.bottomPanel, { backgroundColor: colors.background }]}>
        {!showForm && <View style={[styles.pullLine, { backgroundColor: '#E0E0E0' }]} />}

        {resolvingAddress && !showForm ? (
          <View style={styles.addressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ marginLeft: 10, color: colors.textSecondary }}>Resolving address...</Text>
          </View>
        ) : !showForm ? (
          // View 1: Confirm Location Phase
          <View style={{ paddingBottom: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16, fontWeight: '500' }}>Your location is set to:</Text>
            <View style={{ flexDirection: 'row', marginBottom: 24, alignItems: 'flex-start' }}>
              <View style={styles.locationIconYellowWrapper}>
                <View style={styles.locationIconYellowInner} />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.addressLabel, { color: colors.text }]} numberOfLines={1}>
                  {address?.label || 'Selected Location'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
                  {address?.address_line1}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: SIZES.radius_md, overflow: 'hidden' }}
                onPress={onSaveAddress}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#2A167E', '#5B52E8', '#7868FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnOrange}
                >
                  <Text style={styles.btnOrangeText}>Confirm Location</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, borderRadius: SIZES.radius_md, overflow: 'hidden' }}
                onPress={() => setShowForm(true)}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#E8643A', '#F37900', '#FF9800']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnOrange}
                >
                  <Text style={styles.btnOrangeText}>Add Details</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // View 2: Form Phase
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.pullLine, { backgroundColor: '#E0E0E0' }]} />
              <Text style={[styles.formTitle, { color: colors.text }]}>Enter Complete Address</Text>
            </View>

            <View style={[styles.selectedAddressBox, { borderColor: '#E8E8E8', backgroundColor: '#FAFAFA' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, marginRight: 10, marginTop: 2, color: '#00897B' }}>◎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressLabel, { color: colors.text, fontSize: 15 }]} numberOfLines={1}>
                    {address?.label || 'Selected Location'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                    {address?.address_line1}
                  </Text>
                </View>
              </View>
            </View>

            <TextInput
              style={[styles.input, { borderColor: '#E8E8E8', color: colors.text }]}
              placeholder="House / Flat No. / Building Name *"
              placeholderTextColor={colors.textLight}
              value={houseNo}
              onChangeText={setHouseNo}
            />
            <TextInput
              style={[styles.input, { borderColor: '#E8E8E8', color: colors.text }]}
              placeholder="Floor / Block (Optional)"
              placeholderTextColor={colors.textLight}
              value={floor}
              onChangeText={setFloor}
            />
            <TextInput
              style={[styles.input, { borderColor: '#E8E8E8', color: colors.text }]}
              placeholder="Landmark (Optional)"
              placeholderTextColor={colors.textLight}
              value={landmark}
              onChangeText={setLandmark}
            />

            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12, marginTop: 10, fontSize: 15 }}>Save address as:</Text>
            <View style={styles.typeRow}>
              {['Home', 'Work', 'Other'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: addressType === type ? '#00897B' : '#E8E8E8',
                      backgroundColor: 'transparent',
                    }
                  ]}
                  onPress={() => setAddressType(type as any)}
                >
                  <Text style={{ color: addressType === type ? '#00897B' : colors.textSecondary, fontWeight: addressType === type ? '700' : '500', fontSize: 14 }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onSaveAddress}
              style={styles.saveBtnContainer}
            >
              <LinearGradient
                colors={['#8162EE', '#A672D6', '#E18C8E', '#FE9A5D']}
                locations={[0.0127, 0.3173, 0.6734, 0.9826]}
                start={{ x: 0, y: 0.8 }}
                end={{ x: 1, y: 0.2 }}
                style={styles.saveBtnGradient}
              >
                <Text style={styles.saveBtnText}>Save Address</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  searchHeader: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: SPACING.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchResults: {
    marginTop: 8,
    borderRadius: SIZES.radius_md,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },

  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
    alignItems: 'center',
    width: 200,
    height: 120,
    justifyContent: 'flex-end',
  },
  calloutBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTriangle: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pinDotWrapper: {
    alignItems: 'center',
    marginTop: 15,
  },
  pinOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
  },
  pinLine: {
    width: 2,
    height: 15,
    backgroundColor: '#1A2F33',
  },

  bottomPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingTop: SPACING.md,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: '75%',
  },
  pullLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  locationIconYellowWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  locationIconYellowInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFC107',
  },
  addressLabel: { fontSize: 17, fontWeight: '700' },

  btnOrange: {
    height: 56,
    borderRadius: SIZES.radius_md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  btnOrangeText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  formTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  selectedAddressBox: {
    borderWidth: 1,
    borderRadius: SIZES.radius_md,
    padding: SPACING.lg,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius_md,
    height: 54,
    paddingHorizontal: SPACING.md,
    marginBottom: 16,
    fontSize: 15,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: 24,
  },
  typeChip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtnContainer: {
    marginTop: 12,
    borderRadius: SIZES.radius_md,
    shadowColor: '#8162EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnGradient: {
    height: 56,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 220,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 10,
  },
});

export default MapScreen;
