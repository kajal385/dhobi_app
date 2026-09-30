import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  Image,
  RefreshControl,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppScreen from '../../components/AppScreen';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { resolveImageUrl } from '../../constants/config';
import { requestLocationPermission, getCurrentLocation, reverseGeocode, GeocodedAddress, calculateDistance } from '../../utils/locationUtils';
import Toast from 'react-native-toast-message';
import { shopService, ShopListItem, DEFAULT_SHOPS } from '../../services/shopService';
import LocationAccuracyModal from '../../components/LocationAccuracyModal';

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateProfile } from '../../store/authSlice';

const STORE_COVERS = [
  require('../../../assets/myimages/shop_cover_pearl.png'),
  require('../../../assets/myimages/shop_cover_fresh.png'),
  require('../../../assets/myimages/shop_cover_quick.png'),
  require('../../../assets/myimages/shop_cover_premium.png'),
];

const getShopCoverImage = (shop: ShopListItem, index: number = 0) => {
  const url = resolveImageUrl(shop?.cover_image);
  if (url) return { uri: url };
  const id = typeof shop.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  return STORE_COVERS[(id - 1) % STORE_COVERS.length];
};

const formatShopLocation = (shop: ShopListItem) => {
  const area = (shop.area || '').trim();
  const city = (shop.city || '').trim();
  if (area && city && area.toLowerCase() !== city.toLowerCase()) {
    return `${area}, ${city}`;
  }
  if (area) return `${area}, Pune`;
  if (city) return `${city}`;
  return 'Wakad, Pune';
};

const SafeShopCoverImage = ({ shop, index = 0, style, resizeMode = 'cover' }: any) => {
  const shopId = typeof shop?.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  const fallbackAsset = STORE_COVERS[(shopId - 1) % STORE_COVERS.length];

  const getSource = () => {
    const raw = shop?.cover_url || shop?.cover_image || shop?.cover;
    const url = resolveImageUrl(raw);
    if (url) {
      return { uri: url };
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [shop?.cover_url, shop?.cover_image, shop?.cover, shop?.id]);

  return (
    <Image
      source={src}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setSrc(fallbackAsset);
      }}
    />
  );
};

