import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { API_BASE_URL, resolveImageUrl } from '../../constants/config';
import { RootState } from '../../store';
import { updateProfile } from '../../store/authSlice';
import { setOrders, ordersLoading, ordersError } from '../../store/orderSlice';
import { orderService } from '../../services/orderService';
import {
  categoryService,
  Category,
  STATIC_CATEGORIES,
} from '../../services/categoryService';
import { OrderCard } from '../../components/OrderCard';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import LocationAccuracyModal from '../../components/LocationAccuracyModal';
import Toast from 'react-native-toast-message';
import { requestLocationPermission, getCurrentLocation, reverseGeocode, calculateDistance, getDistanceInKm, geocodeAddress } from '../../utils/locationUtils';
import { shopService, ShopListItem, DEFAULT_SHOPS, isApprovedShop } from '../../services/shopService';
import { addressService } from '../../services/addressService';
import { Address } from '../../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { walletService } from '../../services/walletService';
import { setWallet } from '../../store/walletSlice';
import { apiClient } from '../../api/client';

const PROMOS = [
  { id: 1, text: 'First order 20% OFF', sub: 'Use code: DHOBI20', bg: '#D7D9FC' },
  { id: 2, text: 'Free pickup above ₹300', sub: 'No extra charges', bg: '#FDE0D3' },
  { id: 3, text: 'Premium at ₹99/kg', sub: 'This weekend only', bg: '#FDDFC2' },
];

import bannersJson from '../../constants/banners.json';

const BANNER_FALLBACKS = [
  require('../../../assets/myimages/admin_banner_super_clean.png'),
  require('../../../assets/myimages/admin_banner_dry_clean.jpg'),
  require('../../../assets/myimages/admin_banner_wash_fold.jpg'),
  require('../../../assets/myimages/shop_cover_pearl.png'),
  require('../../../assets/myimages/slider_img.png'),
];

export const DEFAULT_BANNERS = (Array.isArray(bannersJson) && bannersJson.length > 0 ? bannersJson : [
  {
    id: '1',
    title: 'Super Clean Wash',
    subtitle: 'Special festive laundry & dry clean offer',
    tag: 'ACTIVE',
    tagColor: '#10B981',
    image: '/uploads/banners/banner_30_1791351874.png',
  },
  {
    id: '2',
    title: 'Flat 30% OFF on First Dry Clean Order',
    subtitle: 'Use code FIRST30 on your order',
    tag: 'ACTIVE',
    tagColor: '#10B981',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Express 24-Hour Wash & Fold Service',
    subtitle: 'Doorstep pickup & next-day delivery',
    tag: 'ACTIVE',
    tagColor: '#10B981',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
  },
]);

const LOCAL_BANNER_ASSETS: Record<string, any> = {
  'banner_47_1791545229.png': require('../../../assets/myimages/banner_47_1791545229.png'),
  'banner_30_1791351874.png': require('../../../assets/myimages/banner_30_1791351874.png'),
  'admin_banner_super_clean.png': require('../../../assets/myimages/admin_banner_super_clean.png'),
  'admin_banner_dry_clean.jpg': require('../../../assets/myimages/admin_banner_dry_clean.jpg'),
  'admin_banner_wash_fold.jpg': require('../../../assets/myimages/admin_banner_wash_fold.jpg'),
};

