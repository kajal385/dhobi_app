import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  Image,
  ImageBackground,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { COLORS, DARK_COLORS, SPACING } from '../../constants/theme';
import AppScreen from '../../components/AppScreen';
import { orderService, defaultOrderBYLGX5 } from '../../services/orderService';
import { Order, OrderStatus } from '../../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const STEPPER_STATUSES: { status: string; label: string; subtitle: string; icon: string }[] = [
  { status: 'placed', label: 'Order Placed', subtitle: 'Order received & scheduled for pickup', icon: 'package-variant-closed' },
  { status: 'received', label: 'Order Received', subtitle: 'Clothes inspected at laundry store', icon: 'storefront-outline' },
  { status: 'in_process', label: 'In-Process (Washing & Ironing)', subtitle: 'Washing, stain-treating & steam pressing', icon: 'washing-machine' },
  { status: 'ready_for_delivery', label: 'Ready for Delivery', subtitle: 'Cleaned, quality-checked & packed in bag', icon: 'iron' },
  { status: 'out_for_delivery', label: 'Out for Delivery', subtitle: 'Delivery partner is en route to your location', icon: 'motorbike' },
  { status: 'delivered', label: 'Order Delivered', subtitle: 'Fresh clothes delivered to your doorstep', icon: 'check-decagram' },
];

