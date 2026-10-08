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
} from 'react-native';
import AppScreen from '../../components/AppScreen';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { addOrder } from '../../store/orderSlice';
import { orderService } from '../../services/orderService';
import { addressService } from '../../services/addressService';
import { DEFAULT_SHOPS } from '../../services/shopService';
import { Address } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootState } from '../../store';
import {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocode,
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
];

const ITEM_IMAGES: Record<string, any> = {
  t_shirt: require('../../../assets/myimages/row1_1.png'),
  trousers: require('../../../assets/myimages/row1_2.png'),
  kurta: require('../../../assets/myimages/row1_3.png'),
  jeans: require('../../../assets/myimages/row2_1.png'),
  saree: require('../../../assets/myimages/row2_2.png'),
  towel: require('../../../assets/myimages/row2_3.png'),
  shirt: require('../../../assets/myimages/row3_1.png'),
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

const PAYMENT_METHODS = [
  { key: 'google_pay', label: 'Google Pay', image: require('../../../assets/myimages/pay_gpay.png'), subText: 'example@okicici' },
  { key: 'phonepe', label: 'PhonePe', image: require('../../../assets/myimages/pay_phonepe.png') },
  { key: 'paytm', label: 'Paytm', image: require('../../../assets/myimages/pay_paytm.png') },
  { key: 'card', label: 'Credit / Debit Card', image: require('../../../assets/myimages/pay_card.png') },
  { key: 'upi', label: 'UPI ID', image: require('../../../assets/myimages/pay_upi.png') },
];

const BookingScreenInner = ({ navigation, route }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
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
  const [activeService, setActiveService] = useState<string | null>(
    reorderItems && reorderItems.length > 0 ? (initialCombinations[0]?.serviceKey || 'wash_fold') : null
  );

  // Step 3: Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Step 4: Pickup Address, Date, Time Slot
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[1]); // 11 AM - 1 PM

  // Step 5: Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<string>('google_pay');

  // Order Confirmed State
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Calculations
  const selectedItemsCount = addedCombinations.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = addedCombinations.reduce((sum, comb) => {
    const itemInfo = CLOTHES_ITEMS.find(c => c.key === comb.itemKey);
    return sum + (itemInfo ? itemInfo.price * comb.quantity : 0);
  }, 0);
  const addonsSubtotal = selectedAddons.reduce((sum, addonKey) => {
    const addon = ADDONS_LIST.find(a => a.key === addonKey);
    return sum + (addon ? addon.price : 0);
  }, 0);
  const pickupDeliveryFee = itemsSubtotal > 199 ? 0 : 30; // Free above 199
  const totalAmount = itemsSubtotal + addonsSubtotal + pickupDeliveryFee;

  // ── Shop Info (component-level so step 1, 3, 6 can access them) ─────────────────
  const targetShopId = Number(route.params?.shopId || route.params?.shop_id || (route.params?.shop?.id) || 44);
  const targetShop = route.params?.shop || route.params?.reorderShop || DEFAULT_SHOPS.find(s => s.id === targetShopId) || DEFAULT_SHOPS[0];
  const targetShopName = route.params?.shopName || route.params?.shop_name || (targetShop as any)?.name || 'Star Wash Ultra Premium';
  const targetOwnerName = route.params?.ownerName || route.params?.owner_name || (targetShop as any)?.owner_name || (targetShop as any)?.ownerName || 'Ashish Bhosale';
  const targetShopAddress = route.params?.shopLocation || route.params?.shop_location || route.params?.shop_address || route.params?.location || (targetShop as any)?.address || (targetShop as any)?.location || 'Tathawade,pune';

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
    setAddedCombinations(prev => {
      const existing = prev.find(c => c.serviceKey === activeService && c.itemKey === itemKey);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) return prev.filter(c => c.id !== existing.id);
        return prev.map(c => c.id === existing.id ? { ...c, quantity: newQty } : c);
      } else if (delta > 0) {
        return [...prev, { id: Date.now().toString() + Math.random(), serviceKey: activeService, itemKey, quantity: delta }];
      }
      return prev;
    });
  };

  const getQtyForActiveService = (itemKey: string) => {
    if (!activeService) return 0;
    const existing = addedCombinations.find(c => c.serviceKey === activeService && c.itemKey === itemKey);
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
      const service = SERVICES.find(s => s.key === comb.serviceKey);
      const item = CLOTHES_ITEMS.find(c => c.key === comb.itemKey);
      const unitPrice = item?.price || 50;
      return {
        name: `${service?.title || comb.serviceKey} - ${item?.label || comb.itemKey}`,
        service_name: service?.title || comb.serviceKey,
        item_name: item?.label || comb.itemKey,
        quantity: comb.quantity,
        price: unitPrice,
        unit_price: unitPrice,
        total: unitPrice * comb.quantity,
        total_price: unitPrice * comb.quantity,
      };
    });

    // Calculate delivery date (2 days after pickup by default)
    const delDate = new Date(pickupDate);
    delDate.setDate(delDate.getDate() + 2);

    // Determine primary service type
    const determinedService = activeService || (addedCombinations.length > 0 ? addedCombinations[0].serviceKey : 'wash_fold');

    // Local ISO YYYY-MM-DD string
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const localPickupDateStr = `${pickupDate.getFullYear()}-${pad(pickupDate.getMonth() + 1)}-${pad(pickupDate.getDate())}`;
    const localDeliveryDateStr = `${delDate.getFullYear()}-${pad(delDate.getMonth() + 1)}-${pad(delDate.getDate())}`;

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
        pickup_date: localPickupDateStr,
        pickup_time: selectedSlot,
        pickup_slot: selectedSlot,
        delivery_date: localDeliveryDateStr,
        notes: `Time Slot: ${selectedSlot}. Addons: ${selectedAddons.join(', ')}`,
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
            <View style={styles.selectedShopCardHeader}>
              <View style={styles.selectedShopBadge}>
                <Text style={styles.selectedShopBadgeText}>SELECTED LAUNDRY STORE</Text>
              </View>
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
            {SERVICES.map(service => {
              const isSelected = activeService === service.key;
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
                      <Text style={[styles.serviceTitle, { color: isSelected ? '#321D8C' : colors.text }]}>
                        {service.title}
                      </Text>
                      <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>
                        {service.desc}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkboxContainer}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 22 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Items List */}
                  {isSelected && (
                    <View style={[styles.itemsListContainer, { marginTop: 10, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: isDark ? '#1a1830' : '#f9f9f9', borderRadius: 12 }]}>
                      {CLOTHES_ITEMS.map(item => {
                        const qty = getQtyForActiveService(item.key);
                        return (
                          <View key={item.key} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
                            <View style={styles.itemImageContainer}>
                              <Image
                                source={ITEM_IMAGES[item.key]}
                                style={styles.itemImage}
                                resizeMode="contain"
                              />
                            </View>
                            <View style={styles.itemMeta}>
                              <Text style={[styles.itemLabelName, { color: colors.text }]}>{item.label}</Text>
                              <Text style={[styles.itemLabelPrice, { color: colors.textSecondary }]}>₹{item.price}</Text>
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

          <View style={[styles.promoCard, { backgroundColor: isDark ? '#2D2A5E' : '#F0EEFF' }]}>
            <View style={styles.promoImageWrapper}>
              <Image
                source={require('../../../assets/myimages/delivery_icon.png')}
                style={styles.promoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.promoTextContainer}>
              <Text style={[styles.promoTitle, { color: '#321D8C' }]}>Free pickup & delivery</Text>
              <Text style={[styles.promoDesc, { color: colors.textSecondary }]}>On orders above ₹199</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomDetailsContainer, { backgroundColor: colors.card }]}>
          <View>
            <Text style={{ color: '#5B52E8', fontSize: 13, fontWeight: '700' }}>
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
      </LinearGradient>
    );
  }

  // STEP 3: Review Order
  if (step === 3) {
    const currentService = SERVICES.find(s => s.key === activeService) || SERVICES[0];
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
            <View style={styles.selectedShopCardHeader}>
              <View style={styles.selectedShopBadge}>
                <Text style={styles.selectedShopBadgeText}>SELECTED LAUNDRY STORE</Text>
              </View>
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
              const itemInfo = CLOTHES_ITEMS.find(c => c.key === comb.itemKey);
              if (!itemInfo) return null;
              return (
                <View key={comb.id} style={styles.reviewItemRow}>
                  <View style={styles.reviewItemImageContainer}>
                    <Image
                      source={ITEM_IMAGES[itemInfo.key]}
                      style={styles.reviewItemImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={[styles.reviewItemLabel, { color: colors.text }]}>
                      {itemInfo.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {SERVICES.find(s => s.key === comb.serviceKey)?.title || ''} • ₹{itemInfo.price}
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

          {/* Payment Summary */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Payment Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Total</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>₹{itemsSubtotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Add-ons</Text>
              <Text style={[{ color: colors.text }, styles.boldText]}>₹{addonsSubtotal}</Text>
            </View>
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

          {/* Pickup Date */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Pickups Date</Text>
          <TouchableOpacity
            style={[styles.dateSelectorBtn, { backgroundColor: colors.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>📅</Text>
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {pickupDate.toDateString() === new Date().toDateString() ? 'Today, ' : ''}
              {pickupDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 8 }}>▼</Text>
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
                  setPickupDate(date);
                }
              }}
            />
          )}

          {/* Pickup Time Slots */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Pickups Time Slot</Text>
          <View style={styles.slotsContainer}>
            {TIME_SLOTS.map(slot => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  style={[
                    styles.slotSelectBtn,
                    {
                      backgroundColor: isSelected ? '#F0EEFF' : colors.card,
                      borderColor: isSelected ? '#5B52E8' : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    }
                  ]}
                >
                  <Text style={[
                    styles.slotSelectText,
                    { color: isSelected ? '#321D8C' : colors.text, fontWeight: isSelected ? '700' : '500' }
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setStep(5)} style={styles.gradientBtnWrapper}>
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
            <Text style={{ color: '#321D8C', fontSize: 28, fontWeight: '800' }}>₹{totalAmount}</Text>
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

          <Text style={[styles.confirmedTitle, { color: '#321D8C' }]}>Order Confirmed !</Text>
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
              navigation.navigate('Home');
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
    marginBottom: SPACING.lg,
  },
  dateSelectorText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: 15,
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