export const NearByScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [shops, setShops] = useState<ShopListItem[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchLocation();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchLocation = useCallback(async (isRef = false, userTriggered = false) => {
    if (isMounted.current && !isRef) setLoading(true);
    let lat = 18.5590;
    let lng = 73.7868;

    try {
      let granted = false;
      if (userTriggered) {
        granted = await requestLocationPermission();
      } else {
        if (Platform.OS === 'ios') {
          granted = true;
        } else {
          granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      }

      if (granted) {
        try {
          if (userTriggered) {
            Toast.show({ type: 'info', text1: 'Detecting current GPS location...' });
          }
          const coords = await getCurrentLocation();
          lat = coords.latitude;
          lng = coords.longitude;
          const geocoded = await reverseGeocode(lat, lng);
          if (isMounted.current) {
            setAddress(geocoded);
            dispatch(updateProfile({
              latitude: lat,
              longitude: lng,
              address: geocoded.address_line1,
              city: geocoded.city || 'Pune',
              pincode: geocoded.pincode || '411057',
            }));
          }
          if (userTriggered) {
            Toast.show({
              type: 'success',
              text1: '📍 Current Location Fetched',
              text2: geocoded.address_line1,
            });
          }
        } catch {
          if (isMounted.current) {
            setAddress({
              address_line1: `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
              city: 'Pune',
              pincode: '411057',
              label: 'Current Location',
              latitude: lat,
              longitude: lng,
            });
          }
        }
      } else {
        if (isMounted.current) {
          const userSavedLabel = user?.address
            ? `${user.address}, ${user.area || 'Wakad'}`
            : 'Wakad, Pune (Customer Location)';
          setAddress({
            address_line1: userSavedLabel,
            city: user?.city || 'Pune',
            pincode: user?.pincode || '411057',
            label: 'Saved Customer Location',
            latitude: user?.latitude || lat,
            longitude: user?.longitude || lng,
          });
        }
      }
    } catch {
      if (isMounted.current) {
        const userSavedLabel = user?.address
          ? `${user.address}, ${user.area || 'Wakad'}`
          : 'Wakad, Pune (Customer Location)';
        setAddress({
          address_line1: userSavedLabel,
          city: user?.city || 'Pune',
          pincode: user?.pincode || '411057',
          label: 'Saved Customer Location',
          latitude: user?.latitude || lat,
          longitude: user?.longitude || lng,
        });
      }
    }

    // Always fetch nearby registered shops using customer lat, lng
    try {
      const data = await shopService.getNearbyShops(lat, lng);
      const rawShops = data && data.length > 0 ? data : DEFAULT_SHOPS;
      const processed = rawShops.map((shop) => {
        if (shop.latitude && shop.longitude) {
          return {
            ...shop,
            distance: calculateDistance(lat, lng, shop.latitude, shop.longitude),
          };
        }
        return shop;
      });
      if (isMounted.current) {
        setShops(processed);
      }
    } catch (err) {
      console.warn('Failed to fetch nearby shops', err);
      if (isMounted.current) {
        setShops(DEFAULT_SHOPS);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocation(true);
  };

  const renderShop = ({ item, index }: { item: ShopListItem; index: number }) => {
    const userLat = Number(user?.latitude || address?.latitude || 18.5980);
    const userLng = Number(user?.longitude || address?.longitude || 73.7680);
    const distanceText = item.latitude && item.longitude
      ? calculateDistance(userLat, userLng, Number(item.latitude), Number(item.longitude))
      : (item.distance || '0.4 km away (4 mins)');

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[
          styles.shopCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#321D8C',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
          },
        ]}
        onPress={() => navigation.navigate('ShopDetail', { shopId: item.id, shopName: item.name })}
      >
        {/* Cover Photo & Badges */}
        <View style={styles.imageContainer}>
          <SafeShopCoverImage shop={item} index={index} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.badgeRow}>
            {item.is_verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#321D8C' }]}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.is_open !== false ? '#22C55E' : '#EF4444' },
              ]}
            >
              <Text style={styles.statusText}>{item.is_open !== false ? 'OPEN NOW' : 'CLOSED'}</Text>
            </View>
          </View>
        </View>

        {/* Details Content */}
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.shopName, { color: '#321D8C' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingBox}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={[styles.ratingNumber, { color: colors.text }]}>
                {Number(item.rating || 4.8).toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={styles.locationDetailRow}>
            <Text style={styles.pinEmoji}>📍</Text>
            <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatShopLocation(item)}
            </Text>
          </View>

          {/* Highlights Row */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: '#EDE8FF' }]}>
              <Text style={[styles.chipText, { color: '#321D8C' }]}>📍 {distanceText}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.chipText, { color: '#D97706' }]}>⚡ Express Delivery</Text>
            </View>
            {item.offers_free_pickup && (
              <View style={[styles.chip, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.chipText, { color: '#15803D' }]}>🎁 Free Pickup</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Action Row */}
          <View style={styles.actionRow}>
            <View>
              <Text style={[styles.minOrderLabel, { color: colors.textSecondary }]}>Min. Order</Text>
              <Text style={[styles.minOrderVal, { color: colors.text }]}>
                ₹{item.min_order_amount || 199}
              </Text>
            </View>
            <LinearGradient
              colors={['#321D8C', '#5B52E8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.orderBtnGradient}
            >
              <Text style={styles.orderBtnText}>View Laundry →</Text>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: '#321D8C' }]}>Nearby Laundries</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchLocation(true, true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>🔄</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.locationRow}>
            <ActivityIndicator size="small" color="#5B52E8" />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              Finding laundries near customer location...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => fetchLocation(true, true)}
            style={[styles.locationBanner, { backgroundColor: '#F4F3FA' }]}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16, marginRight: 6 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationBannerTitle, { color: '#321D8C' }]}>
                Customer Registered Location
              </Text>
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {address ? `${address.address_line1}, ${address.city || 'Pune'}` : 'Wakad, Pune 411057'}
              </Text>
            </View>
            <Text style={[styles.changeLocText, { color: '#5B52E8' }]}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      <FlatList
        data={shops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShop}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B52E8" />
        }
        ListHeaderComponent={
          shops.length > 0 ? (
            <View style={styles.listHeaderContainer}>
              <Text style={[styles.listHeaderCount, { color: colors.textSecondary }]}>
                Showing {shops.length} registered laundries near you
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No shops found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Could not load laundries. Pull down to refresh.
              </Text>
            </View>
          ) : null
        }
      />

      <LocationAccuracyModal
        visible={showLocationModal}
        onTurnOn={async () => {
          setShowLocationModal(false);
          await fetchLocation(true, true);
        }}
        onNoThanks={() => setShowLocationModal(false)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F4F3FA',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  locationBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  changeLocText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  listHeaderContainer: {
    marginBottom: SPACING.md,
  },
  listHeaderCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  shopCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    padding: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  starIcon: {
    fontSize: 12,
    marginRight: 3,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pinEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minOrderLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  minOrderVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  orderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NearByScreen;