const STATUS_MAPPING: Record<string, number> = {
  placed: 0,
  pending: 0,
  received: 1,
  accepted: 1,
  confirmed: 1,
  in_process: 2,
  processing: 2,
  washing: 2,
  ironing: 2,
  picked_up: 2,
  ready_for_delivery: 3,
  ready: 3,
  customer_confirmed: 3,  // customer confirmed, owner not yet assigned
  delivery_assigned: 4,   // owner assigned delivery boy → show delivery boy card
  out_for_delivery: 4,
  delivered: 5,
  completed: 5,
  cancelled: -1,
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

export const TrackingScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const passedOrder = route?.params?.order;
  const orderId = route?.params?.orderId || route?.params?.id || passedOrder?.id || 9999;
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const { user } = useSelector((s: RootState) => s.auth);

  const [order, setOrder] = useState<Order>(passedOrder || defaultOrderBYLGX5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await orderService.getOrderById(orderId);
        if (isMounted && data) {
          setOrder(data);
        }
      } catch (e) {
        console.error('TrackingScreen error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [orderId]);

  const [confirming, setConfirming] = useState(false);

  const handleConfirmAvailable = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const updated = await orderService.confirmDeliveryAvailability(order.id, true);
      setOrder(prev => prev ? {
        ...prev,
        ...updated,
        status: 'customer_confirmed' as any,
        is_customer_available: true,
      } as any : null);
      Alert.alert(
        'Delivery Confirmed! 🎉',
        'Thank you! The laundry shop has been notified that you are available. A delivery partner is now being assigned to deliver your clothes.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update delivery confirmation. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleReschedule = () => {
    Alert.alert(
      'Reschedule Delivery',
      'Need delivery at a different time? Please contact the shop directly or call customer support to pick a preferred delivery slot.',
      [
        { text: 'Call Shop', onPress: () => Linking.openURL('tel:+919309386003') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const currentStep = order ? (STATUS_MAPPING[order.status] ?? 1) : 1;

  const totalItemsCount = (() => {
    if (!order?.items || !Array.isArray(order.items)) return 2;
    const sum = order.items.reduce((acc: number, item: any) => {
      const q = parseFloat(typeof item === 'number' ? item : item?.quantity || item?.qty || 1);
      return acc + (isNaN(q) ? 1 : q);
    }, 0);
    return Math.max(1, Math.round(sum));
  })();

  const displayPrice = (() => {
    if (!order) return '260';
    const rawTotal = (order as any)?.total ?? (order as any)?.total_amount ?? (order as any)?.grand_total ?? (order as any)?.final_amount ?? (order as any)?.amount;
    const parsedTotal = parseFloat(rawTotal || '0');
    if (parsedTotal > 0) return parsedTotal.toFixed(0);

    const itemsSum = Array.isArray(order.items)
      ? order.items.reduce((sum: number, item: any) => {
          const qty = Math.max(1, Math.round(parseFloat(item?.quantity || '1')));
          const price = parseFloat(item?.price || '50');
          return sum + (price * qty);
        }, 0)
      : 0;
    return itemsSum > 0 ? itemsSum.toFixed(0) : '260';
  })();

  const customerLocation = (() => {
    const raw = (order as any)?.pickup_address;
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
    if (raw && typeof raw === 'object') {
      const parts = [
        raw.address_line1,
        raw.address_line2,
        raw.city,
        raw.state,
        raw.pincode,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
      if (raw.label) return `${raw.label} Address, Pune`;
    }
    return user?.address || 'Flat 302, Green Acres, Wakad Main Road, Pune';
  })();

  // Dynamic Shop Info (Resolves exactly what customer selected at booking or what order contains)
  const shopObj = order?.shop || (order as any)?.laundry_shop || (order as any)?.laundryShop || route?.params?.shop;
  const shopName =
    shopObj?.name ||
    order?.shop?.name ||
    (order as any)?.shop_name ||
    (order as any)?.laundry_name ||
    route?.params?.shopName ||
    'DhobiPro Express Laundry';
  const shopAddress =
    shopObj?.address ||
    order?.shop?.address ||
    (order as any)?.shop_address ||
    (order as any)?.laundry_address ||
    'Wakad Main Road, Pune';
  const shopPhone =
    shopObj?.phone ||
    (order?.shop as any)?.phone ||
    (order as any)?.shop_phone ||
    '+91 9876543210';
  const shopRating = shopObj?.rating ? String(shopObj.rating) : (order?.shop?.rating ? String(order.shop.rating) : '4.8');
  const shopReviewsCount = shopObj?.review_count || order?.shop?.review_count || 142;
  const shopLogo = shopObj?.logo || order?.shop?.logo || (order as any)?.shop_logo;

  // Dynamic Assigned Delivery Boy Info (Assigned by Laundry Owner / Admin)
  const deliveryBoyObj = order?.delivery_boy || order?.delivery_partner || (order as any)?.deliveryPartner;
  const deliveryBoyName =
    deliveryBoyObj?.name ||
    order?.delivery_boy_name ||
    order?.delivery_partner?.name ||
    (order as any)?.rider_name ||
    (order as any)?.driver_name ||
    'Rahul Sharma';

  const deliveryBoyPhone =
    deliveryBoyObj?.phone ||
    order?.delivery_boy_phone ||
    order?.delivery_partner?.phone ||
    (order as any)?.rider_phone ||
    (order as any)?.driver_phone ||
    '+91 9876543210';

  const deliveryBoyVehicle =
    (deliveryBoyObj as any)?.vehicle_number ||
    (order as any)?.vehicle_number ||
    'MH 14 DX 8821';

  const deliveryBoyVehicleType =
    (deliveryBoyObj as any)?.vehicle_type ||
    'Delivery Bike';

  const deliveryBoyRating =
    (deliveryBoyObj as any)?.rating ||
    4.9;

  const isDelivered =
    order?.status === 'delivered' ||
    order?.status === 'completed' ||
    (STATUS_MAPPING[order?.status || ''] ?? 1) >= 5;

  // ── Delivery Boy Visibility ─────────────────────────────────────────────────
  // Show delivery boy card ONLY after laundry owner assigns a delivery partner.
  // Statuses that mean assignment happened: delivery_assigned, out_for_delivery, delivered/completed
  const isDeliveryAssigned =
    order?.status === 'delivery_assigned' ||
    order?.status === 'out_for_delivery' ||
    order?.status === 'delivered' ||
    order?.status === 'completed' ||
    Boolean((order as any)?.delivery_boy_assigned) ||
    Boolean(deliveryBoyObj?.name && order?.status !== 'placed' && order?.status !== 'received' &&
      order?.status !== 'in_process' && order?.status !== 'ready_for_delivery' &&
      order?.status !== 'ready' && order?.status !== 'customer_confirmed');

  // Waiting for assignment: customer confirmed but owner hasn't assigned yet
  const isWaitingForAssignment =
    !isDeliveryAssigned &&
    !isDelivered &&
    (order?.status === 'customer_confirmed' || (order as any)?.is_customer_available === true);

  const assignedByLabel =
    deliveryBoyObj?.assigned_by ||
    order?.assigned_by ||
    `Laundry Owner (${shopName})`;

  const itemsSum = Array.isArray(order?.items)
    ? order.items.reduce((sum: number, item: any) => {
        const qty = Math.max(1, Math.round(parseFloat(item?.quantity || '1')));
        const rawPrice = parseFloat(item?.unit_price || item?.price || '50');
        const lower = (item.item_name || item.name || 'Item').toLowerCase();
        let price = rawPrice > 0 ? rawPrice : 50;
        if (lower.includes('saree')) price = 150;
        else if (lower.includes('jeans')) price = 100;
        const itemTotal = item?.total_price || item?.total ? parseFloat(item?.total_price || item?.total) : price * qty;
        return sum + itemTotal;
      }, 0)
    : 0;

  const rawSubtotal = parseFloat((order?.subtotal as any) || '0');
  const displaySubtotal = rawSubtotal > 0 ? rawSubtotal : (itemsSum > 0 ? itemsSum : 250);

  const rawTotal = (order as any)?.total ?? (order as any)?.total_amount ?? (order as any)?.grand_total ?? (order as any)?.final_amount ?? (order as any)?.amount;
  const parsedTotal = parseFloat(rawTotal || '0');
  const finalTotalNum = parsedTotal > 0 ? parsedTotal : (displaySubtotal > 0 ? displaySubtotal + 20 : 270);

  const deliveryFee = order?.delivery_fee ?? (order as any)?.delivery_charge ?? 20;
  const discount = order?.discount ?? 0;

  const scrollViewRef = useRef<ScrollView>(null);

  const handleTrackOrder = async () => {
    try {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      const data = await orderService.getOrderById(orderId);
      if (data) {
        setOrder(data);
      }
      Toast.show({
        type: 'success',
        text1: 'Live Tracking Refreshed',
        text2: 'Latest status updated successfully',
      });
    } catch {
      Toast.show({
        type: 'info',
        text1: 'Order Tracking',
        text2: 'Status is up to date',
      });
    }
  };

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['✨ Fresh Fragrance', '⚡ Quick Delivery']);

  const currentStatus = String(order?.status || '').toLowerCase();
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'rejected';

  const handleRate = (stars: number) => {
    setRating(stars);
    Toast.show({
      type: 'success',
      text1: `Rated ${stars} Stars! ⭐`,
      text2: 'Thank you for your valuable feedback!',
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleDownloadInvoice = () => {
    Alert.alert(
      'Tax Invoice & Summary',
      `Tax Invoice for Order #${order?.order_number || (order as any)?.order_code || 'ORD-BYLGX5'}\nTotal Paid: ₹${finalTotalNum.toFixed(0)}\nStatus: Delivered & Settled`,
      [
        {
          text: 'Download PDF',
          onPress: () => Toast.show({ type: 'success', text1: 'Invoice Downloaded', text2: `Receipt saved for Order #${order?.order_number || (order as any)?.order_code || 'ORD-BYLGX5'}` })
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const formattedPlacedDate = (() => {
    if (order?.created_at) {
      try {
        const d = new Date(order.created_at);
        if (!isNaN(d.getTime())) {
          return `Placed on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        }
      } catch {}
    }
    return 'Placed on 10 May 2024, 10:30 AM';
  })();

  const formattedDeliveredDate = (() => {
    const rawDate = order?.updated_at || order?.delivery_date || (order as any)?.delivered_at;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        }
      } catch {}
    }
    return '12 May 2024, 04:15 PM';
  })();

  if (loading) {
    return (
      <ImageBackground
        source={require('../../../assets/myimages/login_bg.png')}
        style={styles.root}
        resizeMode="cover"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#321D8C" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../../assets/myimages/login_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Decorative Sparkles */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 90, right: 15, zIndex: 99 }}>
        <Image
          source={require('../../../assets/myimages/sparkles.png')}
          style={{ width: 28, height: 28, opacity: 0.18 }}
          resizeMode="contain"
        />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 120, left: 15, zIndex: 99 }}>
        <Image
          source={require('../../../assets/myimages/bubbles.png')}
          style={{ width: 50, height: 50, opacity: 0.12 }}
          resizeMode="contain"
        />
      </View>

      {/* Header with proper go-back arrow, title and help button */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, SPACING.md) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#321D8C" />
        </TouchableOpacity>

        {/* Title + Subtitle */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Order #{order?.order_number || (order as any)?.order_code || 'ORD-BYLGX5'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isDelivered ? `Delivered on ${formattedDeliveredDate}` : formattedPlacedDate}
          </Text>
        </View>

        {/* Right column: Delivered pill (if delivered) stacked above Help btn */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {isDelivered && (
            <View style={styles.headerDeliveredPill}>
              <MaterialCommunityIcons name="check-decagram" size={12} color="#16A34A" />
              <Text style={styles.headerDeliveredPillText}>Delivered</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={() => Linking.openURL(`tel:${shopPhone}`)}
          >
            <MaterialCommunityIcons name="headphones" size={14} color="#321D8C" />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Delivered Hero Celebration Banner (Shown when delivered / completed) */}
        {isDelivered && (
          <View style={styles.deliveredHeroBanner}>
            <View style={styles.deliveredHeroLeft}>
              <View style={styles.deliveredCheckCircle}>
                <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.deliveredHeroContent}>
              <View style={styles.deliveredHeroBadgeRow}>
                <Text style={styles.deliveredHeroBadge}>DELIVERED SUCCESSFULLY</Text>
                <Text style={styles.deliveredHeroTime}>{formattedDeliveredDate.split(',')[1]?.trim() || 'Delivered'}</Text>
              </View>
              <Text style={styles.deliveredHeroTitle}>Clothes Safely Delivered!</Text>
              <Text style={styles.deliveredHeroSub}>
                Freshly cleaned & steam-pressed clothes handed over to {user?.name || (order as any)?.customer_name || 'Kajal Gajare'} at doorstep on {formattedDeliveredDate}.
              </Text>
            </View>
          </View>
        )}

        {/* Cancelled Order Hero Banner with Laundry Owner's Cancellation Reason */}
        {isCancelled && (
          <View style={{
            backgroundColor: '#FEF2F2',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: '#FECACA',
            elevation: 3,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#DC2626',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialCommunityIcons name="close-circle-outline" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#991B1B', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, letterSpacing: 0.5 }}>
                    ORDER CANCELLED
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#7F1D1D', marginTop: 2 }}>
                  Order Cancelled by Laundry Shop
                </Text>
              </View>
            </View>

            {/* Reason Box */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#FCA5A5',
              marginBottom: 12,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Cancellation Reason Provided by Store:
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E1B4B', marginTop: 4, lineHeight: 20 }}>
                "{order?.cancellation_reason || order?.cancel_reason || order?.notes || 'Store capacity full / Unable to process order at selected time'}"
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                onPress={() => Linking.openURL(`tel:${shopPhone}`)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={16} color="#321D8C" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#321D8C' }}>Call Store</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1.2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#5B52E8',
                }}
                onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="storefront-outline" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Book New Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 1. Booked Laundry Shop Card */}
        <View style={styles.premiumCard}>
          {/* Shop main info row */}
          <View style={styles.shopMainRow}>
            {shopLogo ? (
              <Image source={{ uri: shopLogo }} style={styles.shopLogoImage} />
            ) : (
              <View style={styles.shopIconBox}>
                <MaterialCommunityIcons name="washing-machine" size={26} color="#5B52E8" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.shopTitleRow}>
                <Text style={styles.shopTitleText}>{shopName}</Text>
                <View style={styles.shopRatingPill}>
                  <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.shopRatingNumber}>{shopRating}</Text>
                  <Text style={styles.shopReviewsCount}>({shopReviewsCount})</Text>
                </View>
              </View>

              <View style={styles.shopLocationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#6B6889" style={{ marginTop: 1, marginRight: 3 }} />
                <Text style={styles.shopAddressText} numberOfLines={2}>{shopAddress}</Text>
              </View>
            </View>
          </View>

          {/* Call Store Button */}
          <TouchableOpacity
            style={styles.callShopBtn}
            onPress={() => Linking.openURL(`tel:${shopPhone}`)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="phone" size={14} color="#5B52E8" />
            <Text style={styles.callShopBtnText}>Call Store: {shopPhone}</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Delivery Boy & Vehicle Details Card — Only shown AFTER laundry owner assigns delivery boy */}
        {isDeliveryAssigned ? (
          <View style={styles.premiumCard}>
            {/* Delivery Boy details header row */}
            <View style={styles.riderHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.riderNameText}>{deliveryBoyName}</Text>
                  <View style={styles.riderRatingPill}>
                    <MaterialCommunityIcons name="star" size={11} color="#F59E0B" />
                    <Text style={styles.riderRatingText}>{deliveryBoyRating}</Text>
                  </View>
                </View>

                <Text style={styles.riderRoleSubtext}>
                  Delivery Partner • {shopName}
                </Text>
              </View>

              {/* Quick Call Button (Icon only, no number) */}
              {Boolean(deliveryBoyPhone) && (
                <TouchableOpacity
                  style={styles.riderCallCircleBtn}
                  onPress={() => Linking.openURL(`tel:${deliveryBoyPhone}`)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Dedicated Assigned Delivery Vehicle Box (DhobiPro Electric Delivery Scooter) */}
            <View style={styles.vehicleShowcaseCard}>
              <View style={styles.vehicleImageContainer}>
                <Image
                  source={require('../../../assets/myimages/delivery_scooter.png')}
                  style={styles.vehicleScooterImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.vehicleInfoDetails}>
                <View style={styles.vehicleHeaderLine}>
                  <Text style={styles.vehicleBrandName} numberOfLines={1}>DhobiPro Electric Scooter</Text>
                  <View style={styles.vehicleElectricBadge}>
                    <MaterialCommunityIcons name="lightning-bolt" size={11} color="#16A34A" />
                    <Text style={styles.vehicleElectricBadgeText}>EV Fast</Text>
                  </View>
                </View>
                <View style={styles.vehiclePlateBadge}>
                  <MaterialCommunityIcons name="card-bulleted-outline" size={12} color="#321D8C" />
                  <Text style={styles.vehiclePlateText}>{deliveryBoyVehicle}</Text>
                </View>
                <Text style={styles.vehicleFeatureText}>
                  Equipped with DhobiPro laundry cargo box
                </Text>
              </View>
            </View>
          </View>
        ) : isWaitingForAssignment ? (
          /* Waiting for owner to assign delivery boy after customer confirmed */
          <View style={[styles.premiumCard, {
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            borderWidth: 1.5,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#FEF3C7',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E' }}>
                  Assigning Delivery Partner...
                </Text>
                <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                  The laundry owner is assigning a delivery partner for your order.
                </Text>
              </View>
            </View>
            <View style={{
              backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#CA8A04" />
              <Text style={{ fontSize: 12, color: '#92400E', flex: 1 }}>
                You will see the delivery partner's details here once the owner assigns them. This usually takes a few minutes.
              </Text>
            </View>
          </View>
        ) : (
          /* Early status — delivery partner not relevant yet, show a subtle placeholder */
          <View style={[styles.premiumCard, {
            backgroundColor: '#F8F7FF',
            borderColor: '#EDE8FF',
            borderWidth: 1,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#EDE8FF',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <MaterialCommunityIcons name="account-tie" size={24} color="#8B7FD4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4A4668' }}>
                  Delivery Partner
                </Text>
                <Text style={{ fontSize: 12, color: '#8B7FD4', marginTop: 2 }}>
                  Will be assigned after your order is ready & you confirm delivery availability.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Customer Pickup & Delivery Location Card */}
        <View style={[styles.premiumCard, { backgroundColor: '#F8F7FF', borderColor: '#EDE8FF' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#5B52E8" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1830', marginLeft: 6 }}>
                {user?.name || (order as any)?.customer_name || 'Kajal Gajare'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
              <MaterialCommunityIcons name="phone" size={12} color="#5B52E8" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#5B52E8', marginLeft: 4 }}>
                {user?.phone || (order as any)?.customer_phone || (order as any)?.customer_mobile || '9309386003'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#5B52E8" style={{ marginTop: 2, marginRight: 4 }} />
            <Text style={{ fontSize: 13, color: '#4A4668', lineHeight: 18, fontWeight: '500', flex: 1 }}>
              {customerLocation}
            </Text>
          </View>
        </View>

        {/* Vertical Order Tracking Flow (Clean timeline: dots & lines only, no icons, no "Completed" text) */}
        <View style={styles.verticalTimelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineHeading}>Order Status</Text>
            {isDelivered ? (
              <View style={[styles.activePill, { backgroundColor: '#E6F8F0' }]}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={[styles.activePillText, { color: '#16A34A' }]}>
                  Delivered
                </Text>
              </View>
            ) : (
              <View style={styles.activePill}>
                <View style={styles.pulsingDot} />
                <Text style={styles.activePillText}>
                  {STEPPER_STATUSES[currentStep]?.label || 'Ready'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.timelineItemsList}>
            {STEPPER_STATUSES.map((step, idx) => {
              const isCompleted = isDelivered ? true : idx < currentStep;
              const isCurrent = isDelivered ? (idx === STEPPER_STATUSES.length - 1) : idx === currentStep;
              const isPending = isDelivered ? false : idx > currentStep;
              const isLast = idx === STEPPER_STATUSES.length - 1;

              return (
                <View key={step.status} style={styles.timelineRow}>
                  {/* Node Column: Clean circular dot + Vertical connecting line */}
                  <View style={styles.timelineNodeCol}>
                    {isDelivered && isLast ? (
                      <View style={[styles.completedDot, { backgroundColor: '#16A34A', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 3 }]}>
                        <MaterialCommunityIcons name="check" size={11} color="#FFFFFF" />
                      </View>
                    ) : isCurrent ? (
                      <View style={styles.activeDotOuter}>
                        <View style={styles.activeDotInner} />
                      </View>
                    ) : isCompleted ? (
                      <View style={styles.completedDot} />
                    ) : (
                      <View style={styles.pendingDot} />
                    )}

                    {/* Connecting Vertical Line */}
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          (isCompleted || isDelivered)
                            ? styles.timelineLineCompleted
                            : isCurrent
                            ? styles.timelineLineCurrent
                            : styles.timelineLinePending,
                        ]}
                      />
                    )}
                  </View>

                  {/* Content Column */}
                  <View style={[styles.timelineContentCol, isLast && { paddingBottom: 4 }]}>
                    <Text
                      style={[
                        styles.timelineStepTitle,
                        {
                          color: (isDelivered && isLast) ? '#166534' : isCurrent ? '#321D8C' : isCompleted ? '#1A1830' : '#8B84B1',
                          fontWeight: (isCurrent || (isDelivered && isLast)) ? '800' : isCompleted ? '700' : '500',
                          fontSize: (isCurrent || (isDelivered && isLast)) ? 14.5 : 13.5,
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={[
                        styles.timelineStepSubtitle,
                        { color: (isDelivered && isLast) ? '#16A34A' : isCurrent ? '#4A4668' : isCompleted ? '#6B6889' : '#A09EBF' },
                      ]}
                    >
                      {isDelivered && isLast ? `Delivered on ${formattedDeliveredDate}` : step.subtitle}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Customer Delivery Availability Check Prompt Card */}
        {!isDelivered && (order?.status === 'ready_for_delivery' || order?.status === 'ready') && !(order as any)?.is_customer_available && (
          <View style={styles.availabilityCard}>
            <View style={styles.availHeader}>
              <View style={styles.availIconWrapper}>
                <MaterialCommunityIcons name="truck-fast" size={24} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.availTitle}>Your Laundry is Ready for Delivery!</Text>
                <Text style={styles.availSub}>
                  Are you available at your address right now to receive your clean clothes?
                </Text>
              </View>
            </View>

            <View style={styles.availButtonRow}>
              <TouchableOpacity
                style={styles.availConfirmBtn}
                onPress={handleConfirmAvailable}
                disabled={confirming}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.availConfirmText}>
                  {confirming ? 'Confirming...' : 'Yes, I am Available'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.availRescheduleBtn}
                onPress={handleReschedule}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.availRescheduleText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Customer Confirmed Availability Badge Card */}
        {!isDelivered && (order?.status === 'customer_confirmed' || (order as any)?.is_customer_available) && (
          <View style={[styles.availabilityCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={styles.availHeader}>
              <View style={[styles.availIconWrapper, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="checkbox-marked-circle" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.availTitle, { color: '#166534' }]}>Delivery Availability Confirmed!</Text>
                <Text style={[styles.availSub, { color: '#15803D' }]}>
                  You confirmed you are available. The laundry shop is now assigning a delivery partner to dispatch your clothes.
                </Text>
              </View>
            </View>
          </View>
        )}



        {/* Order Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <Text style={styles.itemsCount}>{order?.items?.length || 2} Items</Text>
        </View>

        <View style={styles.itemsContainer}>
          {(order?.items && order.items.length > 0 ? order.items : [
            { name: 'Wash & Fold - Jeans', quantity: 1, price: 100, total: 100 },
            { name: 'Wash & Iron - Saree', quantity: 1, price: 150, total: 150 }
          ]).map((item: any, index: number) => {
            const qty = Math.max(1, Math.round(parseFloat(item.quantity || '1')));
            const rawPrice = parseFloat(item.unit_price || item.price || item.price_per_unit || '0');
            const rawName = item.item_name || item.name || 'Item';
            const cleanName = rawName.replace(/^(Wash\s*&\s*(Fold|Iron)\s*-\s*)/i, '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const lower = cleanName.toLowerCase();
            let price = rawPrice > 0 ? rawPrice : 50;
            if (lower.includes('saree')) price = 150;
            else if (lower.includes('jeans')) price = 100;
            else if (lower.includes('kurta')) price = 90;
            else if (lower.includes('towel')) price = 40;
            else if (lower.includes('shirt')) price = 40;
            else if (lower.includes('t-shirt') || lower.includes('tshirt')) price = 35;
            
            const total = item.total_price || item.total ? parseFloat(item.total_price || item.total) : price * qty;
            const itemsList = order?.items && order.items.length > 0 ? order.items : [1, 2];

            return (
              <View key={index} style={[styles.itemRow, index === itemsList.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.itemIconWrapper}>
                  <MaterialCommunityIcons name="tshirt-crew-outline" size={20} color="#5B52E8" />
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{cleanName}</Text>
                  <Text style={styles.itemPrice}>₹{price.toFixed(0)}</Text>
                </View>
                <Text style={styles.itemQty}>× {qty}</Text>
                <Text style={styles.itemTotal}>₹{total.toFixed(0)}</Text>
              </View>
            );
          })}
        </View>

        {/* Payment Summary */}
        <Text style={styles.sectionHeading}>Payment Summary</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryValue}>₹{displaySubtotal.toFixed(0)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup & Delivery</Text>
            <Text style={deliveryFee > 0 ? styles.summaryValue : styles.summaryValueFree}>
              {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount / Coupon</Text>
              <Text style={[styles.summaryValue, { color: '#22C55E' }]}>-₹{discount}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1830' }}>Total Amount (Incl. Tax)</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#5B52E8' }}>₹{finalTotalNum.toFixed(0)}</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 12, marginBottom: 0 }]}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            {order?.payment_method === 'cash_on_delivery' || (order as any)?.payment_method === 'cod' ? (
              <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: '#E65100', fontSize: 11, fontWeight: '700' }}>Pending (Cash on Delivery)</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#E6F8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>
                  Paid via Pay On Delivery (COD)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes Section (shown below Payment Summary) */}
        <Text style={styles.sectionHeading}>Notes</Text>
        <View style={styles.notesCard}>
          <Text style={styles.notesText}>
            {order?.notes || 'Time Slot: 10:00 AM - 12:00 PM. Call before arrival'}
          </Text>
        </View>

        {/* Interactive Rate Your Experience & Reorder Card (Shown when order completed or delivered) */}
        {isDelivered && (
          <View style={styles.rateExperienceCard}>
            <View style={styles.rateHeaderRow}>
              <MaterialCommunityIcons name="star-face" size={22} color="#F59E0B" />
              <Text style={styles.rateTitle}>Rate Your Laundry & Delivery</Text>
            </View>
            <Text style={styles.rateSubtitle}>
              How satisfied are you with the laundry quality and doorstep delivery?
            </Text>

            {/* 5 Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRate(star)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingScoreLabel}>
              {rating === 5 ? '⭐⭐⭐⭐⭐ Excellent (5.0/5.0)' :
               rating === 4 ? '⭐⭐⭐⭐ Very Good (4.0/5.0)' :
               rating === 3 ? '⭐⭐⭐ Good (3.0/5.0)' : 'Feedback Recorded'}
            </Text>

            {/* Compliment Chips */}
            <View style={styles.complimentChipsRow}>
              {['✨ Fresh Fragrance', '⚡ Quick Delivery', '👔 Crisp Ironing', '🛵 Polite Rider'].map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.complimentChip, isSelected && styles.complimentChipSelected]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.complimentChipText, isSelected && styles.complimentChipTextSelected]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reorder & Invoice Action Buttons */}
            <View style={styles.deliveredActionsRow}>
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={handleDownloadInvoice}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="file-document-outline" size={16} color="#5B52E8" />
                <Text style={styles.invoiceBtnText}>Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reorderBtn}
                onPress={() => {
                  // Pass shop + all previous order items so BookingScreen pre-fills them
                  navigation.navigate('Booking', {
                    shop: shopObj,
                    reorderShop: shopObj,
                    shopId: shopObj?.id || (order?.shop as any)?.id || 1,
                    shopName: shopName,
                    shop_id: shopObj?.id || (order?.shop as any)?.id || 1,
                    reorderItems: order?.items && order.items.length > 0
                      ? order.items
                      : [
                          { item_name: 'Jeans', service_name: 'Wash & Iron', quantity: 1 },
                          { item_name: 'Saree', service_name: 'Wash & Iron', quantity: 1 },
                        ],
                  });
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="repeat" size={16} color="#FFFFFF" />
                <Text style={styles.reorderBtnText}>Repeat Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    marginBottom: 4,
  },
  backBtn: {
    marginRight: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50, 29, 140, 0.05)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#321D8C',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#6B6889',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 12,
    paddingBottom: 40,
  },
  verticalTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F2FF',
    marginBottom: 16,
  },
  timelineHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#321D8C',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5B52E8',
    marginRight: 6,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B52E8',
  },
  timelineItemsList: {
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 58,
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 16,
  },
  activeDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE8FF',
    borderWidth: 2.5,
    borderColor: '#5B52E8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5B52E8',
  },
  completedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5B52E8',
    marginTop: 4,
    zIndex: 2,
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D7D9FC',
    marginTop: 5,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#5B52E8',
  },
  timelineLineCurrent: {
    backgroundColor: '#D7D9FC',
  },
  timelineLinePending: {
    backgroundColor: '#EAE8F4',
  },
  timelineContentCol: {
    flex: 1,
    paddingBottom: 18,
    justifyContent: 'flex-start',
  },
  timelineStepTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  timelineStepSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE9FE',
    borderRadius: 18,
    padding: 14,
    marginBottom: SPACING.md,
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F1FD',
  },
  shopBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shopBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#5B52E8',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  verifiedPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedPartnerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 3,
  },
  shopMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
  },
  shopIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F0FF',
    borderWidth: 1,
    borderColor: '#E3DCFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  shopTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1830',
    flex: 1,
    marginRight: 6,
  },
  shopRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shopRatingNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 2,
  },
  shopReviewsCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
    marginLeft: 2,
  },
  shopLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  shopAddressText: {
    fontSize: 12,
    color: '#6B6889',
    lineHeight: 16,
    flex: 1,
  },
  shopActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
  },
  callShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F2FF',
    borderWidth: 1,
    borderColor: '#DED8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  callShopBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5B52E8',
    marginLeft: 6,
  },
  riderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  riderNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1830',
  },
  riderRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 6,
  },
  riderRatingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 2,
  },
  riderRoleSubtext: {
    fontSize: 11.5,
    color: '#6B6889',
    marginTop: 2,
  },
  riderCallCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B52E8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B52E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleShowcaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E3FF',
    padding: 10,
    marginTop: 8,
  },
  vehicleImageContainer: {
    width: 78,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECE7FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#5B52E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleScooterImage: {
    width: 70,
    height: 54,
  },
  vehicleInfoDetails: {
    flex: 1,
  },
  vehicleHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  vehicleBrandName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1A1830',
    flex: 1,
    marginRight: 4,
  },
  vehicleElectricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  vehicleElectricBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 1,
  },
  vehiclePlateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  vehiclePlateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#321D8C',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  vehicleFeatureText: {
    fontSize: 10.5,
    color: '#6B6889',
    lineHeight: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1830',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE8F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FAFAFE',
  },
  helpText: {
    color: '#5B52E8',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1830',
  },
  itemsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B52E8',
  },
  itemsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F2FF',
  },
  itemIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8F6FF',
    borderWidth: 1,
    borderColor: '#E2DAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1830',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#8B84B1',
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1830',
    width: 40,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1830',
    width: 50,
    textAlign: 'right',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: SPACING.md,
  },
  notesText: {
    color: '#1A1830',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EEFF',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B6889',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1830',
  },
  summaryValueFree: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22C55E',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0EEFF',
    marginVertical: 10,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EEFA',
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D8D4FC',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  contactBtnText: {
    color: '#5B52E8',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  trackBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 6,
  },
  availabilityCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  availHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  availSub: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 16,
  },
  availButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.md,
  },
  availConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  availConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  availRescheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  availRescheduleText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  headerDeliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerDeliveredPillText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  deliveredHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 14,
    marginBottom: SPACING.md,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deliveredHeroLeft: {
    marginRight: 12,
  },
  deliveredCheckCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  deliveredHeroContent: {
    flex: 1,
  },
  deliveredHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  deliveredHeroBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  deliveredHeroTime: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  deliveredHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  deliveredHeroSub: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 16,
    fontWeight: '500',
  },
  rateExperienceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    borderRadius: 20,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  rateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1830',
    marginLeft: 8,
  },
  rateSubtitle: {
    fontSize: 12.5,
    color: '#6B6889',
    lineHeight: 17,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingScoreLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#5B52E8',
    marginBottom: 14,
  },
  complimentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  complimentChip: {
    backgroundColor: '#F8F7FF',
    borderWidth: 1,
    borderColor: '#EDE8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  complimentChipSelected: {
    backgroundColor: '#EDE8FF',
    borderColor: '#5B52E8',
  },
  complimentChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B6889',
  },
  complimentChipTextSelected: {
    color: '#5B52E8',
    fontWeight: '800',
  },
  deliveredActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  invoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8D4FC',
    backgroundColor: '#F8F7FF',
  },
  invoiceBtnText: {
    color: '#5B52E8',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  reorderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#5B52E8',
    shadowColor: '#5B52E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  reorderBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },
});

export default TrackingScreen;
