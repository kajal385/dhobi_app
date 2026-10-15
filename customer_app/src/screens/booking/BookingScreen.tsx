import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
  Modal,
  Linking,
} from 'react-native';
import AppScreen from '../../components/AppScreen';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { addOrder } from '../../store/orderSlice';
import { orderService } from '../../services/orderService';
import { addressService } from '../../services/addressService';
import { DEFAULT_SHOPS, shopService, ShopService, ServiceItem } from '../../services/shopService';
import { Address } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../store';
import {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocode,
  calculateDistance,
} from '../../utils/locationUtils';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const SERVICES = [
  { key: 'wash_fold', title: 'Wash & Fold', desc: 'Cleaned, dried & neatly folded', icon: 'tshirt-crew-outline' },
  { key: 'wash_iron', title: 'Wash & Iron', desc: 'Cleaned, dried & neatly folded', icon: 'washing-machine' },
  { key: 'iron_only', title: 'Iron Only', desc: 'Cleaned, dried & neatly folded', icon: 'iron-outline' },
  { key: 'dry_clean', title: 'Dry Clean', desc: 'Cleaned, dried & neatly folded', icon: 'hanger' },
  { key: 'shoe_laundry', title: 'Shoe Laundry', desc: 'Cleaned, dried & neatly folded', icon: 'shoe-sneaker' },
  { key: 'only_wash', title: 'Only Wash', desc: 'Cleaned, dried & neatly folded', icon: 'bucket-outline' },
];

const CLOTHES_ITEMS = [
  { key: 't_shirt', label: 'T-Shirt', price: 35, icon: '👕' },
  { key: 'trousers', label: 'Trousers', price: 50, icon: '👖' },
  { key: 'kurta', label: 'Kurta', price: 90, icon: '👗' },
  { key: 'jeans', label: 'Jeans', price: 100, icon: '👖' },
  { key: 'saree', label: 'Saree', price: 150, icon: '🥻' },
  { key: 'towel', label: 'Towel', price: 40, icon: '🧼' },
  { key: 'shirt', label: 'Shirt', price: 40, icon: '👔' },
  { key: 'suit', label: 'Suit (2 Piece)', price: 250, icon: '👔' },
];

const ITEM_IMAGES: Record<string, any> = {
  t_shirt: require('../../../assets/myimages/row1_1.png'),
  trousers: require('../../../assets/myimages/row1_2.png'),
  kurta: require('../../../assets/myimages/row1_3.png'),
  jeans: require('../../../assets/myimages/row2_1.png'),
  saree: require('../../../assets/myimages/row2_2.png'),
  towel: require('../../../assets/myimages/row2_3.png'),
  shirt: require('../../../assets/myimages/row3_1.png'),
  suit: require('../../../assets/myimages/row3_1.png'),
};

const ADDONS_LIST = [
  { key: 'stain_removal', label: 'Stain Removal', price: 35 },
  { key: 'fabric_softener', label: 'Fabric Softener', price: 20 },
];

const TIME_SLOTS = [
  '9:00 AM - 11:00 AM',
  '11:00 AM - 1:00 PM',
  '1:00 PM - 3:00 PM',
  '3:00 PM - 5:00 PM',
  '5:00 PM - 7:00 PM',
  '7:00 PM - 9:00 PM',
];

// Helper: Parse slot start time for a given date
const parseSlotStartTime = (slot: string, date: Date): Date => {
  const [startPart] = (slot || '').split('-');
  const timeStr = (startPart || '').trim();
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
  const result = new Date(date);
  if (!match) return result;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = (match[3] || 'AM').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  result.setHours(hours, minutes, 0, 0);
  return result;
};

// Helper: Check if two dates are same calendar day
const isSameCalendarDay = (d1: Date, d2: Date): boolean => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Helper: Check if slot has already passed for the selected date
const isSlotPast = (slot: string, selectedDate: Date): boolean => {
  if (!slot || !selectedDate) return false;
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const selectedOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();

  if (selectedOnly < todayOnly) {
    return true; // Any past date slot is past
  }
  if (selectedOnly > todayOnly) {
    return false; // Future dates are never past
  }
  // For today, check if current time is past slot start time
  const slotStart = parseSlotStartTime(slot, selectedDate);
  return now.getTime() >= slotStart.getTime();
};

// Helper: Parse shop's closed days from working_hours (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
// Express delivery operates 7 days a week, enabling Sunday morning slots (DC-BUG-004)
const getClosedDaysFromShop = (shopObj: any, isExpress: boolean = false): number[] => {
  if (isExpress) return []; // Sunday morning express delivery enabled
  if (!shopObj) return [];

  const dayMap: Record<string, number> = {
    sunday: 0, sun: 0, 
    monday: 1, mon: 1, 
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3, 
    thursday: 4, thu: 4, 
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };

  const closed = new Set<number>();

  // 1. Array of closed days: e.g. ['Sunday'] or [0, 6]
  if (Array.isArray(shopObj.closed_days)) {
    shopObj.closed_days.forEach((d: any) => {
      if (typeof d === 'number' && !isNaN(d)) {
        closed.add(d);
      } else if (typeof d === 'string') {
        const val = dayMap[d.toLowerCase().trim()];
        if (typeof val === 'number') closed.add(val);
      }
    });
    return Array.from(closed);
  }

  const rawHours = shopObj.working_hours ?? shopObj.workingHours;

  // 2. Array of daily schedule objects: e.g. [{ day: 'Sunday', is_closed: true }]
  if (Array.isArray(rawHours)) {
    rawHours.forEach((item: any) => {
      if (!item) return;
      const dayStr = String(item.day || '').toLowerCase().trim();
      const dayNum = dayMap[dayStr];
      if (typeof dayNum === 'number') {
        if (item.is_closed || item.closed || item.status === 'closed' || item.open === false) {
          closed.add(dayNum);
        }
      }
    });
    return Array.from(closed);
  }

  // 3. Object with day keys: e.g. { sunday: { is_closed: true } }
  if (rawHours && typeof rawHours === 'object') {
    Object.keys(rawHours).forEach((key) => {
      const dayNum = dayMap[key.toLowerCase().trim()];
      const val = rawHours[key];
      if (typeof dayNum === 'number' && val) {
        if (val.is_closed || val.closed || val.status === 'closed' || val.open === false) {
          closed.add(dayNum);
        }
      }
    });
    return Array.from(closed);
  }

  // 4. String format: e.g. "Mon-Sat: 9am-9pm, Sunday Closed"
  if (typeof rawHours === 'string') {
    const wh = rawHours.toLowerCase();
    if (wh.includes('sun') && (wh.includes('off') || wh.includes('close'))) {
      closed.add(0); // Sunday
    }
    if (wh.includes('sat') && (wh.includes('off') || wh.includes('close'))) {
      closed.add(6); // Saturday
    }
  }

  return Array.from(closed);
};