const SafeBannerImage = ({ banner, index = 0, style, cardWidth, cardHeight }: any) => {
  const fallbackAsset = banner?.localAsset || BANNER_FALLBACKS[index % BANNER_FALLBACKS.length];

  const getSource = () => {
    const raw = String(banner?.image || banner?.image_url || banner?.url || banner?.banner_url || '').trim();
    if (raw.length > 0) {
      for (const [key, asset] of Object.entries(LOCAL_BANNER_ASSETS)) {
        if (raw.toLowerCase().includes(key.toLowerCase())) {
          return asset;
        }
      }
      const uri = resolveImageUrl(raw);
      if (uri) return { uri };
    }
    if (banner?.localAsset) {
      return banner.localAsset;
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [banner?.image, banner?.image_url, banner?.url, banner?.banner_url, banner?.localAsset, index]);

  return (
    <Image
      source={src}
      style={[
        {
          width: cardWidth || '100%',
          height: cardHeight || '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        },
        style,
      ]}
      resizeMode="cover"
      onError={() => {
        setSrc(fallbackAsset);
      }}
    />
  );
};

// ────────────────────────────────────────────────────────────
//  Category image map (keys match category `key` field)
// ────────────────────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, any> = {
  wash_fold: require('../../../assets/myimages/cat_wash_fold.jpg'),
  wash_iron: require('../../../assets/myimages/cat_wash_iron.jpg'),
  dry_clean: require('../../../assets/myimages/cat_dry_clean.jpg'),
  steam_iron: require('../../../assets/myimages/cat_steam_iron.jpg'),
  shoe_cleaning: require('../../../assets/myimages/cat_shoe_cleaning.jpg'),
  carpet_cleaning: require('../../../assets/myimages/cat_carpet_cleaning.jpg'),
  blanket_cleaning: require('../../../assets/myimages/cat_blanket_cleaning.jpg'),
  curtain_cleaning: require('../../../assets/myimages/cat_curtain_cleaning.jpg'),
  sofa_cover_cleaning: require('../../../assets/myimages/cat_sofa_cover_cleaning.jpg'),
  premium_garments: require('../../../assets/myimages/cat_premium_garments.jpg'),
  express_laundry: require('../../../assets/myimages/cat_express_laundry.jpg'),
  commercial_laundry: require('../../../assets/myimages/cat_commercial_laundry.jpg'),
};

const SERVICE_IMAGES: Record<string, any> = {
  wash_fold: require('../../../assets/myimages/cat_wash_fold_icon.png'),
  wash_iron: require('../../../assets/myimages/cat_wash_iron.jpg'),
  dry_clean: require('../../../assets/myimages/cat_dry_clean.jpg'),
  steam_iron: require('../../../assets/myimages/cat_steam_iron.jpg'),
  shoe_cleaning: require('../../../assets/myimages/cat_shoe_cleaning.jpg'),
  carpet_cleaning: require('../../../assets/myimages/cat_carpet_cleaning.jpg'),
  blanket_cleaning: require('../../../assets/myimages/cat_blanket_cleaning.jpg'),
  curtain_cleaning: require('../../../assets/myimages/cat_curtain_cleaning.jpg'),
  sofa_cover_cleaning: require('../../../assets/myimages/cat_sofa_cover_cleaning.jpg'),
  premium_garments: require('../../../assets/myimages/cat_premium_garments.jpg'),
  express_laundry: require('../../../assets/myimages/cat_express_laundry.jpg'),
  commercial_laundry: require('../../../assets/myimages/cat_commercial_laundry.jpg'),
};

const SERVICE_TITLES: Record<string, string> = {
  wash_fold: 'Wash & Fold',
  wash_iron: 'Wash & Iron',
  dry_clean: 'Dry Cleaning',
  steam_iron: 'Steam Iron',
  shoe_cleaning: 'Shoe Cleaning',
  carpet_cleaning: 'Carpet Cleaning',
  blanket_cleaning: 'Blanket Cleaning',
  curtain_cleaning: 'Curtain Cleaning',
  sofa_cover_cleaning: 'Sofa Cover Cleaning',
  premium_garments: 'Premium Garments',
  express_laundry: 'Express Laundry',
  commercial_laundry: 'Commercial Laundry',
};

const formatSafeOrderDate = (rawDate?: string | null, fallbackDaysOffset = 0): string => {
  if (!rawDate || typeof rawDate !== 'string' || rawDate.trim() === '') {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + fallbackDaysOffset);
    return fallback.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const str = rawDate.trim();

  // If already relative string
  if (/^today/i.test(str)) {
    const d = new Date();
    return `Today, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  if (/^tomorrow/i.test(str)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `Tomorrow, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  // Hermes engine safe: replace space before time with 'T'
  const cleanStr = str.includes(' ') ? str.replace(' ', 'T') : str;
  let d = new Date(cleanStr);

  if (isNaN(d.getTime())) {
    // Try YYYY-MM-DD
    const match = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  if (isNaN(d.getTime())) {
    // Try DD-MM-YYYY
    const match = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) {
      d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }
  }

  if (isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + fallbackDaysOffset);
    return fallback.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  if (isToday) {
    return `Today, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const extractOrderPickupSlot = (order?: any): string => {
  if (!order) return '10:00 AM - 12:00 PM';

  if (order.pickup_slot && typeof order.pickup_slot === 'string' && order.pickup_slot.trim().length > 0) {
    return order.pickup_slot.trim();
  }
  if (order.pickup_time && typeof order.pickup_time === 'string' && order.pickup_time.trim().length > 0) {
    return order.pickup_time.trim();
  }
  if (order.time_slot && typeof order.time_slot === 'string' && order.time_slot.trim().length > 0) {
    return order.time_slot.trim();
  }

  if (order.notes && typeof order.notes === 'string') {
    const match = order.notes.match(/(?:time\s*)?slot[:\s]+([^.,;\n]+)/i);
    if (match && match[1] && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  if (order.pickup_date && typeof order.pickup_date === 'string' && order.pickup_date.includes(',')) {
    const timeCandidate = order.pickup_date.split(',')[1]?.trim();
    if (timeCandidate && (timeCandidate.includes('AM') || timeCandidate.includes('PM'))) {
      return timeCandidate;
    }
  }

  return '10:00 AM - 12:00 PM';
};

const getOrderCategoriesInfo = (order?: any) => {
  const serviceKey = order?.service_type || 'wash_fold';
  const primaryTitle = SERVICE_TITLES[serviceKey] || 'Wash & Fold';
  const primaryImage = SERVICE_IMAGES[serviceKey] || require('../../../assets/myimages/cat_wash_fold_icon.png');

  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      title: primaryTitle,
      categoriesList: [primaryTitle],
      image: primaryImage,
    };
  }

  const detectedCats = new Set<string>();
  order.items.forEach((it: any) => {
    if (it.service_name && typeof it.service_name === 'string' && it.service_name.trim().length > 0) {
      detectedCats.add(it.service_name.trim());
    } else if (it.name && it.name.includes('-')) {
      const parts = it.name.split('-');
      const candidate = parts[0].trim();
      if (candidate.length > 0) detectedCats.add(candidate);
    }
  });

  if (detectedCats.size === 0 && primaryTitle) {
    detectedCats.add(primaryTitle);
  }

  const catArray = Array.from(detectedCats);
  const displayTitle = catArray.length > 0 ? catArray.join(', ') : primaryTitle;

  return {
    title: displayTitle,
    categoriesList: catArray,
    image: primaryImage,
  };
};

const getOrderItemsSummary = (order?: any) => {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      totalCount: 2,
      countLabel: '2 Items',
      shortSummary: '1 Jeans, 1 Saree',
      itemsList: ['1 Jeans', '1 Saree'],
    };
  }

  let totalCount = 0;
  const itemsList: string[] = [];

  order.items.forEach((it: any) => {
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    totalCount += qty;

    let cleanName = (it.item_name || it.name || '').trim();
    if (cleanName.includes('-')) {
      const parts = cleanName.split('-');
      cleanName = parts[parts.length - 1].trim();
    }
    itemsList.push(`${qty} ${cleanName}`);
  });

  const countLabel = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'}`;
  const shortSummary = itemsList.join(', ');

  return {
    totalCount,
    countLabel,
    shortSummary,
    itemsList,
  };
};

// ────────────────────────────────────────────────────────────
//  Circular Category Icon
// ────────────────────────────────────────────────────────────
const CategoryIcon: React.FC<{
  item: Category;
  onPress: () => void;
  colors: typeof COLORS;
}> = ({ item, onPress, colors }) => {
  const { isDark } = useTheme();
  const key = item.key || (item as any).slug;
  const catImage = CATEGORY_IMAGES[key];
  return (
    <TouchableOpacity style={styles.catItem} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.catCircle, {
        backgroundColor: isDark ? colors.card : '#FFFFFF',
        borderColor: isDark ? colors.border : '#F0EEFA',
        borderWidth: 2.5,
        shadowColor: '#321D8C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 10,
        elevation: 3,
        overflow: 'hidden',
      }]}>
        {catImage ? (
          <Image
            source={catImage}
            style={{ width: 50, height: 45, left: -1 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.catEmoji, { fontSize: 32 }]}>{item.icon || '🧺'}</Text>
        )}
      </View>
      <Text style={[styles.catLabel, { color: isDark ? colors.text : '#321D8C', fontWeight: '600' }]} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

const STORE_COVERS = [
  require('../../../assets/myimages/shop_cover_pearl.png'),
  require('../../../assets/myimages/shop_cover_fresh.png'),
  require('../../../assets/myimages/shop_cover_quick.png'),
  require('../../../assets/myimages/shop_cover_premium.png'),
];

const STORE_LOGOS = [
  require('../../../assets/myimages/cat_wash_fold_icon.png'),
  require('../../../assets/myimages/cat_dry_clean.jpg'),
  require('../../../assets/myimages/cat_steam_iron.jpg'),
  require('../../../assets/myimages/cat_express_laundry.jpg'),
];

const SafeShopCoverImage = ({ shop, index = 0, style, resizeMode = 'cover' }: any) => {
  const shopId = typeof shop?.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  const fallbackAsset = STORE_COVERS[(shopId - 1) % STORE_COVERS.length];

  const getSource = () => {
    const raw = shop?.cover_url || shop?.cover_image || shop?.cover || shop?.banner_url || shop?.shop_banner;
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const uri = resolveImageUrl(raw);
      if (uri) {
        return { uri };
      }
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [shop?.cover_url, shop?.cover_image, shop?.cover, shop?.banner_url, shop?.shop_banner, shop?.id]);

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

const SafeShopLogoImage = ({ shop, index = 0, style, resizeMode = 'cover' }: any) => {
  const shopId = typeof shop?.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  const fallbackAsset = STORE_LOGOS[(shopId - 1) % STORE_LOGOS.length];

  const getSource = () => {
    const raw = shop?.logo_url || shop?.logo || shop?.logo_image || shop?.shop_logo;
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const uri = resolveImageUrl(raw);
      if (uri) {
        return { uri };
      }
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [shop?.logo_url, shop?.logo, shop?.logo_image, shop?.shop_logo, shop?.id]);

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

const getShopCoverImage = (shop: ShopListItem, index: number = 0) => {
  const url = resolveImageUrl(shop?.cover_image || (shop as any)?.cover_url || (shop as any)?.cover);
  if (url) return { uri: url };
  const id = typeof shop.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  return STORE_COVERS[(id - 1) % STORE_COVERS.length];
};

const getShopLogoImage = (shop: ShopListItem, index: number = 0) => {
  const url = resolveImageUrl(shop?.logo || (shop as any)?.logo_url);
  if (url) return { uri: url };
  const id = typeof shop.id === 'number' && shop.id > 0 ? shop.id : (index + 1);
  return STORE_LOGOS[(id - 1) % STORE_LOGOS.length];
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

const PUNE_HUBS = [
  { name: 'Wakad', city: 'Pune', lat: 18.5980, lng: 73.7680, pincode: '411057', icon: '🧺' },
  { name: 'Hinjawadi', city: 'Pune', lat: 18.5913, lng: 73.7389, pincode: '411057', icon: '💻' },
  { name: 'Pimpri-Chinchwad', city: 'Pune', lat: 18.6298, lng: 73.7997, pincode: '411018', icon: '🏭' },
  { name: 'Baner', city: 'Pune', lat: 18.5590, lng: 73.7868, pincode: '411045', icon: '🏢' },
  { name: 'Aundh', city: 'Pune', lat: 18.5580, lng: 73.8075, pincode: '411007', icon: '🛍️' },
  { name: 'Kothrud', city: 'Pune', lat: 18.5074, lng: 73.8077, pincode: '411038', icon: '🏫' },
  { name: 'Ravet', city: 'Pune', lat: 18.6483, lng: 73.7485, pincode: '412101', icon: '🏘️' },
  { name: 'Viman Nagar', city: 'Pune', lat: 18.5679, lng: 73.9143, pincode: '411014', icon: '✈️' },
];

// ────────────────────────────────────────────────────────────
//  HomeScreen
// ────────────────────────────────────────────────────────────
export const HomeScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const promoScrollViewRef = useRef<ScrollView>(null);
  const { isDark, colors } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const { orders, loading } = useSelector((s: RootState) => s.orders);
  const { unreadCount } = useSelector((s: RootState) => s.notifications);
  const { balance } = useSelector((s: RootState) => s.wallet);

  const [refreshing, setRefreshing] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [catsLoading, setCatsLoading] = useState(false);
  const [currentLocationLabel, setCurrentLocationLabel] = useState(user?.area ? `${user.area}, ${user.city || 'Pune'}` : 'Wakad, Pune');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const loadSavedAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      if (Array.isArray(data)) {
        setSavedAddresses(data);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses, user?.address]);

  // Recalculate distance and reload shops whenever customer changes their address or coordinates anywhere in the app
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      fetchShops(Number(user.latitude), Number(user.longitude));
    }
    if (user?.address) {
      const parts = user.address.split(',');
      const label = parts.slice(0, 2).join(',').trim() || user.area || 'Wakad, Pune';
      setCurrentLocationLabel(label);
    }
  }, [user?.latitude, user?.longitude, user?.address]);

  const [popularShops, setPopularShops] = useState<ShopListItem[]>(DEFAULT_SHOPS);
  const [nearbyShops, setNearbyShops] = useState<ShopListItem[]>(DEFAULT_SHOPS);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [banners, setBanners] = useState<any[]>(DEFAULT_BANNERS);
  const [selectedCategoryForShops, setSelectedCategoryForShops] = useState<Category | null>(null);

  // Recalculate distance and reload shops whenever customer location arrives from MapScreen
  useEffect(() => {
    if (route?.params?.selectedLocation) {
      const loc = route.params.selectedLocation;
      const lat = Number(loc.latitude || 18.5980);
      const lng = Number(loc.longitude || 73.7680);
      const parts = (loc.address_line1 || loc.address || '').split(',');
      const shortLabel = parts.slice(0, 2).join(',').trim() || loc.label || loc.area || 'Wakad, Pune';
      setCurrentLocationLabel(shortLabel);
      dispatch(updateProfile({
        latitude: lat,
        longitude: lng,
        address: loc.address_line1 || loc.address,
        area: loc.area || parts[0]?.trim() || 'Wakad',
        city: loc.city || 'Pune',
        pincode: loc.pincode || '411057',
      }));
      fetchShops(lat, lng);
      Toast.show({
        type: 'success',
        text1: '📍 Delivery Location Updated',
        text2: `Distance to laundries recalculated for ${shortLabel}`,
      });
    }
  }, [route?.params?.selectedLocation]);

  const availableShopsForCategory = React.useMemo(() => {
    if (!selectedCategoryForShops) return [];

    const combined = [...popularShops, ...nearbyShops, ...DEFAULT_SHOPS];
    const map = new Map<number, ShopListItem>();
    for (const s of combined) {
      if (s && s.id && !map.has(s.id)) {
        // Only include approved, active shops verified by admin panel
        if (isApprovedShop(s)) {
          map.set(s.id, s);
        }
      }
    }
    const allValidShops = Array.from(map.values());

    const catId = Number(selectedCategoryForShops.id);
    const catKey = (selectedCategoryForShops.key || (selectedCategoryForShops as any).slug || '').toLowerCase();
    const catName = (selectedCategoryForShops.name || '').toLowerCase();

    return allValidShops.filter((shop) => {
      // 1. Check category ID match from backend shop_services
      if (shop.service_category_ids && shop.service_category_ids.length > 0) {
        if (shop.service_category_ids.includes(catId)) return true;
      }
      // 2. Check category slug/key match
      if (shop.category_slugs && shop.category_slugs.length > 0) {
        if (shop.category_slugs.some((sl) => sl.toLowerCase() === catKey || catKey.includes(sl.toLowerCase()) || sl.toLowerCase().includes(catKey))) {
          return true;
        }
      }
      // 3. Check service name match
      if (shop.services_list && shop.services_list.length > 0) {
        if (shop.services_list.some((sName) => sName.toLowerCase().includes(catName) || catName.includes(sName.toLowerCase()))) {
          return true;
        }
      }
      // Fallback matching for the registered DB shops
      if (shop.id === 47) {
        if ([1, 2, 3, 4, 5, 7].includes(catId)) return true;
        if (['wash_fold', 'wash_iron', 'dry_clean', 'steam_iron', 'shoe_cleaning', 'blanket_cleaning'].includes(catKey)) return true;
      }
      if (shop.id === 44) {
        if ([1, 2, 3].includes(catId)) return true;
        if (['wash_fold', 'wash_iron', 'dry_clean'].includes(catKey)) return true;
      }
      if (shop.id === 48) {
        if ([1, 2, 3, 4].includes(catId)) return true;
        if (['wash_fold', 'wash_iron', 'dry_clean', 'steam_iron'].includes(catKey)) return true;
      }

      return false;
    });
  }, [selectedCategoryForShops, popularShops, nearbyShops]);

  const getShopDistance = useCallback((shop: ShopListItem) => {
    const userLat = Number(user?.latitude || 18.5980);
    const userLng = Number(user?.longitude || 73.7680);
    if (shop.latitude && shop.longitude) {
      return calculateDistance(userLat, userLng, Number(shop.latitude), Number(shop.longitude));
    }
    return shop.distance || '0.8 km away (6 mins)';
  }, [user?.latitude, user?.longitude]);

  // ── Fetch shops & dynamically compute distance from customer location ──
  const fetchShops = useCallback(async (lat?: number, lng?: number) => {
    setShopsLoading(true);
    const userLat = lat || Number(user?.latitude || 18.5980);
    const userLng = lng || Number(user?.longitude || 73.7680);

    try {
      const popular = await shopService.getPopularShops();
      const rawPopular = Array.isArray(popular) && popular.length > 0 ? popular : DEFAULT_SHOPS;
      const processedPopular = rawPopular.map((shop) => ({
        ...shop,
        distance: shop.latitude && shop.longitude
          ? calculateDistance(userLat, userLng, Number(shop.latitude), Number(shop.longitude))
          : shop.distance,
      }));
      setPopularShops(processedPopular);

      const nearby = await shopService.getNearbyShops(userLat, userLng);
      const rawNearby = Array.isArray(nearby) && nearby.length > 0 ? nearby : DEFAULT_SHOPS;
      const processedNearby = rawNearby.map((shop) => {
        const km = shop.latitude && shop.longitude
          ? getDistanceInKm(userLat, userLng, Number(shop.latitude), Number(shop.longitude))
          : 999;
        return {
          ...shop,
          distance: shop.latitude && shop.longitude
            ? calculateDistance(userLat, userLng, Number(shop.latitude), Number(shop.longitude))
            : shop.distance,
          distanceKm: km,
        };
      }).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      setNearbyShops(processedNearby);

      // Fetch global banners uploaded by admin / laundry owner
      try {
        const bannersRes = await apiClient.get('/banners');
        const list = bannersRes.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          const merged = [...list];
          if (Array.isArray(bannersJson)) {
            for (const bj of bannersJson) {
              if (!merged.some((m: any) => String(m.id) === String(bj.id))) {
                merged.push(bj);
              }
            }
          }
          setBanners(merged);
        } else if (Array.isArray(bannersJson) && bannersJson.length > 0) {
          setBanners(bannersJson);
        }
      } catch (err) {
        console.warn('Failed to fetch banners', err);
        if (Array.isArray(bannersJson) && bannersJson.length > 0) {
          setBanners(bannersJson);
        }
      }

    } catch (e: any) {
      console.warn('Failed to fetch shops', e);
    } finally {
      setShopsLoading(false);
    }
  }, [user?.latitude, user?.longitude]);

  // Fetch current location address for header when user taps location
  const fetchCurrentLocation = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        Toast.show({ type: 'info', text1: 'Detecting current GPS location...' });
        const { latitude, longitude } = await getCurrentLocation();
        const geocoded = await reverseGeocode(latitude, longitude);
        const parts = geocoded.address_line1.split(',');
        const shortLabel = parts.slice(0, 2).join(',').trim();
        setCurrentLocationLabel(shortLabel || geocoded.address_line1);
        dispatch(updateProfile({
          latitude,
          longitude,
          address: geocoded.address_line1,
          city: geocoded.city || 'Pune',
          pincode: geocoded.pincode || '411057',
        }));
        fetchShops(latitude, longitude);
        Toast.show({
          type: 'success',
          text1: '📍 Current Location Fetched',
          text2: geocoded.address_line1,
        });
      } else {
        setShowLocationModal(true);
      }
    } catch {
      setShowLocationModal(true);
    }
  }, [dispatch, fetchShops]);

  const handleTurnOnLocation = async () => {
    setShowLocationModal(false);
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        Toast.show({ type: 'info', text1: 'Detecting current GPS location...' });
        const { latitude, longitude } = await getCurrentLocation();
        const geocoded = await reverseGeocode(latitude, longitude);
        const parts = geocoded.address_line1.split(',');
        const shortLabel = parts.slice(0, 2).join(',').trim();
        setCurrentLocationLabel(shortLabel || geocoded.address_line1);
        dispatch(updateProfile({
          latitude,
          longitude,
          address: geocoded.address_line1,
          city: geocoded.city || 'Pune',
          pincode: geocoded.pincode || '411057',
        }));
        fetchShops(latitude, longitude);
        Toast.show({
          type: 'success',
          text1: '📍 Current Location Fetched',
          text2: geocoded.address_line1,
        });
      } else {
        setCurrentLocationLabel('Wakad, Pune');
        Toast.show({
          type: 'info',
          text1: 'Location Permission Denied',
          text2: 'Using customer saved location Wakad, Pune',
        });
      }
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: e?.message || 'Could not fetch current location',
      });
    }
  };

  const handleUseCurrentGps = async () => {
    setShowLocationPickerModal(false);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setShowLocationModal(true);
        return;
      }
      Toast.show({ type: 'info', text1: 'Detecting GPS coordinates...' });
      const { latitude, longitude } = await getCurrentLocation();
      const geocoded = await reverseGeocode(latitude, longitude);
      const parts = geocoded.address_line1.split(',');
      const shortLabel = parts.slice(0, 2).join(',').trim();
      setCurrentLocationLabel(shortLabel || geocoded.address_line1);
      dispatch(updateProfile({
        latitude,
        longitude,
        address: geocoded.address_line1,
        area: geocoded.city || 'Wakad',
        city: geocoded.city || 'Pune',
        pincode: geocoded.pincode || '411057',
      }));
      fetchShops(latitude, longitude);
      Toast.show({
        type: 'success',
        text1: '📍 Current Location Detected',
        text2: `Distance recalculated from ${shortLabel || geocoded.address_line1}`,
      });
    } catch (e: any) {
      setShowLocationModal(true);
    }
  };

  const handleSelectPredefinedArea = (hub: typeof PUNE_HUBS[0]) => {
    setShowLocationPickerModal(false);
    const label = `${hub.name}, ${hub.city}`;
    setCurrentLocationLabel(label);
    dispatch(updateProfile({
      latitude: hub.lat,
      longitude: hub.lng,
      area: hub.name,
      city: hub.city,
      address: `${hub.name}, ${hub.city} - ${hub.pincode}`,
      pincode: hub.pincode,
    }));
    fetchShops(hub.lat, hub.lng);
    Toast.show({
      type: 'success',
      text1: `📍 Delivery Location: ${hub.name}`,
      text2: 'Distances to laundries recalculated!',
    });
  };

  const handleSelectSavedAddress = async (addr: Address) => {
    setShowLocationPickerModal(false);
    let lat = Number(addr.latitude || 0);
    let lng = Number(addr.longitude || 0);

    if (!lat || !lng || lat === 0 || lng === 0) {
      const geocoded = await geocodeAddress(`${addr.address_line1}, ${addr.city}`);
      lat = geocoded?.latitude || 18.5980;
      lng = geocoded?.longitude || 73.7680;
    }

    const parts = (addr.address_line1 || '').split(',');
    const shortLabel = parts.slice(0, 2).join(',').trim() || addr.label || 'Wakad, Pune';
    setCurrentLocationLabel(shortLabel);

    dispatch(updateProfile({
      latitude: lat,
      longitude: lng,
      address: addr.address_line1,
      city: addr.city || 'Pune',
      pincode: addr.pincode || '411057',
      area: addr.label || 'Home',
    }));

    fetchShops(lat, lng);
    Toast.show({
      type: 'success',
      text1: `📍 Switched to ${addr.label || 'Address'}`,
      text2: 'Laundry distances recalculated!',
    });
  };

  const activeOrders = (Array.isArray(orders) ? orders : []).filter(
    (o) => o && !['delivered', 'cancelled'].includes(o.status)
  );

  // ── Fetch categories ──────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCatsLoading(true);
    const data = await categoryService.getCategories();
    setCategories(data);
    setCatsLoading(false);
  }, []);

  // ── Fetch orders ──────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    dispatch(ordersLoading());
    try {
      const data = await orderService.getActiveOrders();
      dispatch(setOrders(data));
    } catch (e: any) {
      dispatch(ordersError(e.message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOrders();
    fetchCategories();
    fetchShops();   // ← always fetch popular shops on mount
    walletService.getWallet().then((w) => {
      dispatch(setWallet(w));
    }).catch(() => {});
    const timer = setInterval(() => {
      setPromoIndex((i) => {
        const total = banners && banners.length > 0 ? banners.length : DEFAULT_BANNERS.length;
        return (i + 1) % total;
      });
    }, 3500);
    return () => {
      clearInterval(timer);
    };
  }, [fetchOrders, fetchCategories, fetchShops, dispatch, banners.length]);

  // Automatically scroll when promoIndex changes
  useEffect(() => {
    if (promoScrollViewRef.current) {
      const cardWidth = Dimensions.get('window').width * 0.88 + SPACING.md;
      promoScrollViewRef.current.scrollTo({
        x: promoIndex * cardWidth,
        animated: true,
      });
    }
  }, [promoIndex]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchCategories(), fetchShops()]);
    setRefreshing(false);
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderHomeContent = () => (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Decorative Sparkles & Bubbles overlays (Slider side & Footer side) */}
      {!isDark && (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', top: 190, left: -15, zIndex: 99 }}>
            <Image
              source={require('../../../assets/myimages/bubbles.png')}
              style={{
                width: 55,
                height: 55,
                opacity: 0.12,
                transform: [{ rotate: '45deg' }],
              }}
              resizeMode="contain"
            />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', top: 150, right: 20, zIndex: 99 }}>
            <Image
              source={require('../../../assets/myimages/sparkles.png')}
              style={{
                width: 28,
                height: 28,
                opacity: 0.18,
              }}
              resizeMode="contain"
            />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 100, left: 20, zIndex: 99 }}>
            <Image
              source={require('../../../assets/myimages/sparkles.png')}
              style={{
                width: 26,
                height: 26,
                opacity: 0.18,
              }}
              resizeMode="contain"
            />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 120, right: -15, zIndex: 99 }}>
            <Image
              source={require('../../../assets/myimages/bubbles.png')}
              style={{
                width: 60,
                height: 60,
                opacity: 0.12,
                transform: [{ rotate: '-30deg' }],
              }}
              resizeMode="contain"
            />
          </View>
        </>
      )}

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: 'transparent', paddingTop: Math.max(insets.top, SPACING.md) }]}>
        <View style={{ flex: 1, marginRight: SPACING.md }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
            onPress={() => setShowLocationPickerModal(true)}
          >
            <Text style={{ fontSize: 14 }}>📍</Text>
            <Text style={[styles.greeting, { color: colors.textSecondary, marginLeft: 4, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
              {user?.area ? `${user.area}, ${user.city || 'Pune'}` : currentLocationLabel} ▾
            </Text>
          </TouchableOpacity>
          <Text style={[styles.username, { color: colors.text }]}>
            {greet()} {user?.name ? user.name.split(' ')[0] : ''} 👋
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Wallet Chip */}
          <TouchableOpacity
            style={[styles.walletChip, { backgroundColor: colors.primaryLight }]}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Text style={styles.walletEmoji}>💰</Text>
            <Text style={[styles.walletText, { color: colors.primary }]}>
              ₹{parseFloat(user?.wallet_balance || String(balance || 0)).toFixed(0)}
            </Text>
          </TouchableOpacity>
          {/* Notification Bell */}
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.peach }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.notifEmoji}>🔔</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Search Bar ── */}
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={[styles.searchPlaceholder, { color: colors.textLight }]}>
            Search laundry shops...
          </Text>
        </TouchableOpacity>

        
        {/* ── Promo Banner Slider Cards (Managed via Admin Panel) ── */}
        {(() => {
          const list = (banners && banners.length > 0) ? banners : DEFAULT_BANNERS;
          const screenWidth = Dimensions.get('window').width;
          const cardWidth = Math.round(screenWidth * 0.90);
          const cardHeight = 165;

          return (
            <View style={{ marginTop: SPACING.sm, marginBottom: SPACING.md }}>
              <ScrollView
                ref={promoScrollViewRef}
                horizontal
                pagingEnabled={false}
                snapToInterval={cardWidth + SPACING.md}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingVertical: 4 }}
                onMomentumScrollEnd={(e) => {
                  const scrollX = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(scrollX / (cardWidth + SPACING.md));
                  setPromoIndex(Math.max(0, Math.min(idx, list.length - 1)));
                }}
              >
                {list.map((item: any, index: number) => {
                  return (
                    <View
                      key={item.id ? `banner-${item.id}` : `banner-${index}`}
                      style={{
                        width: cardWidth,
                        height: cardHeight,
                        marginRight: index === list.length - 1 ? 0 : SPACING.md,
                        borderRadius: 18,
                        overflow: 'hidden',
                        backgroundColor: '#321D8C',
                        shadowColor: '#321D8C',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.16,
                        shadowRadius: 10,
                        elevation: 5,
                      }}
                    >
                      {/* Banner Image with Guaranteed Auto-Fallback */}
                      <SafeBannerImage
                        banner={item}
                        index={index}
                        cardWidth={cardWidth}
                        cardHeight={cardHeight}
                      />

                      {/* Soft Bottom Gradient for crisp readable text without darkening the artwork */}
                      <LinearGradient
                        colors={['transparent', 'rgba(10,5,35,0.20)', 'rgba(10,5,35,0.72)']}
                        locations={[0.45, 0.75, 1.0]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Top Tag Badge */}
                      <View style={{ position: 'absolute', top: 12, left: 14 }}>
                        <View style={{
                          backgroundColor: item.tagColor || '#5B52E8',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                            {item.tag || 'FEATURED OFFER'}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Banner Content */}
                      <View style={{ position: 'absolute', bottom: 12, left: 14, right: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text
                            style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 }}
                            numberOfLines={1}
                          >
                            {item.title || 'Special Laundry Discount'}
                          </Text>
                          {!!(item.subtitle || item.sub) && (
                            <Text
                              style={{ color: '#E0E7FF', fontSize: 11, fontWeight: '600', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }}
                              numberOfLines={1}
                            >
                              {item.subtitle || item.sub}
                            </Text>
                          )}
                        </View>

                        <View style={{
                          backgroundColor: '#FFFFFF',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Text style={{ color: '#321D8C', fontSize: 11, fontWeight: '800' }}>Featured</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Pagination Dots */}
              {list.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                  {list.map((_: any, idx: number) => {
                    const isActive = promoIndex === idx;
                    return (
                      <View
                        key={`dot-${idx}`}
                        style={{
                          width: isActive ? 16 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isActive ? '#5B52E8' : '#D1D5DB',
                          marginHorizontal: 3,
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}


        {/* ── Recent Booking ── */}
        {(() => {
          const latestOrder = activeOrders.length > 0 ? activeOrders[0] : (orders.length > 0 ? orders[0] : null);
          if (!latestOrder) return null;

          const categoriesInfo = getOrderCategoriesInfo(latestOrder);
          const itemsSummary = getOrderItemsSummary(latestOrder);
          const formattedPickupDate = formatSafeOrderDate(latestOrder?.pickup_date, 0);
          const pickupTimeSlot = extractOrderPickupSlot(latestOrder);
          const formattedDeliveryDate = formatSafeOrderDate(latestOrder?.delivery_date, 2);

          let statusLabel = 'Scheduled';
          let statusColor = '#22C55E';
          let statusText = 'Your pickup is confirmed';
          if (latestOrder) {
            if (latestOrder.status === 'placed' || latestOrder.status === 'pending') {
              statusLabel = 'Scheduled';
              statusColor = '#22C55E';
              statusText = 'Your pickup is confirmed';
            } else if (latestOrder.status === 'picked_up' || latestOrder.status === 'washing' || latestOrder.status === 'ironing' || latestOrder.status === 'in_process') {
              statusLabel = 'Processing';
              statusColor = '#E2B93B';
              statusText = 'Items are being cleaned';
            } else if (latestOrder.status === 'ready' || latestOrder.status === 'ready_for_delivery') {
              statusLabel = 'Ready';
              statusColor = '#5B52E8';
              statusText = 'Items are ready to deliver';
            } else if (latestOrder.status === 'customer_confirmed') {
              statusLabel = 'Confirmed';
              statusColor = '#10B981';
              statusText = 'Ready for delivery';
            } else if (latestOrder.status === 'out_for_delivery') {
              statusLabel = 'Out for Delivery';
              statusColor = '#5B52E8';
              statusText = 'Our agent is on the way';
            }
          }

          const serviceImage = categoriesInfo.image;
          const serviceTitle = categoriesInfo.title;

          return (
            <View style={[styles.section, { paddingHorizontal: SPACING.xl }]}>
              <Text style={[styles.upcomingSectionTitle, { color: '#321D8C', fontSize: 16, fontWeight: '800', marginBottom: 8 }]}>Your Recent Booking</Text>
              <View style={[styles.upcomingCard, { backgroundColor: '#FFFFFF', borderColor: '#F4F3FA', shadowColor: '#321D8C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }]}>
                {/* Upper row: Booking info and status badge */}
                <View style={styles.ucHeader}>
                  <View style={styles.ucHeaderLeft}>
                    <View style={styles.ucAvatarBgWrapper}>
                      <Image
                        source={serviceImage}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                        }}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.ucHeaderInfo}>
                      <Text style={[styles.ucTitle, { color: '#321D8C', fontSize: 13, fontWeight: '800' }]} numberOfLines={1}>
                        {serviceTitle}
                      </Text>
                      {latestOrder && (
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 1 }}>
                          Order #{latestOrder.order_number}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.ucHeaderDivider, { backgroundColor: '#F4F3FA' }]} />
                  <View style={styles.ucHeaderRight}>
                    <View style={[styles.ucStatusBadge, { backgroundColor: '#FFFFFF', borderColor: statusColor, borderWidth: 1, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 }]}>
                      <View style={[styles.ucStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.ucStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Text style={[styles.ucConfirmText, { color: colors.textSecondary }]}>{statusText}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.ucDivider, { backgroundColor: '#F4F3FA', marginVertical: 8 }]} />

                {/* Middle row: 2 cards */}
                <View style={[styles.ucMiddleRow, { justifyContent: 'space-between' }]}>
                  {/* Card 1: Pickup */}
                  <View style={{ flex: 1, backgroundColor: isDark ? colors.cardAlt : '#F7F7FA', borderRadius: 10, padding: 12, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={[styles.ucColIconBg, { backgroundColor: isDark ? colors.card : '#EDE8FF', width: 28, height: 28, borderRadius: 14, marginRight: 0 }]}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#5B52E8" />
                      </View>
                      <Text style={[styles.ucColLabel, { color: isDark ? colors.text : '#321D8C', fontSize: 13, fontWeight: '800', marginLeft: 8 }]}>Pickup</Text>
                    </View>
                    <Text style={[styles.ucColDate, { color: isDark ? colors.text : '#321D8C', fontSize: 12, fontWeight: '700' }]} numberOfLines={1}>
                      {formattedPickupDate}
                    </Text>
                    <Text style={[styles.ucColTime, { color: colors.textSecondary, marginTop: 4, fontSize: 11 }]} numberOfLines={1}>
                      {pickupTimeSlot}
                    </Text>
                  </View>

                  {/* Card 2: Items & Categories */}
                  <View style={{ flex: 1, backgroundColor: isDark ? colors.cardAlt : '#F7F7FA', borderRadius: 10, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={[styles.ucColIconBg, { backgroundColor: isDark ? colors.card : '#EDE8FF', width: 28, height: 28, borderRadius: 14, marginRight: 0 }]}>
                        <MaterialCommunityIcons name="tshirt-crew-outline" size={16} color="#5B52E8" />
                      </View>
                      <Text style={[styles.ucColLabel, { color: isDark ? colors.text : '#321D8C', fontSize: 13, fontWeight: '800', marginLeft: 8 }]}>
                        Items ({itemsSummary.totalCount})
                      </Text>
                    </View>
                    <Text style={[styles.ucColDate, { color: '#5B52E8', fontSize: 12, fontWeight: '700' }]} numberOfLines={2}>
                      {itemsSummary.shortSummary}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 10, fontWeight: '500' }} numberOfLines={1}>
                      {categoriesInfo.categoriesList.join(' • ')}
                    </Text>
                  </View>
                </View>

                {/* Estimated Delivery Horizontal Text */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={isDark ? '#A5B4FC' : '#321D8C'} />
                  <Text style={{ fontSize: 13, color: isDark ? colors.text : '#321D8C', marginLeft: 6, fontWeight: '700' }}>Estimated Delivery:</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 4 }}>
                    {formattedDeliveryDate}, 06:00 PM
                  </Text>
                </View>

                {/* Warning Text */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFEBEB', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                    <Text style={{ fontSize: 9, color: '#DC2626', fontWeight: '800' }}>⚠️</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Please keep items packed in a bag.</Text>
                </View>

                {/* Manage Booking Button */}
                <TouchableOpacity
                  style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden' }}
                  onPress={() => {
                    if (latestOrder?.id) {
                      navigation.navigate('OrderDetail', {
                        orderId: latestOrder.id,
                        order: latestOrder,
                        shopName: (latestOrder as any)?.shop_name || latestOrder?.shop?.name,
                        ownerName: (latestOrder as any)?.owner_name || (latestOrder?.shop as any)?.owner_name,
                        shopLocation: (latestOrder as any)?.shop_address || (latestOrder?.shop as any)?.address,
                        shopPhone: (latestOrder as any)?.shop_phone || (latestOrder?.shop as any)?.phone,
                      });
                    } else {
                      navigation.navigate('Orders');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#9B70E5', '#F6AD9C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Manage Booking</Text>
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 6 }}>→</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* ── Laundry Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#321D8C' }]}>Categories</Text>
            {catsLoading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {categories.map((cat) => (
              <CategoryIcon
                key={cat.key}
                item={cat}
                colors={colors}
                onPress={() => setSelectedCategoryForShops(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Popular Laundry ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderTitle, { color: isDark ? colors.text : '#321D8C' }]}>Popular Laundry</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.viewAllBtn}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              <Text style={[styles.viewAllArrow, { color: colors.primary }]}> ❯</Text>
            </TouchableOpacity>
          </View>
          {shopsLoading && popularShops.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopScrollContainer}
            >
              {popularShops.map((shop, index) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.vtShopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id, shopName: shop.name })}
                >
                  <View style={{ position: 'relative', width: '100%' }}>
                    <SafeShopCoverImage
                      shop={shop}
                      index={index}
                      style={styles.vtShopImage}
                      resizeMode="cover"
                    />
                    <View style={styles.vtBadgeOverlay}>
                      {shop.is_verified && (
                        <View style={[styles.vtBadgeVerified, { backgroundColor: '#321D8C' }]}>
                          <Text style={styles.vtBadgeText}>✓ Verified</Text>
                        </View>
                      )}
                      <View style={[styles.vtBadgeOpen, { backgroundColor: shop.is_open !== false ? '#22C55E' : '#EF4444' }]}>
                        <Text style={styles.vtBadgeText}>{shop.is_open !== false ? 'OPEN' : 'CLOSED'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.vtShopInfo}>
                    <Text style={[styles.vtShopName, { color: '#321D8C' }]} numberOfLines={1}>
                      {shop.name}
                    </Text>
                    <View style={styles.vtLocationRow}>
                      <Text style={styles.vtPinEmoji}>📍</Text>
                      <Text style={[styles.vtAddressText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {formatShopLocation(shop)}
                      </Text>
                    </View>
                    <View style={styles.vtDistanceRow}>
                      <Text style={[styles.vtDistanceText, { color: '#5B52E8' }]} numberOfLines={1}>
                        📍 {getShopDistance(shop)}
                      </Text>
                    </View>
                    <View style={styles.vtBottomRow}>
                      <View style={styles.vtRatingCol}>
                        <Text style={styles.vtStarEmoji}>⭐</Text>
                        <Text style={[styles.vtRatingText, { color: colors.text }]}>
                          {Number(shop.rating || 4.8).toFixed(1)} ({shop.review_count || 120})
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Nearby Laundry ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderTitle, { color: '#321D8C' }]}>Nearby Laundry</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NearByTab')} style={styles.viewAllBtn}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              <Text style={[styles.viewAllArrow, { color: colors.primary }]}> ❯</Text>
            </TouchableOpacity>
          </View>
          {shopsLoading && nearbyShops.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopScrollContainer}
            >
              {nearbyShops.map((shop, index) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.hzShopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id, shopName: shop.name })}
                >
                  <View style={{ position: 'relative' }}>
                    <SafeShopCoverImage
                      shop={shop}
                      index={index}
                      style={styles.hzShopImage}
                      resizeMode="cover"
                    />
                    {shop.is_verified && (
                      <View style={styles.hzBadgeVerified}>
                        <Text style={styles.hzBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.hzShopInfo}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.hzShopName, { color: '#321D8C', flex: 1, marginRight: 6 }]} numberOfLines={1}>
                        {shop.name}
                      </Text>
                      <View style={[styles.hzBadgeOpen, { backgroundColor: shop.is_open !== false ? '#22C55E' : '#EF4444' }]}>
                        <Text style={styles.hzBadgeOpenText}>{shop.is_open !== false ? 'OPEN' : 'CLOSED'}</Text>
                      </View>
                    </View>
                    <View style={styles.hzLocationRow}>
                      <Text style={styles.hzPinEmoji}>📍</Text>
                      <Text style={[styles.hzAddressText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {formatShopLocation(shop)}
                      </Text>
                    </View>
                    <View style={styles.hzBottomRow}>
                      <View style={styles.hzRatingCol}>
                        <Text style={styles.hzStarEmoji}>⭐</Text>
                        <Text style={[styles.hzRatingText, { color: colors.text }]}>
                          {Number(shop.rating || 4.8).toFixed(1)} ({shop.review_count || 120})
                        </Text>
                      </View>
                      <View style={[styles.hzBadgeDistance, { backgroundColor: '#EDE8FF' }]}>
                        <Text style={[styles.hzBadgeDistanceText, { color: '#321D8C' }]} numberOfLines={1}>
                          📍 {getShopDistance(shop)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Fresh Laundry Promo Card ── */}
        <Image
          source={require('../../assets/image copy 5.png')}
          style={{
            width: Dimensions.get('window').width,
            height: 290,
            marginTop: SPACING.lg,
            marginBottom: 0,
            alignSelf: 'center',
          }}
          resizeMode="cover"
        />

        <View style={{ height: 0 }} />
      </ScrollView>


      {/* ── Category Laundries Selection Modal ── */}
      <Modal
        visible={selectedCategoryForShops !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCategoryForShops(null)}
      >
        <View style={styles.catModalOverlay}>
          <TouchableOpacity
            style={styles.catModalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedCategoryForShops(null)}
          />
          <View style={[styles.catModalContent, { backgroundColor: colors.card }]}>
            {/* Top Drag Handle */}
            <View style={styles.catModalHandle} />

            {/* Modal Header */}
            <View style={styles.catModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                <View style={[styles.catCircle, { width: 50, height: 50, backgroundColor: isDark ? colors.cardAlt : '#FFFFFF', borderColor: isDark ? colors.border : '#F0EEFA', borderWidth: 2, justifyContent: 'center', alignItems: 'center' }]}>
                  {selectedCategoryForShops && CATEGORY_IMAGES[selectedCategoryForShops.key || (selectedCategoryForShops as any).slug] ? (
                    <Image
                      source={CATEGORY_IMAGES[selectedCategoryForShops.key || (selectedCategoryForShops as any).slug]}
                      style={{ width: 40, height: 36 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={{ fontSize: 24 }}>{selectedCategoryForShops?.icon || '🧺'}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catModalTitle, { color: isDark ? colors.text : '#321D8C' }]} numberOfLines={1}>
                    {selectedCategoryForShops?.name}
                  </Text>
                  <Text style={[styles.catModalSubtitle, { color: colors.textSecondary }]}>
                    Select a laundry shop offering this service
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.catModalCloseBtn, { backgroundColor: colors.border }]}
                onPress={() => setSelectedCategoryForShops(null)}
              >
                <Text style={[styles.catModalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Location & Count Banner */}
            <View style={[styles.catModalBadgeBar, { backgroundColor: isDark ? colors.cardAlt : '#EDE8FF' }]}>
              <Text style={[styles.catModalBadgeText, { color: isDark ? '#A5B4FC' : '#5B52E8' }]}>
                📍 {availableShopsForCategory.length} laundries available in {currentLocationLabel || 'Pune'}
              </Text>
            </View>

            {/* List of Laundry Shops providing this service */}
            {availableShopsForCategory.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45, paddingHorizontal: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? colors.cardAlt : '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Text style={{ fontSize: 32 }}>🧺</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? colors.text : '#321D8C', textAlign: 'center', marginBottom: 6 }}>
                  No Approved Laundries Yet
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                  Currently no verified laundry in your area provides {selectedCategoryForShops?.name}. Please select another service category!
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: Dimensions.get('window').height * 0.62 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {availableShopsForCategory.map((shop, index) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.catShopCard, { backgroundColor: isDark ? colors.card : colors.background, borderColor: colors.border }]}
                    activeOpacity={0.9}
                    onPress={() => {
                      const cat = selectedCategoryForShops;
                      setSelectedCategoryForShops(null);
                      navigation.navigate('ShopDetail', {
                        shopId: shop.id,
                        shopName: shop.name,
                        initialTab: 'Services',
                        selectedCategory: cat?.name,
                        categoryKey: cat?.key,
                      });
                    }}
                  >
                    {/* Shop Cover + Badges */}
                    <View style={styles.catShopImageWrap}>
                      <SafeShopCoverImage
                        shop={shop}
                        index={index}
                        style={styles.catShopImage}
                        resizeMode="cover"
                      />
                      <View style={styles.catShopBadgesRow}>
                        {shop.is_verified && (
                          <View style={[styles.vtBadgeVerified, { backgroundColor: isDark ? '#5B52E8' : '#321D8C' }]}>
                            <Text style={styles.vtBadgeText}>✓ Verified</Text>
                          </View>
                        )}
                        <View style={[styles.vtBadgeOpen, { backgroundColor: shop.is_open !== false ? '#22C55E' : '#EF4444' }]}>
                          <Text style={styles.vtBadgeText}>{shop.is_open !== false ? 'OPEN' : 'CLOSED'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Shop Details */}
                    <View style={styles.catShopInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.catShopName, { color: isDark ? colors.text : '#321D8C' }]} numberOfLines={1}>
                          {shop.name}
                        </Text>
                        <View style={styles.catRatingPill}>
                          <Text style={{ fontSize: 12 }}>⭐</Text>
                          <Text style={[styles.catRatingText, { color: colors.text }]}>
                            {Number(shop.rating || 4.8).toFixed(1)} ({shop.review_count || 120})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.vtLocationRow}>
                        <Text style={styles.vtPinEmoji}>📍</Text>
                        <Text style={[styles.vtAddressText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {formatShopLocation(shop)}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                        <Text style={[styles.catDistanceTag, { color: '#5B52E8' }]}>
                          📍 {getShopDistance(shop)}
                        </Text>
                        <Text style={[styles.catServiceTag, { color: '#10B981' }]}>
                          ✓ {selectedCategoryForShops?.name} Available
                        </Text>
                      </View>

                      {/* Action Buttons Row */}
                      <View style={styles.catShopActionRow}>
                        <TouchableOpacity
                          style={styles.catSelectShopBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            const cat = selectedCategoryForShops;
                            setSelectedCategoryForShops(null);
                            navigation.navigate('ShopDetail', {
                              shopId: shop.id,
                              shopName: shop.name,
                              initialTab: 'Services',
                              selectedCategory: cat?.name,
                              categoryKey: cat?.key,
                            });
                          }}
                        >
                          <Text style={styles.catSelectShopBtnText}>Select Laundry & View Menu ➔</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.catQuickBookBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            const cat = selectedCategoryForShops;
                            setSelectedCategoryForShops(null);
                            navigation.navigate('Booking', {
                              shopId: shop.id,
                              shopName: shop.name,
                              shop: shop,
                              serviceType: cat?.key,
                              selectedCategory: cat?.name,
                            });
                          }}
                        >
                          <Text style={styles.catQuickBookBtnText}>⚡ Book</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Comprehensive Customer Location Picker Sheet */}
      <Modal
        visible={showLocationPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPickerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            {/* Grab Bar */}
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? colors.border : '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="map-marker-radius" size={24} color="#5B52E8" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Choose Delivery Location</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLocationPickerModal(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
              Distances & travel time to nearby laundry stores will automatically recalculate in real-time.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Option A: GPS Auto-Detect */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleUseCurrentGps}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isDark ? colors.cardAlt : '#F0EEFF',
                  borderWidth: 1.5,
                  borderColor: isDark ? colors.border : '#D8D4FC',
                  marginBottom: 10,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B52E8', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Use Current GPS Location</Text>
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#16A34A' }}>HIGH ACCURACY</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    Auto-detect precise coordinates via device GPS
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option B: Choose on Google Map */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowLocationPickerModal(false);
                  navigation.navigate('MapScreen', { returnScreen: 'Home' });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: isDark ? colors.cardAlt : '#F8F9FA',
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EA4335', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <MaterialCommunityIcons name="google-maps" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Select on Google Map</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    Drag map pin to your exact building or doorstep
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option C: Your Saved Addresses */}
              {savedAddresses && savedAddresses.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Your Saved Addresses
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowLocationPickerModal(false);
                        navigation.navigate('SavedAddresses', { returnScreen: 'Home' });
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#5B52E8' }}>Manage ▾</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ gap: 8 }}>
                    {savedAddresses.map((addr) => {
                      const isCurrent = user?.address === addr.address_line1;
                      return (
                        <TouchableOpacity
                          key={addr.id}
                          activeOpacity={0.75}
                          onPress={() => handleSelectSavedAddress(addr)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: isCurrent ? (isDark ? '#26234D' : '#EDE8FF') : (isDark ? colors.cardAlt : '#FAFAFC'),
                            borderWidth: 1,
                            borderColor: isCurrent ? '#5B52E8' : colors.border,
                          }}
                        >
                          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#5B52E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <MaterialCommunityIcons name={addr.label?.toLowerCase().includes('work') ? 'briefcase-outline' : 'home-outline'} size={18} color="#FFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{addr.label || 'Home'}</Text>
                              {isCurrent && (
                                <View style={{ backgroundColor: '#5B52E8', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>ACTIVE</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                              {addr.address_line1}, {addr.city}
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="check-circle" size={18} color={isCurrent ? '#5B52E8' : 'transparent'} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Option D: Quick Select Delivery Areas */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Popular Laundry Hubs (Pune & PCMC)
              </Text>
              
              <View style={{ gap: 8 }}>
                {PUNE_HUBS.map((hub) => {
                  const isCurrent = (user?.area && user.area.toLowerCase() === hub.name.toLowerCase()) || currentLocationLabel.toLowerCase().includes(hub.name.toLowerCase());
                  const distFromUser = calculateDistance(
                    Number(user?.latitude || 18.5980),
                    Number(user?.longitude || 73.7680),
                    hub.lat,
                    hub.lng
                  );

                  return (
                    <TouchableOpacity
                      key={hub.name}
                      activeOpacity={0.75}
                      onPress={() => handleSelectPredefinedArea(hub)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: isCurrent ? (isDark ? '#26234D' : '#EDE8FF') : (isDark ? colors.cardAlt : '#FAFAFC'),
                        borderWidth: 1,
                        borderColor: isCurrent ? '#5B52E8' : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 10 }}>{hub.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{hub.name}</Text>
                          {isCurrent && (
                            <View style={{ backgroundColor: '#5B52E8', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                          {hub.city} • Pincode: {hub.pincode}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#A5B4FC' : '#5B52E8' }}>
                        {isCurrent ? 'Current' : distFromUser.split(' ')[0] + ' ' + distFromUser.split(' ')[1]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Accuracy Permission Dialog Modal */}
      <LocationAccuracyModal
        visible={showLocationModal}
        onTurnOn={handleTurnOnLocation}
        onNoThanks={() => setShowLocationModal(false)}
      />
    </>
  );

  return isDark ? (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {renderHomeContent()}
    </View>
  ) : (
    <ImageBackground
      source={require('../../../assets/myimages/login_bg.png')}
      style={[styles.root]}
      resizeMode="cover"
    >
      {renderHomeContent()}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  username: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SIZES.radius_full,
    gap: 4,
  },
  walletEmoji: { fontSize: 14 },
  walletText: { fontSize: 13, fontWeight: '700' },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: SIZES.radius_full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifEmoji: { fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    height: 48,
    borderRadius: SIZES.radius_xl,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { fontSize: 15 },
  promoBanner: {
    marginHorizontal: SPACING.xl,
    borderRadius: SIZES.radius_xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    minHeight: 120,
  },
  promoContent: { flex: 1 },
  promoText: { fontSize: 17, fontWeight: '800', color: '#1A1830', marginBottom: 4 },
  promoSub: { fontSize: 12, color: '#6B6889', marginBottom: SPACING.md },
  promoBtn: {
    backgroundColor: '#1A1830',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SIZES.radius_full,
  },
  promoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  promoEmoji: { fontSize: 52, marginLeft: SPACING.md },
  dots: { position: 'absolute', bottom: 10, right: 16, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(26,24,48,0.3)' },
  dotActive: { width: 16, backgroundColor: '#1A1830' },

  // ── Category styles ──────────────────────────────────────
  catScroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    gap: SPACING.lg,
  },
  catItem: {
    alignItems: 'center',
    width: 74,
  },
  catCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    marginBottom: SPACING.xs,
    // Subtle elevation/shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  catEmoji: { fontSize: 28 },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },

  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  shopCard: {
    width: 220,
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shopImgBox: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfo: {
    padding: SPACING.md,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  sectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  nearbyShopCard: {
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  nearbyShopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nearbyShopName: { fontSize: 15, fontWeight: '800', flex: 1 },
  nearbyDistance: { fontSize: 12, fontWeight: '700' },
  nearbyAddress: { fontSize: 13, marginBottom: SPACING.md },
  nearbyFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nearbyRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nearbyRatingText: { fontSize: 12, fontWeight: '600' },
  nearbyStatusText: { fontSize: 12, fontWeight: '700' },
  emptyCard: {
    borderRadius: SIZES.radius_xl,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 40, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.xs },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: SPACING.lg },
  newOrderBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: SIZES.radius_full,
  },
  newOrderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: SPACING.xxl,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_full,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  upcomingSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#321D8C',
    marginBottom: SPACING.md,
  },
  upcomingCard: {
    width: '100%',
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.md,
  },
  ucHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ucHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ucAvatarBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ucAvatarBgWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F3FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ucAvatarEmoji: {
    fontSize: 16,
  },
  ucHeaderInfo: {
    marginLeft: 6,
    flex: 1,
  },
  ucTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  ucUserText: {
    fontSize: 10,
    marginTop: 1,
  },
  ucHeaderDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 6,
  },
  ucHeaderRight: {
    alignItems: 'flex-end',
  },
  ucStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FBE9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ucStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
    marginRight: 3,
  },
  ucStatusText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#22C55E',
  },
  ucConfirmText: {
    fontSize: 8,
    marginTop: 1,
  },
  ucDivider: {
    height: 1,
    marginVertical: 4,
  },
  ucMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ucColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ucColIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  ucColIcon: {
    fontSize: 11,
  },
  ucColInfo: {
    flex: 1,
  },
  ucColLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  ucColDate: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  ucColTime: {
    fontSize: 8,
    marginTop: 1,
  },
  ucColItems: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  ucNoteBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  ucNoteText: {
    fontSize: 7.5,
    fontWeight: '700',
  },
  ucBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ucDeliveryCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ucDeliveryIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  ucDeliveryIcon: {
    fontSize: 12,
  },
  ucDeliveryLabel: {
    fontSize: 9,
  },
  ucDeliveryTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  ucManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ucManageBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ucManageBtnArrow: {
    fontSize: 11,
    fontWeight: '700',
  },
  freshPromoCard: {
    marginHorizontal: SPACING.xl,
    borderRadius: 24,
    paddingLeft: SPACING.xl,
    paddingVertical: SPACING.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 200,
    marginBottom: SPACING.lg,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  freshPromoLeft: {
    flex: 1.3,
    paddingRight: SPACING.xs,
    justifyContent: 'center',
  },
  freshPromoTitleDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C0E6E',
    lineHeight: 32,
  },
  freshPromoTitlePurple: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6B4EFF',
    lineHeight: 32,
    marginBottom: 8,
  },
  freshPromoDesc: {
    fontSize: 13,
    color: '#5B558C',
    lineHeight: 20,
  },
  freshPromoRight: {
    flex: 0.9,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  freshPromoImage: {
    width: 170,
    height: 170,
    position: 'absolute',
    right: -30,
    bottom: -30,
  },
  freshBlobTopRight: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(160,140,250,0.35)',
    top: -50,
    right: -20,
  },
  freshBlobBottomLeft: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(190,175,252,0.30)',
    bottom: -40,
    left: -20,
  },
  freshSparkle: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    fontSize: 14,
    color: '#9E8FF0',
    opacity: 0.8,
  },
  shopScrollContainer: {
    paddingLeft: SPACING.xl,
    paddingRight: SPACING.xl,
    gap: 12,
    paddingBottom: 8,
  },
  hzShopCard: {
    width: 290,
    height: 112,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8FF',
  },
  vtShopCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8FF',
  },
  vtShopImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  vtShopInfo: {
    width: '100%',
  },
  vtShopName: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 4,
    height: 36,
  },
  vtLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vtPinEmoji: {
    fontSize: 11,
  },
  vtAddressText: {
    fontSize: 11,
    marginLeft: 3,
    flex: 1,
  },
  vtBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  vtRatingCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vtStarEmoji: {
    fontSize: 11,
  },
  vtRatingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vtBadgeOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  vtBadgeVerified: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vtBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  vtBadgeOpen: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vtBadgeOpenText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  vtDistanceRow: {
    marginBottom: 4,
  },
  vtDistanceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hzBadgeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 2,
  },
  hzBadgeVerified: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#321D8C',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 5,
  },
  hzBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  hzShopImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
  },
  hzShopInfo: {
    flex: 1,
    paddingLeft: 10,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  hzShopName: {
    fontSize: 14,
    fontWeight: '700',
  },
  hzLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hzPinEmoji: {
    fontSize: 11,
  },
  hzAddressText: {
    fontSize: 11,
    marginLeft: 3,
    flex: 1,
  },
  hzBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  hzRatingCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hzStarEmoji: {
    fontSize: 11,
  },
  hzRatingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hzBadgeOpen: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hzBadgeOpenText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  hzBadgeDistance: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hzBadgeDistanceText: {
    fontSize: 9,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllArrow: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 999,
  },
  floatingAddBtnText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  catImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  catModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  catModalBackdrop: {
    flex: 1,
  },
  catModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  catModalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  catModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  catModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  catModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catModalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
  catModalBadgeBar: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  catModalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#321D8C',
  },
  catShopCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  catShopImageWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  catShopImage: {
    width: '100%',
    height: '100%',
  },
  catShopBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  catShopInfo: {
    padding: 12,
  },
  catShopName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  catRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  catRatingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catDistanceTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  catServiceTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  catShopActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  catSelectShopBtn: {
    flex: 1,
    backgroundColor: '#321D8C',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catSelectShopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  catQuickBookBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catQuickBookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default HomeScreen;