// Helper: Find next nearest date that is open
const findNextOpenDate = (startDate: Date, closedDayNumbers: number[]): Date => {
  let curr = new Date(startDate);
  for (let i = 0; i < 14; i++) {
    if (!closedDayNumbers.includes(curr.getDay())) {
      return curr;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return startDate;
};

const PAYMENT_METHODS = [
  { key: 'google_pay', label: 'Google Pay', image: require('../../../assets/myimages/pay_gpay.png'), subText: 'example@okicici' },
  { key: 'phonepe', label: 'PhonePe', image: require('../../../assets/myimages/pay_phonepe.png') },
  { key: 'paytm', label: 'Paytm', image: require('../../../assets/myimages/pay_paytm.png') },
  { key: 'card', label: 'Credit / Debit Card', image: require('../../../assets/myimages/pay_card.png') },
  { key: 'upi', label: 'UPI ID', image: require('../../../assets/myimages/pay_upi.png') },
];

const BookingScreenInner = ({ navigation, route }: any) => {
  const { isDark, colors } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);

  // Steps: 
  // 1 = Service Selection
  // 2 = Add Items (Quantities)
  // 3 = Review Order
  // 4 = Pickups Details
  // 5 = Payment
  // ── Reorder Detection: pre-populate from previous order ─────────────────
  const reorderItems: any[] | undefined = route.params?.reorderItems;
  const reorderShop: any | undefined = route.params?.reorderShop || route.params?.shop;

  // Map saved order items → booking combinations format
  const buildReorderCombinations = (items: any[]) => {
    return items.map((item: any, idx: number) => {
      const rawName = (item.item_name || item.name || '').toLowerCase().trim();
      const rawService = (item.service_name || item.name || '').toLowerCase().trim();

      // Match item key from CLOTHES_ITEMS
      let itemKey = 'shirt';
      if (rawName.includes('t-shirt') || rawName.includes('tshirt')) itemKey = 't_shirt';
      else if (rawName.includes('trouser')) itemKey = 'trousers';
      else if (rawName.includes('kurta')) itemKey = 'kurta';
      else if (rawName.includes('jeans')) itemKey = 'jeans';
      else if (rawName.includes('saree') || rawName.includes('sari')) itemKey = 'saree';
      else if (rawName.includes('towel')) itemKey = 'towel';
      else if (rawName.includes('shirt')) itemKey = 'shirt';

      // Match service key from SERVICES
      let serviceKey = 'wash_fold';
      if (rawService.includes('wash') && rawService.includes('iron')) serviceKey = 'wash_iron';
      else if (rawService.includes('iron only') || rawService.includes('only iron')) serviceKey = 'iron_only';
      else if (rawService.includes('dry clean')) serviceKey = 'dry_clean';
      else if (rawService.includes('shoe')) serviceKey = 'shoe_laundry';
      else if (rawService.includes('only wash') || rawService.includes('wash only')) serviceKey = 'only_wash';
      else if (rawService.includes('wash')) serviceKey = 'wash_fold';

      return {
        id: `reorder_${idx}_${Date.now()}`,
        serviceKey,
        itemKey,
        quantity: Math.max(1, parseInt(item.quantity || '1', 10)),
      };
    }).filter((c: any) => c.quantity > 0);
  };

  const initialCombinations = (reorderItems && reorderItems.length > 0)
    ? buildReorderCombinations(reorderItems)
    : [];

  const [step, setStep] = useState(reorderItems && reorderItems.length > 0 ? 3 : 1);

  // Step 1: Selected Services & Items
  const [addedCombinations, setAddedCombinations] = useState<Array<{ id: string; serviceKey: string; itemKey: string; quantity: number }>>(initialCombinations);

  const resolveServiceKey = (rawKey?: string) => {
    if (!rawKey) return 'wash_fold';
    const s = rawKey.toLowerCase();
    if (s.includes('fold') || s === 'wash_fold') return 'wash_fold';
    if (s.includes('iron') && s.includes('wash')) return 'wash_iron';
    if (s.includes('iron') || s.includes('press') || s === 'steam_iron') return 'iron_only';
    if (s.includes('dry') || s.includes('clean')) return 'dry_clean';
    if (s.includes('shoe')) return 'shoe_laundry';
    if (s.includes('only') && s.includes('wash')) return 'only_wash';
    return s.replace(/[^a-z0-9]/g, '_');
  };

  const [activeService, setActiveService] = useState<string | null>(
    reorderItems && reorderItems.length > 0
      ? (initialCombinations[0]?.serviceKey || 'wash_fold')
      : resolveServiceKey(route.params?.serviceType || route.params?.selectedCategory)
  );

  // Delivery Speed (Standard 48h vs Express 24h) - DC-BUG-004
  const [deliverySpeed, setDeliverySpeed] = useState<'standard' | 'express'>('standard');

  // Coupon Code & Applied Coupon (DC-BUG-005)
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent?: number; discountAmount?: number } | null>(null);

  // Step 3: Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Step 4: Pickup Address, Date, Time Slot
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[0]);

  // Step 5: Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<string>('google_pay');

  // Order Confirmed State
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showShopPickerModal, setShowShopPickerModal] = useState(false);

  // ── Shop Info & Dynamic Owner Services ─────────────────
  const initialShopId = Number(route.params?.shopId || route.params?.shop_id || (route.params?.shop?.id) || DEFAULT_SHOPS[0]?.id || 47);
  const [selectedShopId, setSelectedShopId] = useState<number>(initialShopId);
  const targetShopId = selectedShopId;
  const [availableShops, setAvailableShops] = useState<any[]>(DEFAULT_SHOPS);
  const targetShop = route.params?.shop || route.params?.reorderShop || availableShops.find(s => s.id === selectedShopId) || DEFAULT_SHOPS[0];
  const [shopDetails, setShopDetails] = useState<any>(targetShop);

  React.useEffect(() => {
    if (route.params?.shop) {
      setShopDetails(route.params.shop);
      if (route.params.shop.id) setSelectedShopId(Number(route.params.shop.id));
    } else if (route.params?.shopId) {
      const sid = Number(route.params.shopId);
      setSelectedShopId(sid);
      const found = availableShops.find(s => s.id === sid) || DEFAULT_SHOPS.find(s => s.id === sid);
      if (found) setShopDetails(found);
    }
  }, [route.params?.shopId, route.params?.shop, availableShops]);
  const [shopServices, setShopServices] = useState<ShopService[]>([]);
  const targetShopName = shopDetails?.name || shopDetails?.shop_name || route.params?.shopName || (targetShop as any)?.name || 'Dhobi UltraPro';
  const targetOwnerName = shopDetails?.owner_name || shopDetails?.ownerName || route.params?.ownerName || (targetShop as any)?.owner_name || 'Ram Kale';
  const targetShopAddress = shopDetails?.address || shopDetails?.location || route.params?.shopLocation || (targetShop as any)?.address || 'Kalewadi, Pimpri-Chinchwad, Pune';

  // Fetch available shops from API
  React.useEffect(() => {
    (async () => {
      try {
        const resp = await shopService.getShops();
        if (resp?.data && resp.data.length > 0) {
          setAvailableShops(resp.data);
        }
      } catch (e) {}
    })();
  }, []);

  // Fetch live shop profile to sync working hours, weekly off days, and owner-set categories & item prices
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const profile = await shopService.getShopProfile(selectedShopId);
        if (isMounted) {
          if (profile?.shop) {
            setShopDetails(profile.shop);
          }
          if (profile?.services && Array.isArray(profile.services) && profile.services.length > 0) {
            setShopServices(profile.services);
          }
        }
      } catch (err) {
        // Fallback to targetShop
      }
    })();
    return () => { isMounted = false; };
  }, [selectedShopId]);

  // Dynamic services & items set by laundry owner
  const availableServices = React.useMemo(() => {
    if (shopServices && shopServices.length > 0) {
      return shopServices.map(svc => {
        const key = (svc.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        let iconName = 'tshirt-crew-outline';
        const lower = (svc.name || '').toLowerCase();
        if (lower.includes('fold')) iconName = 'tshirt-crew-outline';
        else if (lower.includes('iron') && lower.includes('wash')) iconName = 'washing-machine';
        else if (lower.includes('iron') || lower.includes('press')) iconName = 'iron-outline';
        else if (lower.includes('dry')) iconName = 'hanger';
        else if (lower.includes('shoe')) iconName = 'shoe-sneaker';
        else if (lower.includes('blanket') || lower.includes('woolen')) iconName = 'bed-empty';
        else if (lower.includes('wash')) iconName = 'bucket-outline';

        const items = (svc.items || []).map(item => {
          const itemKey = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
          const price = (item.price_per_piece != null && !isNaN(Number(item.price_per_piece)))
            ? Number(item.price_per_piece)
            : (item.price_per_kg != null && !isNaN(Number(item.price_per_kg)))
              ? Number(item.price_per_kg)
              : 50;
          return {
            id: item.id,
            key: itemKey,
            label: item.name,
            price,
            pricing_type: item.pricing_type || 'per_piece',
            unit: item.pricing_type === 'per_kg' ? 'kg' : 'pc',
          };
        });

        return {
          id: svc.id,
          key,
          title: svc.name,
          desc: svc.description || 'Cleaned, dried & neatly folded',
          icon: iconName,
          items: items.length > 0 ? items : CLOTHES_ITEMS.map(ci => ({
            id: 0,
            key: ci.key,
            label: ci.label,
            price: ci.price,
            pricing_type: 'per_piece' as const,
            unit: 'pc',
          })),
        };
      });
    }

    return SERVICES.map(s => ({
      id: 0,
      key: s.key,
      title: s.title,
      desc: s.desc,
      icon: s.icon,
      items: CLOTHES_ITEMS.map(ci => ({
        id: 0,
        key: ci.key,
        label: ci.label,
        price: ci.price,
        pricing_type: 'per_piece' as const,
        unit: 'pc',
      })),
    }));
  }, [shopServices]);

  // Helper: Retrieve owner-set price and garment details
  const getItemInfo = React.useCallback((serviceKey: string, itemKey: string) => {
    const s = availableServices.find(srv => srv.key === serviceKey || srv.title.toLowerCase() === serviceKey.toLowerCase());
    if (s) {
      const found = s.items.find(i => i.key === itemKey || i.label.toLowerCase() === itemKey.toLowerCase());
      if (found) return found;
    }
    const fallback = CLOTHES_ITEMS.find(c => c.key === itemKey);
    if (fallback) {
      return {
        id: 0,
        key: fallback.key,
        label: fallback.label,
        price: fallback.price,
        pricing_type: 'per_piece' as const,
        unit: 'pc',
      };
    }
    return {
      id: 0,
      key: itemKey,
      label: itemKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      price: 50,
      pricing_type: 'per_piece' as const,
      unit: 'pc',
    };
  }, [availableServices]);

  // Helper: Garment visual icon
  const getItemImage = (key: string, name?: string) => {
    if (ITEM_IMAGES[key]) return ITEM_IMAGES[key];
    const n = (name || key).toLowerCase();
    if (n.includes('t-shirt') || n.includes('tshirt')) return require('../../../assets/myimages/row1_1.png');
    if (n.includes('trouser') || n.includes('pant')) return require('../../../assets/myimages/row1_2.png');
    if (n.includes('kurta') || n.includes('suit') || n.includes('blazer')) return require('../../../assets/myimages/row1_3.png');
    if (n.includes('jean')) return require('../../../assets/myimages/row2_1.png');
    if (n.includes('saree') || n.includes('sari')) return require('../../../assets/myimages/row2_2.png');
    if (n.includes('towel')) return require('../../../assets/myimages/row2_3.png');
    if (n.includes('shirt')) return require('../../../assets/myimages/row3_1.png');
    return require('../../../assets/myimages/row1_1.png');
  };

  // Calculations using owner prices
  const selectedItemsCount = addedCombinations.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = addedCombinations.reduce((sum, comb) => {
    const itemInfo = getItemInfo(comb.serviceKey, comb.itemKey);
    return sum + (itemInfo.price * comb.quantity);
  }, 0);
  const addonsSubtotal = selectedAddons.reduce((sum, addonKey) => {
    const addon = ADDONS_LIST.find(a => a.key === addonKey);
    return sum + (addon ? addon.price : 0);
  }, 0);
  const pickupDeliveryFee = itemsSubtotal > 199 ? 0 : 30; // Free above 199

  // Express delivery speed fee (+₹50 for 24h turnaround) - DC-BUG-004
  const isExpress = deliverySpeed === 'express';
  const expressCharge = isExpress ? 50 : 0;

  // Coupon discount calculation (DC-BUG-005):
  // FIRST50 applies 50% discount to itemsSubtotal (NOT to delivery fee!)
  const discountAmount = appliedCoupon?.code === 'FIRST50'
    ? Math.min(Math.round(itemsSubtotal * 0.50), itemsSubtotal)
    : (appliedCoupon?.discountAmount || 0);

  const discountedItemsSubtotal = Math.max(0, itemsSubtotal - discountAmount);
  const totalAmount = discountedItemsSubtotal + addonsSubtotal + pickupDeliveryFee + expressCharge;

  // Closed Days parsing: when Express delivery is active, Sunday morning slots are enabled (DC-BUG-004)
  const closedDays = React.useMemo(() => getClosedDaysFromShop(shopDetails, isExpress), [shopDetails, isExpress]);

  // Generate upcoming next 10 days for horizontal strip
  const upcomingDays = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const isClosed = closedDays.includes(d.getDay());
      days.push({
        date: d,
        isToday: i === 0,
        isClosed,
        dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    return days;
  }, [closedDays]);

  // Auto-advance pickup date if current date is a closed day
  React.useEffect(() => {
    if (closedDays.includes(pickupDate.getDay())) {
      const nextOpen = findNextOpenDate(pickupDate, closedDays);
      setPickupDate(nextOpen);
    }
  }, [closedDays]);

  // Auto-select first upcoming enabled slot when pickupDate changes
  React.useEffect(() => {
    if (isSlotPast(selectedSlot, pickupDate)) {
      const firstUpcoming = TIME_SLOTS.find(s => !isSlotPast(s, pickupDate));
      if (firstUpcoming) {
        setSelectedSlot(firstUpcoming);
      } else {
        setSelectedSlot('');
      }
    }
  }, [pickupDate]);

  React.useEffect(() => {
    loadAddresses();
    // If this is a reorder, show a toast so user knows
    if (reorderItems && reorderItems.length > 0) {
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: '🔄 Repeat Order Ready!',
          text2: `${reorderItems.length} item(s) from your previous order pre-filled. Review & confirm.`,
          visibilityTime: 3500,
        });
      }, 500);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.selectedAddressFromMap) {
        const addr = route.params.selectedAddressFromMap;
        const formattedAddr: Address = {
          id: addr.id || Date.now(),
          label: addr.label || 'Selected Location',
          address_line1: addr.address_line1 || 'Current Location',
          city: addr.city || 'Pune',
          pincode: addr.pincode || '411057',
          is_default: true,
          latitude: addr.latitude,
          longitude: addr.longitude,
        };
        setSelectedAddress(formattedAddr);
        setAddresses(prev => [formattedAddr, ...prev.filter(a => a.id !== formattedAddr.id)]);
        if (route.params?.currentCombinations && Array.isArray(route.params.currentCombinations) && route.params.currentCombinations.length > 0) {
          setAddedCombinations(route.params.currentCombinations);
        }
        setStep(4);
      }
    }, [route.params?.selectedAddressFromMap, route.params?.currentCombinations])
  );

  const loadAddresses = async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(prev => {
        const merged = [...prev];
        data.forEach(d => {
          if (!merged.find(m => m.id === d.id)) {
            merged.push(d);
          }
        });
        return merged;
      });
      if (data.length > 0 && !route.params?.selectedAddressFromMap) {
        setSelectedAddress(prev => prev || data.find(a => a.is_default) || data[0]);
      }
    } catch (error) {
      console.log('Failed to load addresses', error);
    }
  };

  const handleServiceSelect = (key: string) => {
    setActiveService(prev => (prev === key ? null : key));
  };

  const updateCombinationQty = (id: string, delta: number) => {
    setAddedCombinations(prev => prev.map(c => {
      if (c.id === id) {
        const newQty = Math.max(0, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const handleAddItem = (itemKey: string, delta: number) => {
    if (!activeService) return;
    const targetNormService = resolveServiceKey(activeService);
    setAddedCombinations(prev => {
      const idx = prev.findIndex(c => 
        (resolveServiceKey(c.serviceKey) === targetNormService || c.serviceKey === activeService) && 
        (c.itemKey === itemKey || c.itemKey.toLowerCase() === itemKey.toLowerCase())
      );
      if (idx >= 0) {
        const existing = prev[idx];
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) return prev.filter((_, i) => i !== idx);
        const updated = [...prev];
        updated[idx] = { ...existing, quantity: newQty };
        return updated;
      } else if (delta > 0) {
        return [...prev, { id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, serviceKey: activeService, itemKey, quantity: delta }];
      }
      return prev;
    });
  };

  const getQtyForActiveService = (itemKey: string, serviceKey?: string) => {
    const sKey = serviceKey || activeService;
    if (!sKey) return 0;
    const targetNormService = resolveServiceKey(sKey);
    const existing = addedCombinations.find(c => 
      (resolveServiceKey(c.serviceKey) === targetNormService || c.serviceKey === sKey) && 
      (c.itemKey === itemKey || c.itemKey.toLowerCase() === itemKey.toLowerCase())
    );
    return existing ? existing.quantity : 0;
  };

  const toggleAddon = (key: string) => {
    setSelectedAddons(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handlePlaceOrder = async () => {
    if (selectedItemsCount === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one item' });
      return;
    }

    // Use selected address or fall back to mock home address
    const address = selectedAddress || {
      id: 1,
      label: 'Home',
      full_address: '12, Shivaji Nagar, Near City Mall, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      is_default: true,
    };

    const items = addedCombinations.map(comb => {
      const service = availableServices.find(s => s.key === comb.serviceKey);
      const itemInfo = getItemInfo(comb.serviceKey, comb.itemKey);
      const unitPrice = itemInfo.price;
      return {
        name: `${service?.title || comb.serviceKey} - ${itemInfo.label}`,
        service_name: service?.title || comb.serviceKey,
        item_name: itemInfo.label,
        quantity: comb.quantity,
        price: unitPrice,
        unit_price: unitPrice,
        total: unitPrice * comb.quantity,
        total_price: unitPrice * comb.quantity,
      };
    });

    // Calculate delivery date (1 day for express, 2 days for standard) - DC-BUG-004
    const delDate = new Date(pickupDate);
    delDate.setDate(delDate.getDate() + (isExpress ? 1 : 2));

    // Determine primary service type
    const determinedService = activeService || (addedCombinations.length > 0 ? addedCombinations[0].serviceKey : 'wash_fold');

    // Local ISO YYYY-MM-DD string
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const localPickupDateStr = `${pickupDate.getFullYear()}-${pad(pickupDate.getMonth() + 1)}-${pad(pickupDate.getDate())}`;
    const localDeliveryDateStr = `${delDate.getFullYear()}-${pad(delDate.getMonth() + 1)}-${pad(delDate.getDate())}`;

    // UPI Payment Intent Launch on Android 14 (DC-BUG-006)
    if (['google_pay', 'phonepe', 'paytm', 'upi'].includes(paymentMethod)) {
      try {
        const upiUrl = `upi://pay?pa=dhobipro@upi&pn=DhobiPro&am=${totalAmount}&cu=INR&tn=Order_Payment`;
        Linking.canOpenURL(upiUrl).then(supported => {
          if (supported) {
            Linking.openURL(upiUrl).catch(() => {});
          }
        }).catch(() => {});
      } catch (err) {
        console.log('UPI intent launch handled:', err);
      }
    }

    setLoading(true);
    try {
      const order = await orderService.createOrder({
        shop_id: targetShopId,
        shop_name: targetShopName,
        owner_name: targetOwnerName,
        shop: {
          ...(targetShop || {}),
          id: targetShopId,
          name: targetShopName,
          owner_name: targetOwnerName,
          address: targetShopAddress,
          phone: (targetShop as any)?.phone || '9876543210',
        },
        shop_address: targetShopAddress,
        shop_phone: (targetShop as any)?.phone || '9876543210',
        user_id: user?.id,
        customer_name: user?.name || 'Kajal Gajare',
        customer_mobile: user?.phone || '9309386003',
        service_type: determinedService,
        items,
        pickup_address_id: address.id,
        delivery_address_id: address.id,
        pickup_address: (address as any).full_address || (address as any).address_line1 || `${address.label || 'Home'}, ${address.city || 'Pune'}`,
        total_amount: totalAmount,
        subtotal: itemsSubtotal,
        is_express: isExpress,
        express_charge: expressCharge,
        delivery_speed: deliverySpeed,
        coupon_code: appliedCoupon?.code,
        discount_amount: discountAmount,
        discount: discountAmount,
        pickup_date: localPickupDateStr,
        pickup_time: selectedSlot,
        pickup_slot: selectedSlot,
        delivery_date: localDeliveryDateStr,
        notes: `Time Slot: ${selectedSlot}. Speed: ${deliverySpeed.toUpperCase()}. Addons: ${selectedAddons.join(', ')}`,
        use_wallet: paymentMethod === 'wallet',
        payment_method: paymentMethod,
      });
      if (!order) {
        throw new Error('Invalid response from server');
      }
      // Deep-clone so Redux/Immer can freely draft the object (mock objects may be non-extensible)
      const safeOrder = JSON.parse(JSON.stringify({
        ...order,
        shop_id: targetShopId,
        shop_name: targetShopName,
        owner_name: targetOwnerName,
        shop_address: targetShopAddress,
        shop_phone: (targetShop as any)?.phone || '9876543210',
        shop: {
          ...(order?.shop || {}),
          id: targetShopId,
          name: targetShopName,
          owner_name: targetOwnerName,
          address: targetShopAddress,
          phone: (targetShop as any)?.phone || '9876543210',
        },
      }));
      dispatch(addOrder(safeOrder));
      setPlacedOrder(safeOrder);
      setStep(6); // Navigate to Order Confirmed
    } catch (e: any) {
      console.error('Place order error:', e.response?.data || e.message);
      const serverMsg =
        e.response?.data?.message ||
        (e.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join(', ')
          : null) ||
        e.message ||
        'Something went wrong. Please try again.';
      Toast.show({ type: 'error', text1: 'Order failed', text2: serverMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step === 3) {
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // Render Header Helper
  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
        <Text style={[styles.backArrowText, { color: colors.text }]}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderShopPickerModal = () => (
    <Modal
      visible={showShopPickerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowShopPickerModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setShowShopPickerModal(false)}
        />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Choose Laundry Store</Text>
            <TouchableOpacity onPress={() => setShowShopPickerModal(false)} style={{ padding: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {availableShops.map((s) => {
              const isCurrent = (selectedShopId === s.id) || (shopDetails?.id === s.id) || (targetShopName === s.name);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    setSelectedShopId(s.id);
                    setShopDetails(s);
                    setShowShopPickerModal(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 10,
                    backgroundColor: isCurrent ? '#EDE8FF' : colors.background,
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? '#5B52E8' : colors.border,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#5B52E8', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="storefront-outline" size={22} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isCurrent ? (isDark ? '#A5B4FC' : '#321D8C') : colors.text }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>📍 {s.address || s.area || 'Pune'}</Text>
                    {(() => {
                      const custLat = Number(user?.latitude || 18.5980);
                      const custLng = Number(user?.longitude || 73.7680);
                      const distText = s.latitude && s.longitude
                        ? calculateDistance(custLat, custLng, Number(s.latitude), Number(s.longitude))
                        : (s.distance || '0.8 km away (6 mins)');
                      return (
                        <Text style={{ fontSize: 11, color: '#5B52E8', marginTop: 2 }}>
                          ⭐ {s.rating} • {distText}
                        </Text>
                      );
                    })()}
                  </View>
                  {isCurrent ? (
                    <View style={{ backgroundColor: '#5B52E8', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>✓</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // STEP 1: Service Selection
  if (step === 1) {
    return (
      <LinearGradient
        colors={isDark ? ['#0F0E1A', '#1A1830'] : ['#EDE8FF', '#FFF0EA']}
        style={styles.root}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {renderHeader('New Laundry Order', 'What do you need?')}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Selected Laundry Store & Owner Card */}
          <View style={[styles.selectedShopCard, { backgroundColor: colors.card, borderColor: '#5B52E8' }]}>
            <View style={[styles.selectedShopCardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={styles.selectedShopBadge}>
                <Text style={styles.selectedShopBadgeText}>SELECTED LAUNDRY STORE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowShopPickerModal(true)}
                style={{ backgroundColor: '#EDE8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ color: '#5B52E8', fontSize: 11, fontWeight: '700' }}>Change Laundry ▾</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectedShopRow}>
              <View style={styles.selectedShopIconCircle}>
                <MaterialCommunityIcons name="storefront-outline" size={24} color="#5B52E8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.selectedShopName, { color: colors.text }]}>{targetShopName}</Text>
                {targetOwnerName ? (
                  <Text style={[styles.selectedShopOwner, { color: colors.textSecondary }]}>
                    👤 Owner: <Text style={{ fontWeight: '700', color: colors.text }}>{targetOwnerName}</Text>
                  </Text>
                ) : null}
                {targetShopAddress ? (
                  <Text style={[styles.selectedShopAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    📍 {targetShopAddress}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.servicesContainer}>
            {availableServices.map(service => {
              const normKey = resolveServiceKey(service.key);
              const normActive = activeService ? resolveServiceKey(activeService) : null;
              const isSelected = activeService === service.key || (normActive && normKey === normActive);
              const serviceItemsCount = addedCombinations
                .filter(c => resolveServiceKey(c.serviceKey) === normKey)
                .reduce((acc, c) => acc + c.quantity, 0);

              return (
                <View key={service.key} style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleServiceSelect(service.key)}
                    style={[
                      styles.serviceCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? '#5B52E8' : colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                        marginBottom: 0
                      }
                    ]}
                  >
                    <View style={styles.serviceIconContainer}>
                      <MaterialCommunityIcons
                        name={service.icon}
                        size={28}
                        color={isSelected ? '#5B52E8' : '#A09EBF'}
                      />
                    </View>
                    <View style={styles.serviceTextContainer}>
                      <Text style={[styles.serviceTitle, { color: isSelected ? (isDark ? '#A5B4FC' : '#321D8C') : colors.text }]}>
                        {service.title}
                      </Text>
                      <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>
                        {service.desc}
                      </Text>
                    </View>
                    {serviceItemsCount > 0 && (
                      <View style={{ backgroundColor: '#EDE8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 }}>
                        <Text style={{ color: '#5B52E8', fontSize: 11, fontWeight: '800' }}>
                          {serviceItemsCount} {serviceItemsCount === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.checkboxContainer}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 22 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Items List with Owner-set Prices */}
                  {isSelected && (
                    <View style={[styles.itemsListContainer, { marginTop: 10, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: isDark ? '#1a1830' : '#f9f9f9', borderRadius: 12 }]}>
                      {service.items.map(item => {
                        const qty = getQtyForActiveService(item.key);
                        return (
                          <View key={item.key} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
                            <View style={styles.itemImageContainer}>
                              <Image
                                source={getItemImage(item.key, item.label)}
                                style={styles.itemImage}
                                resizeMode="contain"
                              />
                            </View>
                            <View style={styles.itemMeta}>
                              <Text style={[styles.itemLabelName, { color: colors.text }]}>{item.label}</Text>
                              <Text style={[styles.itemLabelPrice, { color: colors.textSecondary }]}>
                                ₹{item.price}{item.pricing_type === 'per_kg' ? ' / kg' : ''}
                              </Text>
                            </View>
                            <View style={styles.qtyRowContainer}>
                              <TouchableOpacity
                                onPress={() => handleAddItem(item.key, -1)}
                                style={styles.qtySquareBtn}
                              >
                                <Text style={{ color: '#5B52E8', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>-</Text>
                              </TouchableOpacity>
                              <View style={styles.qtyInputBox}>
                                <Text style={[styles.qtyNumberText, { color: colors.text }]}>{qty}</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleAddItem(item.key, 1)}
                                style={styles.qtySquareBtn}
                              >
                                <Text style={{ color: '#5B52E8', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={[styles.promoCard, { backgroundColor: isDark ? colors.card : '#F0EEFF', borderColor: colors.border }]}>
            <View style={styles.promoImageWrapper}>
              <Image
                source={require('../../../assets/myimages/delivery_icon.png')}
                style={styles.promoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.promoTextContainer}>
              <Text style={[styles.promoTitle, { color: isDark ? colors.text : '#321D8C' }]}>Free pickup & delivery</Text>
              <Text style={[styles.promoDesc, { color: colors.textSecondary }]}>On orders above ₹199</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomDetailsContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View>
            <Text style={{ color: isDark ? '#A5B4FC' : '#5B52E8', fontSize: 13, fontWeight: '700' }}>
              {selectedItemsCount} items selected
            </Text>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 }}>₹{itemsSubtotal}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (selectedItemsCount === 0) {
                Toast.show({
                  type: 'error',
                  text1: 'No items selected',
                  text2: 'Please select at least 1 item to proceed.',
                });
                return;
              }
              setStep(3);
            }}
            style={styles.gradientBtnWrapperHalf}
          >
            <LinearGradient
              colors={['#6C5CE7', '#FF7675']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtnHalf}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.gradientBtnText}>Review Order</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {renderShopPickerModal()}
      </LinearGradient>
    );
  }

  // STEP 3: Review Order
  if (step === 3) {
    const currentService = availableServices.find(s => s.key === activeService) || availableServices[0] || SERVICES[0];
    return (
      <LinearGradient
        colors={isDark ? ['#0F0E1A', '#1A1830'] : ['#EDE8FF', '#FFF0EA']}
        style={styles.root}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {renderHeader('Review Order')}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Repeat Order Banner */}
          {reorderItems && reorderItems.length > 0 && (
            <View style={{
              backgroundColor: '#5B52E8',
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <MaterialCommunityIcons name="repeat" size={22} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>🔄 Repeat Order</Text>
                <Text style={{ color: '#D4D0FF', fontSize: 12, marginTop: 2 }}>
                  Your previous order items are pre-filled. Edit or confirm to proceed.
                </Text>
              </View>
            </View>
          )}
          {/* Selected Laundry Store & Owner Card */}
          <View style={[styles.selectedShopCard, { backgroundColor: colors.card, borderColor: '#5B52E8' }]}>
            <View style={[styles.selectedShopCardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={styles.selectedShopBadge}>
                <Text style={styles.selectedShopBadgeText}>SELECTED LAUNDRY STORE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowShopPickerModal(true)}
                style={{ backgroundColor: '#EDE8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ color: '#5B52E8', fontSize: 11, fontWeight: '700' }}>Change Laundry ▾</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectedShopRow}>
              <View style={styles.selectedShopIconCircle}>
                <MaterialCommunityIcons name="storefront-outline" size={24} color="#5B52E8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.selectedShopName, { color: colors.text }]}>{targetShopName}</Text>
                {targetOwnerName ? (
                  <Text style={[styles.selectedShopOwner, { color: colors.textSecondary }]}>
                    👤 Owner: <Text style={{ fontWeight: '700', color: colors.text }}>{targetOwnerName}</Text>
                  </Text>
                ) : null}
                {targetShopAddress ? (
                  <Text style={[styles.selectedShopAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    📍 {targetShopAddress}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Selected Service Card */}
          <View style={[styles.reviewServiceCard, { backgroundColor: colors.card }]}>

            <View style={styles.reviewServiceIconWrapper}>
              <Image
                source={require('../../../assets/myimages/cat_wash_fold_icon.png')}
                style={styles.reviewServiceImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceTitle, { color: colors.text }]}>{currentService.title}</Text>
              <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>{currentService.desc}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep(1)} style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Items Subtotal Header */}
          <View style={styles.itemsReviewHeader}>
            <Text style={[styles.itemsReviewTitle, { color: colors.text }]}>Items ({selectedItemsCount})</Text>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.editItemsText}>✏️ Edit Items</Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <View style={[styles.reviewItemsBox, { backgroundColor: colors.card }]}>
            {addedCombinations.map(comb => {
              const itemInfo = getItemInfo(comb.serviceKey, comb.itemKey);
              const serviceTitle = availableServices.find(s => s.key === comb.serviceKey)?.title || comb.serviceKey;
              return (
                <View key={comb.id} style={styles.reviewItemRow}>
                  <View style={styles.reviewItemImageContainer}>
                    <Image
                      source={getItemImage(itemInfo.key, itemInfo.label)}
                      style={styles.reviewItemImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.reviewItemLabel, { color: colors.text }]}>
                      {itemInfo.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {serviceTitle} • ₹{itemInfo.price}{itemInfo.pricing_type === 'per_kg' ? ' / kg' : ''}
                    </Text>
                  </View>
                  <View style={styles.qtyRowContainerSmall}>
                    <TouchableOpacity onPress={() => updateCombinationQty(comb.id, -1)} style={styles.qtySquareBtnSmall}>
                      <Text style={{ color: '#5B52E8', fontSize: 14, fontWeight: '700', lineHeight: 16 }}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.qtyInputBoxSmall}>
                      <Text style={[styles.qtyNumberTextSmall, { color: colors.text }]}>{comb.quantity}</Text>
                    </View>
                    <TouchableOpacity onPress={() => updateCombinationQty(comb.id, 1)} style={styles.qtySquareBtnSmall}>
                      <Text style={{ color: '#5B52E8', fontSize: 14, fontWeight: '700', lineHeight: 16 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.reviewItemPrice, { color: colors.text }]}>₹{comb.quantity * itemInfo.price}</Text>
                </View>
              );
            })}
          </View>

          {/* Add-ons Section */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Add-ons (Optional)</Text>
          <View style={styles.addonsRow}>
            {ADDONS_LIST.map(addon => {
              const isSelected = selectedAddons.includes(addon.key);
              return (
                <TouchableOpacity
                  key={addon.key}
                  onPress={() => toggleAddon(addon.key)}
                  style={[
                    styles.addonCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? '#5B52E8' : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    }
                  ]}
                >
                  <View style={styles.addonTextMeta}>
                    <Text style={[styles.addonLabel, { color: colors.text }]}>{addon.label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>₹{addon.price}</Text>
                  </View>
                  <View style={[styles.addonCheckbox, { backgroundColor: isSelected ? '#5B52E8' : 'transparent', borderColor: isSelected ? '#5B52E8' : colors.border }]}>
                    {isSelected && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Delivery Speed Selection (DC-BUG-004) */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Delivery Speed</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDeliverySpeed('standard')}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 14,
                borderWidth: deliverySpeed === 'standard' ? 2 : 1,
                borderColor: deliverySpeed === 'standard' ? '#5B52E8' : colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Standard</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#16A34A' }}>FREE</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Delivered in 48 hours</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDeliverySpeed('express')}
              style={{
                flex: 1,
                backgroundColor: deliverySpeed === 'express' ? (isDark ? '#2D2A5E' : '#EDE8FF') : colors.card,
                borderRadius: 14,
                padding: 14,
                borderWidth: deliverySpeed === 'express' ? 2 : 1,
                borderColor: deliverySpeed === 'express' ? '#5B52E8' : colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: deliverySpeed === 'express' ? '#5B52E8' : colors.text }}>⚡ Express</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#5B52E8' }}>+₹50</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Delivered in 24 hours (Sunday open)</Text>
            </TouchableOpacity>
          </View>

          {/* Promo Code / Coupons (DC-BUG-005) */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Coupons & Offers</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: isDark ? '#1C1B28' : '#F8FAFC',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.text,
                  textTransform: 'uppercase',
                }}
                placeholder="Enter Promo Code"
                placeholderTextColor={colors.textLight}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={() => {
                  const clean = couponCode.trim().toUpperCase();
                  if (clean === 'FIRST50') {
                    setAppliedCoupon({ code: 'FIRST50', discountPercent: 50 });
                    Toast.show({
                      type: 'success',
                      text1: 'Coupon FIRST50 Applied! 🎉',
                      text2: '50% discount applied to clothes subtotal!',
                    });
                  } else if (clean) {
                    Toast.show({
                      type: 'error',
                      text1: 'Invalid Coupon',
                      text2: `Code "${clean}" is not valid. Try FIRST50 for 50% off.`,
                    });
                  }
                }}
                style={{
                  backgroundColor: '#5B52E8',
                  paddingHorizontal: 18,
                  height: 44,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Chip for FIRST50 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setCouponCode('FIRST50');
                  setAppliedCoupon({ code: 'FIRST50', discountPercent: 50 });
                  Toast.show({
                    type: 'success',
                    text1: 'FIRST50 Applied! 🏷️',
                    text2: '50% off clothes subtotal applied!',
                  });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 13 }}>🏷️</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>FIRST50</Text>
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>(50% OFF Clothes Subtotal)</Text>
              </TouchableOpacity>

              {appliedCoupon && (
                <TouchableOpacity
                  onPress={() => {
                    setAppliedCoupon(null);
                    setCouponCode('');
                    Toast.show({ type: 'info', text1: 'Coupon removed' });
                  }}
                  style={{ padding: 4 }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Payment Summary */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Payment Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Items Subtotal</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>₹{itemsSubtotal}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={{ color: '#16A34A', fontWeight: '700' }}>Coupon Discount (FIRST50)</Text>
                <Text style={[{ color: '#16A34A' }, styles.boldText]}>-₹{discountAmount}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Add-ons</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>₹{addonsSubtotal}</Text>
            </View>
            {isExpress && (
              <View style={styles.summaryRow}>
                <Text style={{ color: '#5B52E8', fontWeight: '700' }}>⚡ Express Turnaround (24 hrs)</Text>
                <Text style={[{ color: '#5B52E8' }, styles.boldText]}>+₹{expressCharge}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Pickup & Delivery</Text>
              <Text style={{ color: colors.success, fontWeight: '700' }}>
                {pickupDeliveryFee === 0 ? 'FREE' : `₹${pickupDeliveryFee}`}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#5B52E8" />
                <Text style={{ color: colors.text, fontWeight: '700' }}>Total Amount</Text>
              </View>
              <Text style={{ color: '#5B52E8', fontWeight: '800', fontSize: 18 }}>₹{totalAmount}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setStep(4)} style={styles.gradientBtnWrapper}>
            <LinearGradient
              colors={['#6C5CE7', '#FF7675']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.gradientBtnText}>Continue to Pickup Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {renderShopPickerModal()}
      </LinearGradient>
    );
  }

  // STEP 4: Pickups Details
  if (step === 4) {
    return (
      <LinearGradient
        colors={isDark ? ['#0F0E1A', '#1A1830'] : ['#EDE8FF', '#FFF0EA']}
        style={styles.root}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {renderHeader('Pickups Details', 'When & Where should we pickup')}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Address Header */}
          <View style={styles.itemsReviewHeader}>
            <Text style={[styles.itemsReviewTitle, { color: colors.text }]}>Pickups Address</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MapScreen', { returnScreen: 'Booking', currentCombinations: addedCombinations })}>
              <Text style={styles.editItemsText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Address Selection */}
          <TouchableOpacity
            style={[styles.addressReviewBox, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('MapScreen', { returnScreen: 'Booking', currentCombinations: addedCombinations })}
          >
            <View style={styles.addressIconWrapper}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressTitle, { color: colors.text }]}>
                {selectedAddress ? selectedAddress.label : 'Select Address'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                {selectedAddress ? `${selectedAddress.address_line1}, ${selectedAddress.city} - ${selectedAddress.pincode}` : 'Tap to select address'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Pickup Date Header & Schedule Status */}
          <View style={styles.dateHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Pickups Date</Text>
            {closedDays.includes(0) && (
              <View style={styles.offPill}>
                <Text style={styles.offPillText}>Sundays Closed</Text>
              </View>
            )}
          </View>

          {/* Schedule Info Notice */}
          {closedDays.length > 0 && (
            <View style={[styles.shopScheduleNotice, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
              <Text style={{ fontSize: 14 }}>🗓️</Text>
              <Text style={[styles.shopScheduleNoticeText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                {targetShopName} is closed on {closedDays.map(d => d === 0 ? 'Sundays' : d === 6 ? 'Saturdays' : 'Mondays').join(', ')}. Off dates are disabled below.
              </Text>
            </View>
          )}

          {/* Horizontal 10-Day Selector Strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScrollContainer}>
            {upcomingDays.map((item, idx) => {
              const isSelected = isSameCalendarDay(item.date, pickupDate);
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={item.isClosed}
                  onPress={() => setPickupDate(item.date)}
                  activeOpacity={0.75}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: item.isClosed
                        ? (isDark ? '#1C1B28' : '#F3F4F6')
                        : isSelected
                          ? '#5B52E8'
                          : colors.card,
                      borderColor: item.isClosed
                        ? (isDark ? '#2E2D40' : '#E5E7EB')
                        : isSelected
                          ? '#5B52E8'
                          : colors.border,
                      opacity: item.isClosed ? 0.45 : 1,
                    }
                  ]}
                >
                  <Text style={[
                    styles.dayChipDayName,
                    { color: item.isClosed ? (isDark ? '#6B7280' : '#9CA3AF') : isSelected ? '#FFFFFF' : colors.textSecondary }
                  ]}>
                    {item.dayName}
                  </Text>
                  <Text style={[
                    styles.dayChipDayNum,
                    { color: item.isClosed ? (isDark ? '#6B7280' : '#9CA3AF') : isSelected ? '#FFFFFF' : colors.text }
                  ]}>
                    {item.dayNumber}
                  </Text>
                  <Text style={[
                    styles.dayChipMonth,
                    { color: item.isClosed ? (isDark ? '#6B7280' : '#9CA3AF') : isSelected ? '#E0E7FF' : colors.textLight }
                  ]}>
                    {item.monthName}
                  </Text>
                  {item.isClosed ? (
                    <View style={styles.chipClosedBadge}>
                      <Text style={styles.chipClosedBadgeText}>OFF</Text>
                    </View>
                  ) : isSelected ? (
                    <View style={styles.chipSelectedDot} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Date Summary & Calendar Modal Button */}
          <TouchableOpacity
            style={[styles.dateSelectorBtn, { backgroundColor: colors.card, marginTop: SPACING.xs }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>📅</Text>
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {isSameCalendarDay(pickupDate, new Date()) ? 'Today, ' : ''}
              {pickupDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={{ fontSize: 12, color: '#5B52E8', fontWeight: '700', marginRight: 4 }}>Change Date</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>▼</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={pickupDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  if (closedDays.includes(date.getDay())) {
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    Toast.show({
                      type: 'error',
                      text1: 'Laundry Closed',
                      text2: `${targetShopName} is closed on ${dayName}s. Please choose an open day.`,
                    });
                    return;
                  }
                  setPickupDate(date);
                }
              }}
            />
          )}

          {/* Pickup Time Slots Header */}
          <View style={styles.slotsHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Pickups Time Slot</Text>
            {isSameCalendarDay(pickupDate, new Date()) && (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Past slots disabled for today</Text>
            )}
          </View>

          {/* Notice if all slots for today have ended */}
          {isSameCalendarDay(pickupDate, new Date()) && TIME_SLOTS.every(s => isSlotPast(s, pickupDate)) && (
            <View style={[styles.shopScheduleNotice, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: isDark ? '#92400E' : '#FCD34D' }]}>
              <Text style={{ fontSize: 14 }}>⏰</Text>
              <Text style={[styles.shopScheduleNoticeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                All pickup slots for today have ended. Please select tomorrow's date above for pickup.
              </Text>
            </View>
          )}

          <View style={styles.slotsContainer}>
            {TIME_SLOTS.map(slot => {
              const isPast = isSlotPast(slot, pickupDate);
              const isSelected = selectedSlot === slot && !isPast;
              return (
                <TouchableOpacity
                  key={slot}
                  disabled={isPast}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.8}
                  style={[
                    styles.slotSelectBtn,
                    {
                      backgroundColor: isPast
                        ? (isDark ? '#1C1B29' : '#F1F1F5')
                        : isSelected
                          ? '#F0EEFF'
                          : colors.card,
                      borderColor: isPast
                        ? (isDark ? '#2E2D40' : '#E2E2E8')
                        : isSelected
                          ? '#5B52E8'
                          : colors.border,
                      borderWidth: isSelected ? 1.8 : 1,
                      opacity: isPast ? 0.45 : 1,
                    }
                  ]}
                >
                  <Text style={[
                    styles.slotSelectText,
                    {
                      color: isPast
                        ? (isDark ? '#7E7C94' : '#9E9E9E')
                        : isSelected
                          ? '#321D8C'
                          : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                      textDecorationLine: isPast ? 'line-through' : 'none',
                    }
                  ]}>
                    {slot}
                  </Text>
                  {isPast && (
                    <Text style={styles.slotEndedBadgeText}>✕ Ended</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (!selectedAddress) {
                Toast.show({
                  type: 'error',
                  text1: 'Address Required',
                  text2: 'Please select a pickup address to continue.',
                });
                return;
              }
              if (closedDays.includes(pickupDate.getDay())) {
                const dayName = pickupDate.toLocaleDateString('en-US', { weekday: 'long' });
                Toast.show({
                  type: 'error',
                  text1: 'Laundry Closed',
                  text2: `${targetShopName} is closed on ${dayName}s. Please select an open date.`,
                });
                return;
              }
              if (!selectedSlot || isSlotPast(selectedSlot, pickupDate)) {
                Toast.show({
                  type: 'error',
                  text1: 'Time Slot Required',
                  text2: 'Please select an available upcoming pickup time slot.',
                });
                return;
              }
              setStep(5);
            }}
            style={styles.gradientBtnWrapper}
          >
            <LinearGradient
              colors={['#6C5CE7', '#FF7675']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.gradientBtnText}>Continue to Payment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // STEP 5: Payment
  if (step === 5) {
    return (
      <LinearGradient
        colors={isDark ? ['#0F0E1A', '#1A1830'] : ['#EDE8FF', '#FFF0EA']}
        style={styles.root}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {renderHeader('Payment', 'Choose a payment method')}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Amount to Pay Header */}
          <View style={styles.paymentAmountHeader}>
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '700' }}>Amount to Pay</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#321D8C', fontSize: 28, fontWeight: '800' }}>₹{totalAmount}</Text>
          </View>

          {/* Payment Methods */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>UPI / Cards</Text>
          <View style={[styles.paymentOptionsBox, { backgroundColor: colors.card }]}>
            {PAYMENT_METHODS.map(method => {
              const isSelected = paymentMethod === method.key;
              return (
                <TouchableOpacity
                  key={method.key}
                  onPress={() => setPaymentMethod(method.key)}
                  style={[styles.paymentMethodRow, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.paymentMethodIconWrapper}>
                    <Image source={method.image} style={styles.paymentMethodImage} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>{method.label}</Text>
                    {method.subText && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{method.subText}</Text>}
                  </View>
                  <View style={[styles.paymentRadio, { borderColor: isSelected ? '#5B52E8' : colors.border }]}>
                    {isSelected && <View style={styles.paymentRadioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* COD Options */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>More Options</Text>
          <View style={[styles.paymentOptionsBox, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              onPress={() => setPaymentMethod('cod')}
              style={styles.paymentMethodRow}
            >
              <View style={styles.paymentMethodIconWrapper}>
                <Text style={{ fontSize: 24 }}>💵</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>Cash on Delivery</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pay when order is delivered</Text>
              </View>
              <View style={[styles.paymentRadio, { borderColor: paymentMethod === 'cod' ? '#5B52E8' : colors.border }]}>
                {paymentMethod === 'cod' && <View style={styles.paymentRadioInner} />}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity activeOpacity={0.85} onPress={handlePlaceOrder} disabled={loading} style={styles.gradientBtnWrapper}>
            <LinearGradient
              colors={['#6C5CE7', '#FF7675']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.gradientBtnText}>Place Order  ₹{totalAmount}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // STEP 6: Order Confirmed
  if (step === 6) {
    return (
      <LinearGradient
        colors={isDark ? ['#0F0E1A', '#1A1830'] : ['#EDE8FF', '#FFF0EA']}
        style={styles.root}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.confirmedScrollContent}>
          {/* Confirmed Animation Checkmark */}
          <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg }}>
            <Image
              source={require('../../assets/image 85.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.confirmedTitle, { color: isDark ? '#FFFFFF' : '#321D8C' }]}>Order Confirmed !</Text>
          <Text style={[styles.confirmedSubtitle, { color: colors.textSecondary }]}>We've received your order</Text>

          {/* Details Table */}
          <View style={[styles.confirmedDetailsBox, { backgroundColor: colors.card }]}>
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.textSecondary }}>order ID</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>#{placedOrder?.order_number || 'LW12345'}</Text>
            </View>
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.textSecondary }}>Category</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>Wash & Fold</Text>
            </View>
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.textSecondary }}>Items</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>{selectedItemsCount} items</Text>
            </View>
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.textSecondary }}>Laundry Store</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>{targetShopName}</Text>
            </View>
            {targetOwnerName ? (
              <View style={styles.confirmedDetailRow}>
                <Text style={{ color: colors.textSecondary }}>Owner Name</Text>
                <Text style={[{ color: colors.text }, styles.boldText]}>{targetOwnerName}</Text>
              </View>
            ) : null}
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.textSecondary }}>Pickup</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>Today, {selectedSlot}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.confirmedDetailRow}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Total Paid</Text>
              <Text style={{ color: '#5B52E8', fontWeight: '800', fontSize: 16 }}>₹{totalAmount}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.confirmedButtonsContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (placedOrder) {
                const completeShopObj = {
                  id: targetShopId,
                  name: targetShopName,
                  owner_name: targetOwnerName,
                  address: targetShopAddress,
                  phone: (targetShop as any)?.phone || '9876543210',
                };
                const orderWithShop = {
                  ...placedOrder,
                  shop_name: targetShopName,
                  owner_name: targetOwnerName,
                  shop_address: targetShopAddress,
                  shop_phone: (targetShop as any)?.phone || '9876543210',
                  shop: completeShopObj,
                };
                navigation.navigate('Tracking', {
                  orderId: placedOrder.id,
                  order: orderWithShop,
                  shopName: targetShopName,
                  ownerName: targetOwnerName,
                  shopLocation: targetShopAddress,
                  shopPhone: (targetShop as any)?.phone || '9876543210',
                  shop: completeShopObj,
                });
              } else {
                navigation.navigate('MainTabs', { screen: 'Orders' });
              }
            }}
            style={styles.gradientBtnWrapper}
          >
            <LinearGradient
              colors={['#6C5CE7', '#FF7675']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.gradientBtnText}>Track Order</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setStep(1);
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }}
            style={styles.backHomeBtn}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return null;
};

export const BookingScreen = (props: any) => {
  return (
    <View style={{ flex: 1 }}>
      <BookingScreenInner {...props} />
      {/* Decorative Sparkles & Bubbles overlays (Slider side & Footer side) */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },
  selectedShopCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    shadowColor: '#5B52E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedShopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedShopBadge: {
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedShopBadgeText: {
    color: '#5B52E8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedShopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedShopIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedShopName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  selectedShopOwner: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  selectedShopAddress: {
    fontSize: 12,
    fontWeight: '500',
  },
  servicesContainer: {
    marginTop: SPACING.md,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#1A1830',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFAF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  serviceDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#5B52E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  promoImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoImage: {
    width: 50,
    height: 50,
  },
  promoTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  promoDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomCtaContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.xl,
    paddingTop: SPACING.sm,
  },
  gradientBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backArrowText: {
    fontSize: 24,
    fontWeight: '700',
  },

  // STEP 2 styles (Add Items)
  itemsListContainer: {
    marginTop: SPACING.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  itemEmoji: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  itemImage: {
    width: 46,
    height: 46,
  },
  itemMeta: {
    flex: 1,
  },
  itemLabelName: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemLabelPrice: {
    fontSize: 13,
    marginTop: 2,
  },
  qtyRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  qtyCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNumberText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  bottomDetailsContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#EDE8FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
  },
  gradientBtnWrapperHalf: {
    borderRadius: 26,
    overflow: 'hidden',
    width: '55%',
  },
  gradientBtnHalf: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // STEP 3 styles (Review Order)
  reviewServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  reviewServiceIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  reviewServiceImage: {
    width: 48,
    height: 48,
  },
  changeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    backgroundColor: '#F9F7FF',
  },
  changeBtnText: {
    color: '#5B52E8',
    fontSize: 12,
    fontWeight: '700',
  },
  itemsReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  itemsReviewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  editItemsText: {
    color: '#5B52E8',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewItemsBox: {
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDE8FF',
  },
  reviewItemEmoji: {
    fontSize: 28,
  },
  reviewItemImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  reviewItemImage: {
    width: 32,
    height: 32,
  },
  reviewItemLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  qtyRowContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: SPACING.md,
  },
  qtySquareBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputBoxSmall: {
    width: 28,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNumberTextSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'right',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  addonCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
  },
  addonTextMeta: {
    flex: 1,
  },
  addonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  addonCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldText: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },

  // STEP 4 styles (Pickup details)
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  slotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  offPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  offPillText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  shopScheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: SPACING.sm,
  },
  shopScheduleNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  daysScrollContainer: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  dayChip: {
    width: 64,
    height: 78,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayChipDayName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayChipDayNum: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 1,
  },
  dayChipMonth: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipClosedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
  },
  chipClosedBadgeText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  chipSelectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  slotEndedBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  addressReviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  addressIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dateSelectorText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: 14,
    fontWeight: '700',
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  slotSelectBtn: {
    width: '48%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSelectText: {
    fontSize: 13,
  },

  // STEP 5 styles (Payment)
  paymentAmountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  paymentOptionsBox: {
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 0.5,
  },
  paymentMethodIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodImage: {
    width: 36,
    height: 36,
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5B52E8',
  },

  // STEP 6 styles (Confirmed)
  confirmedScrollContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
  },
  checkmarkOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF0EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  checkmarkGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  confirmedSubtitle: {
    fontSize: 15,
    marginTop: SPACING.xs,
    marginBottom: 40,
  },
  confirmedDetailsBox: {
    width: '100%',
    borderRadius: 20,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  confirmedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmedButtonsContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.xl,
    gap: SPACING.sm,
  },
  backHomeBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BookingScreen;
