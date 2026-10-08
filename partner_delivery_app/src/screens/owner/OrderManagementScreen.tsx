import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { apiClient } from '../../services/apiClient';
import { mockDataStore } from '../../services/mockDataStore';

export const getOrderStatusMeta = (status: string) => {
  const norm = String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  switch (norm) {
    case 'placed':
      return { label: '📦 Placed', bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' };
    case 'received':
    case 'pending':
      return { label: '📥 Received', bg: '#FDF4FF', border: '#F0ABFC', text: '#A21CAF' };
    case 'inprocess':
    case 'process':
    case 'processing':
    case 'accepted':
      return { label: '🔄 In-Process', bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' };
    case 'readyfordelivery':
    case 'ready':
    case 'customerconfirmed':
      return { label: '✨ Ready', bg: '#ECFDF5', border: '#6EE7B7', text: '#047857' };
    case 'deliveryassigned':
    case 'outfordelivery':
      return { label: '🛵 Out for Delivery', bg: '#EDE9FE', border: '#C4B5FD', text: '#6D28D9' };
    case 'delivered':
    case 'completed':
      return { label: '🎉 Delivered', bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' };
    case 'cancelled':
      return { label: '❌ Cancelled', bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' };
    default:
      return { label: status, bg: COLORS.primaryLight, border: COLORS.primary + '40', text: COLORS.primaryDark };
  }
};

export const getPaymentStatusMeta = (status?: string) => {
  switch (status) {
    case 'Paid':
      return { label: '💳 Paid', bg: '#D1FAE5', border: '#6EE7B7', text: '#047857' };
    case 'Partial':
      return { label: '💳 Partial', bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' };
    default:
      return { label: '💳 Unpaid', bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' };
  }
};

const DEMO_ORDERS = [
  {
    id: 'ORD-501',
    customer: 'Amitabh Sharma',
    phone: '+91 98765 43210',
    service: 'Dry Cleaning (2 Suits) + Wash & Iron (5 KG)',
    amount: '₹650',
    type: 'Piece & KG',
    status: 'Pending',
    pickupTime: 'Today, 05:00 PM',
    deliveryBoy: null,
  },
  {
    id: 'ORD-502',
    customer: 'Pooja Verma',
    phone: '+91 98123 45678',
    service: 'Steam Press (10 Shirts)',
    amount: '₹300',
    type: 'Piece Wise',
    status: 'Accepted',
    pickupTime: 'Today, 06:30 PM',
    deliveryBoy: 'Ravi Kumar (Delivery Boy)',
  },
  {
    id: 'ORD-503',
    customer: 'Suresh Patel',
    phone: '+91 99887 76655',
    service: 'Blanket Heavy Wash',
    amount: '₹450',
    type: 'Special Charge',
    status: 'Ready For Delivery',
    pickupTime: 'Yesterday',
    deliveryBoy: 'Ravi Kumar',
  },
  {
    id: 'ORD-504',
    customer: 'Neha Gupta',
    phone: '+91 97766 55443',
    service: 'Premium Wash & Fold',
    amount: '₹520',
    type: 'KG Wise',
    status: 'Completed',
    pickupTime: '2 days ago',
    deliveryBoy: 'Vikas Singh',
  },
];

import { partnerService } from '../../services/partnerService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const CANCEL_REASONS = [
  '⚠️ Machine Failure / Technical Issue',
  '❌ Store Capacity Full / Overloaded',
  '🚫 Item Cannot Be Processed / Damaged Fabric Risk',
  '📍 Delivery Location Out of Service Area',
  '⏰ Urgent Processing Not Possible in Time',
  '✍️ Other Reason',
];

export const OrderManagementScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { currentShop, currentUser } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState(route.params?.filter || 'All');

  useEffect(() => {
    if (route.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route.params?.filter]);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusDropdownModal, setShowStatusDropdownModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Get current shop ID from auth context or profile API
      const shopId = currentShop?.id || currentUser?.shop_id;
      const profileData = shopId ? null : await partnerService.getOwnerProfile();
      const resolvedShopId = shopId || profileData?.shop?.id || profileData?.id;

      // Load real delivery boys for this shop only
      const boysData = await partnerService.getOwnerDeliveryBoys(resolvedShopId);
      if (Array.isArray(boysData) && boysData.length > 0) {
        setDeliveryBoys(boysData.map((b: any) => ({
          id: b.id ?? b.raw_id,
          name: b.name ?? b.user?.name ?? 'Delivery Boy',
          phone: b.phone ?? b.user?.phone ?? '',
          vehicle: b.vehicle_number ?? b.vehicle ?? '',
          status: b.is_online ? 'Online' : 'Offline',
        })));
      }

      // Load real orders for this shop only (no dummy data)
      const apiOrders = await partnerService.getOwnerOrders(undefined, resolvedShopId);
      if (Array.isArray(apiOrders)) {
        const mappedApiOrders = apiOrders.map((ao: any) => {
          let mappedStatus = 'Placed';
          const rawSt = String(ao.status || 'PLACED').toLowerCase().replace(/[\s_-]+/g, '');
          if (rawSt === 'placed') mappedStatus = 'Placed';
          else if (rawSt === 'received' || rawSt === 'pending') mappedStatus = 'Received';
          else if (['inprocess', 'process', 'processing', 'accepted', 'washing'].includes(rawSt)) mappedStatus = 'In-Process';
          else if (rawSt === 'readyfordelivery' || rawSt === 'ready') {
            mappedStatus = (ao.customer_available || ao.is_customer_available) ? 'Customer Confirmed' : 'Ready for Delivery';
          }
          else if (rawSt === 'customerconfirmed') mappedStatus = 'Customer Confirmed';
          else if (rawSt === 'deliveryassigned') mappedStatus = 'Delivery Assigned';
          else if (rawSt === 'outfordelivery') mappedStatus = 'Out for Delivery';
          else if (['delivered', 'completed'].includes(rawSt)) mappedStatus = 'Delivered';
          else if (rawSt === 'cancelled') mappedStatus = 'Cancelled';
          else mappedStatus = 'Placed';

          const itemsStr = Array.isArray(ao.items) && ao.items.length > 0
            ? ao.items.map((it: any) => `${it.item_name || it.service_name || 'Item'} (${it.quantity || 1})`).join(', ')
            : 'Laundry Service';

          return {
            id: ao.order_number || `ORD-${ao.id}`,
            numericId: ao.id,
            customer: ao.customer?.name || ao.customer_name || 'Customer',
            phone: ao.customer?.phone || ao.customer_phone || 'N/A',
            address: ao.pickup_address || ao.delivery_address || 'Pune',
            service: itemsStr,
            amount: `₹${ao.total_amount || 0}`,
            type: 'Home Delivery',
            status: mappedStatus,
            rawStatus: ao.status,
            customerAvailable: Boolean(ao.customer_available || ao.is_customer_available || mappedStatus === 'Customer Confirmed'),
            paymentStatus: String(ao.payment_status || '').toUpperCase() === 'PAID' ? 'Paid' : 'Unpaid',
            paymentMethod: ao.payment_method ? String(ao.payment_method).toUpperCase() : 'COD',
            pickupTime: ao.pickup_date || ao.created_at?.slice(0, 10) || 'Today',
            deliveryBoy: ao.delivery_partner?.name || ao.deliveryPartner?.name || null,
            createdAt: ao.created_at || new Date().toISOString(),
            isUrgent: Boolean(ao.is_urgent || ao.is_emergency),
          };
        });
        setOrders(mappedApiOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.log('OrderManagementScreen loadData error:', err);
      setOrders([]);
    }
  }, [currentShop, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getFilterCount = (filterName: string) => {
    if (filterName === 'All') return orders.length;
    if (filterName === 'Placed') return orders.filter((o) => o.status === 'Placed').length;
    if (filterName === 'Received') return orders.filter((o) => o.status === 'Received' || o.status === 'Pending').length;
    if (filterName === 'In-Process') return orders.filter((o) => o.status === 'In-Process' || o.status === 'Accepted').length;
    if (filterName === 'Ready') return orders.filter((o) => o.status === 'Ready' || o.status === 'Ready for Delivery' || o.status === 'Customer Confirmed').length;
    if (filterName === 'Out for Delivery') return orders.filter((o) => o.status === 'Out for Delivery' || o.status === 'Delivery Assigned').length;
    if (filterName === 'Delivered') return orders.filter((o) => o.status === 'Delivered' || o.status === 'Completed').length;
    if (filterName === 'Cancelled') return orders.filter((o) => o.status === 'Cancelled').length;
    return 0;
  };

  const getStatusIndex = (st?: string) => {
    if (!st) return 0;
    const norm = String(st).toLowerCase().replace(/[\s_-]+/g, '');
    if (norm === 'placed') return 0;
    if (norm === 'received' || norm === 'pending') return 1;
    if (norm === 'inprocess' || norm === 'process' || norm === 'processing' || norm === 'accepted') return 2;
    if (norm === 'readyfordelivery' || norm === 'ready' || norm === 'customerconfirmed') return 3;
    if (norm === 'outfordelivery' || norm === 'deliveryassigned') return 4;
    if (norm === 'delivered' || norm === 'completed') return 5;
    if (norm === 'cancelled') return 6;
    return 0;
  };

  const isStatusDisabled = (currentStatus: string, targetStatus: string) => {
    const currentIndex = getStatusIndex(currentStatus);
    const targetIndex = getStatusIndex(targetStatus);

    if (currentStatus === 'Delivered' || currentStatus === 'Cancelled') {
      return currentStatus !== targetStatus;
    }

    if (targetStatus === 'Cancelled') {
      return false;
    }

    return targetIndex < currentIndex;
  };

  const filteredOrders = orders
    .filter((o) => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Placed') return o.status === 'Placed';
      if (selectedFilter === 'Received') return o.status === 'Received' || o.status === 'Pending';
      if (selectedFilter === 'In-Process') return o.status === 'In-Process' || o.status === 'Accepted';
      if (selectedFilter === 'Ready') return o.status === 'Ready' || o.status === 'Ready for Delivery' || o.status === 'Customer Confirmed';
      if (selectedFilter === 'Out for Delivery') return o.status === 'Out for Delivery' || o.status === 'Delivery Assigned';
      if (selectedFilter === 'Delivered') return o.status === 'Delivered' || o.status === 'Completed';
      if (selectedFilter === 'Cancelled') return o.status === 'Cancelled';
      return o.status === selectedFilter;
    })
    .sort((a, b) => {
      // 1. Urgent priority first (Urgent orders appear at the very top)
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;

      // 2. Date priority (Latest created first)
      const timeA = new Date(a.createdAt || '').getTime() || 0;
      const timeB = new Date(b.createdAt || '').getTime() || 0;
      return timeB - timeA;
    });

  const handleQuickPaymentUpdate = (orderId: string, newPaymentStatus: 'Paid' | 'Unpaid' | 'Partial') => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const tot = parseFloat(o.amount.replace(/[^0-9.]/g, '')) || 0;
          return {
            ...o,
            paymentStatus: newPaymentStatus,
            paidAmount: newPaymentStatus === 'Paid' ? tot : 0,
            remainingAmount: newPaymentStatus === 'Paid' ? 0 : tot,
          };
        }
        return o;
      })
    );
    setShowPaymentModal(false);
    Alert.alert('Payment Updated 💳', `Order ${orderId} payment status set to ${newPaymentStatus}`);
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);

    // 1. Require Delivery Boy Assignment before transitioning to 'Out For Delivery' or 'Completed'
    if (
      (newStatus === 'Out For Delivery' || newStatus === 'Completed') &&
      (!targetOrder?.deliveryBoy || targetOrder.deliveryBoy === 'Unassigned')
    ) {
      Alert.alert(
        'Delivery Boy Required 🛵',
        `Order ${orderId} cannot be dispatched or completed without assigning a delivery partner. Please assign a delivery boy first in "Ready for Delivery" status.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Assign Delivery Boy',
            onPress: () => {
              if (targetOrder) {
                setSelectedOrder(targetOrder);
                setShowAssignModal(true);
              }
            },
          },
        ]
      );
      return;
    }

    // 2. Prevent Completed Status if Payment is Unpaid or Outstanding!
    if (
      newStatus === 'Completed' &&
      targetOrder?.paymentStatus !== 'Paid' &&
      targetOrder?.remainingAmount > 0
    ) {
      Alert.alert(
        'Payment Outstanding 💳',
        `Order ${orderId} cannot be marked as Completed because payment status is "${targetOrder?.paymentStatus}" (Remaining Balance: ₹${targetOrder?.remainingAmount || targetOrder?.amount}). Please collect payment first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Paid & Complete ✅',
            onPress: () => {
              handleQuickPaymentUpdate(orderId, 'Paid');
              mockDataStore.updateOrderStatus(orderId, 'Completed', 'Payment collected & marked completed');
              Alert.alert('Success 🎉', `Order ${orderId} payment collected and marked as Completed!`);
            },
          },
        ]
      );
      return;
    }

    // 3. Prompt for cancellation reason if cancelling order
    if (newStatus === 'Cancelled') {
      setSelectedOrder(targetOrder);
      setSelectedCancelReason(CANCEL_REASONS[0]);
      setCustomReasonText('');
      setShowCancelReasonModal(true);
      return;
    }

    const apiStatusMap: { [key: string]: string } = {
      Placed: 'placed',
      Received: 'received',
      'In-Process': 'in_process',
      'Ready for Delivery': 'ready_for_delivery',
      'Customer Confirmed': 'customer_confirmed',
      'Delivery Assigned': 'delivery_assigned',
      'Out for Delivery': 'out_for_delivery',
      Delivered: 'delivered',
      Completed: 'delivered',
      Cancelled: 'cancelled',
    };
    if (targetOrder?.numericId) {
      partnerService.updateOrderStatus(targetOrder.numericId, apiStatusMap[newStatus] || newStatus);
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    Alert.alert('Status Updated 📈', `Order ${orderId} status changed to ${newStatus}`);
  };

  const handleAssignDeliveryBoy = async (boy: any) => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.numericId;
    const deliveryBoyId = boy.id;
    const boyName = boy.name;

    if (orderId && deliveryBoyId) {
      try {
        await apiClient.post(`/owner/orders/${orderId}/assign-delivery`, {
          delivery_boy_id: deliveryBoyId,
          assignment_type: 'delivery',
        });
      } catch (err) {
        console.log('Assign delivery error:', err);
      }
    }

    mockDataStore.assignDeliveryBoy(selectedOrder.id, boyName);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id ? { ...o, deliveryBoy: boyName, status: 'Out for Delivery' } : o
      )
    );
    setShowAssignModal(false);
    Alert.alert('Assigned 🛵', `${boyName} assigned to Order ${selectedOrder.id}.\nOrder is now marked 'Out for Delivery' and dispatched to rider!`);
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order Management</Text>
        </View>

        {/* Status Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {['All', 'Placed', 'Received', 'In-Process', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'].map(
            (filter) => {
              const count = getFilterCount(filter);
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterTxt,
                      selectedFilter === filter && styles.filterTxtActive,
                    ]}
                  >
                    {filter} ({count})
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 16, color: COLORS.textSecondary }}>
                No orders found in "{selectedFilter}" category.
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <AppCard key={order.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    {order.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentTxt}>⚡ URGENT</Text>
                      </View>
                    )}
                  </View>

                  {(() => {
                    const statusMeta = getOrderStatusMeta(order.status);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.statusDropdownBtn,
                          { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                        ]}
                        onPress={() => {
                          setSelectedOrder(order);
                          setShowStatusDropdownModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.statusDropdownTxt, { color: statusMeta.text }]} numberOfLines={1}>
                          {statusMeta.label}
                        </Text>
                        <Text style={[styles.statusDropdownChevron, { color: statusMeta.text }]}>▼</Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>

                <View style={styles.customerRow}>
                  <Text style={styles.customerName}>{order.customer}</Text>
                </View>

                {order.address ? (
                  <Text style={styles.compactAddressTxt} numberOfLines={1} ellipsizeMode="tail">
                    📍 {order.address}
                  </Text>
                ) : null}
                <Text style={styles.compactServiceTxt} numberOfLines={1} ellipsizeMode="tail">
                  🧺 {order.service}
                </Text>

                <View style={styles.metaRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.amountTxt}>{order.amount}</Text>
                    {(() => {
                      const payMeta = getPaymentStatusMeta(order.paymentStatus);
                      return (
                        <TouchableOpacity
                          style={[
                            styles.paymentDropdownBtn,
                            { backgroundColor: payMeta.bg, borderColor: payMeta.border },
                          ]}
                          onPress={() => {
                            setSelectedOrder(order);
                            setShowPaymentModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.paymentDropdownTxt, { color: payMeta.text }]} numberOfLines={1}>
                            {payMeta.label}
                          </Text>
                          <Text style={[styles.paymentDropdownChevron, { color: payMeta.text }]}>▼</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>

                  <Text style={styles.compactDeliveryTxt}>
                    🛵 {order.deliveryBoy || 'Unassigned'}
                  </Text>
                </View>

                {/* Availability & Assignment Status Banners */}
                {order.status === 'Ready for Delivery' && (
                  <View style={styles.availabilityPromptBadge}>
                    <Text style={styles.availabilityPromptTxt}>
                      ⏳ Asked Customer: "Are you available for delivery?" (Pending response)
                    </Text>
                  </View>
                )}
                {order.status === 'Customer Confirmed' && (
                  <View style={styles.availabilityConfirmedBadge}>
                    <Text style={styles.availabilityConfirmedTxt}>
                      ✅ Customer Confirmed Availability! Ready for delivery boy assignment.
                    </Text>
                  </View>
                )}
                {order.status === 'Delivery Assigned' && (
                  <View style={styles.deliveryAssignedBadge}>
                    <Text style={styles.deliveryAssignedTxt}>
                      🛵 Rider Assigned: {order.deliveryBoy || 'Delivery Partner'}
                    </Text>
                  </View>
                )}
                {order.status === 'Out for Delivery' && (
                  <View style={styles.deliveryAssignedBadge}>
                    <Text style={styles.deliveryAssignedTxt}>
                      🛵 Out for Delivery with {order.deliveryBoy || 'Rider'}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={styles.viewDetailsFullBtn}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, orderObj: order })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDetailsFullTxt}>📄 View Details & Receipt</Text>
                  </TouchableOpacity>
                </View>
              </AppCard>
            ))
          )}
        </ScrollView>

        {/* Assign Delivery Boy Modal */}
        <Modal visible={showAssignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Delivery Boy</Text>
              <Text style={styles.modalSub}>Select an active delivery boy for {selectedOrder?.id}</Text>

              {deliveryBoys.length === 0 ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary }}>
                    No delivery boys found for your shop. Add one from the Delivery Boys section.
                  </Text>
                </View>
              ) : deliveryBoys.map((boy) => (
                <TouchableOpacity
                  key={boy.id}
                  style={styles.boyItem}
                  onPress={() => handleAssignDeliveryBoy(boy)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boyName}>🛵 {boy.name}</Text>
                    {boy.phone ? (
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                        📞 {boy.phone} {boy.vehicle ? `• 🚚 ${boy.vehicle}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: boy.status === 'Online' ? COLORS.success : COLORS.textLight },
                    ]}
                  />
                </TouchableOpacity>
              ))}

              <AppButton
                title="Cancel"
                onPress={() => setShowAssignModal(false)}
                style={styles.cancelBtn}
              />
            </View>
          </View>
        </Modal>

        {/* Status Picker Dropdown Modal - Centered Beautiful Card with Flow Steps */}
        <Modal visible={showStatusDropdownModal} transparent animationType="fade">
          <View style={styles.compactModalOverlay}>
            <View style={styles.compactModalContent}>
              {/* Header with Title and Order Badge */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Text style={styles.compactModalTitle}>Change Order Status</Text>
                    {selectedOrder?.id && (
                      <View style={styles.orderPill}>
                        <Text style={styles.orderPillTxt}>#{selectedOrder.id}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.compactModalSub}>Select new status for this order:</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowStatusDropdownModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Status Steps List */}
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8, paddingVertical: 4 }}>
                  {[
                    { icon: '📦', title: 'Placed', desc: 'Order booked by customer', status: 'Placed', meta: getOrderStatusMeta('Placed') },
                    { icon: '📥', title: 'Received', desc: 'Order accepted by laundry', status: 'Received', meta: getOrderStatusMeta('Received') },
                    { icon: '🔄', title: 'In-Process', desc: 'Washing, drying & pressing', status: 'In-Process', meta: getOrderStatusMeta('In-Process') },
                    { icon: '✨', title: 'Ready', desc: 'Ready for delivery pickup', status: 'Ready', meta: getOrderStatusMeta('Ready') },
                    { icon: '🛵', title: 'Out for Delivery', desc: 'Dispatched with delivery rider', status: 'Out for Delivery', meta: getOrderStatusMeta('Out for Delivery') },
                    { icon: '🎉', title: 'Delivered', desc: 'Order completed & delivered', status: 'Delivered', meta: getOrderStatusMeta('Delivered') },
                    { icon: '❌', title: 'Cancelled', desc: 'Order cancelled', status: 'Cancelled', meta: getOrderStatusMeta('Cancelled') },
                  ].map((item) => {
                    const isActive = selectedOrder?.status === item.status;
                    const disabled = selectedOrder ? isStatusDisabled(selectedOrder.status, item.status) : false;

                    return (
                      <TouchableOpacity
                        key={item.status}
                        disabled={disabled}
                        style={[
                          styles.statusRowCard,
                          isActive && {
                            backgroundColor: item.meta.bg,
                            borderColor: item.meta.border,
                            borderWidth: 1.5,
                          },
                          disabled && styles.statusRowDisabled,
                        ]}
                        onPress={() => {
                          if (selectedOrder && !disabled) {
                            if (item.status === 'Out for Delivery' && (!selectedOrder.deliveryBoy || selectedOrder.deliveryBoy === 'Unassigned' || selectedOrder.deliveryBoy.trim() === '')) {
                              setShowStatusDropdownModal(false);
                              setTimeout(() => setShowAssignModal(true), 350);
                              return;
                            }
                            handleUpdateStatus(selectedOrder.id, item.status);
                          }
                          setShowStatusDropdownModal(false);
                        }}
                        activeOpacity={0.75}
                      >
                        {/* Left Icon Avatar */}
                        <View
                          style={[
                            styles.statusIconBox,
                            { backgroundColor: isActive ? item.meta.border + '35' : (disabled ? '#EAE8F2' : '#F1EFFF') },
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                        </View>

                        {/* Middle Text: Title + Description */}
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text
                            style={[
                              styles.statusTitleTxt,
                              isActive && { color: item.meta.text, fontFamily: FONTS.bold },
                              disabled && { color: COLORS.textLight },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.statusDescTxt,
                              disabled && { color: COLORS.textLight + '99' },
                            ]}
                            numberOfLines={1}
                          >
                            {item.desc}
                          </Text>
                        </View>

                        {/* Right State Indicator */}
                        {isActive ? (
                          <View style={[styles.activeBadge, { backgroundColor: item.meta.text }]}>
                            <Text style={styles.activeBadgeTxt}>✓ Active</Text>
                          </View>
                        ) : disabled ? (
                          <View style={styles.passedBadge}>
                            <Text style={styles.passedBadgeTxt}>🔒 Passed</Text>
                          </View>
                        ) : (
                          <View style={styles.actionArrowBox}>
                            <Text style={styles.actionArrowTxt}>➔</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeCompactBtn}
                onPress={() => setShowStatusDropdownModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeCompactTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Payment Status Dropdown Modal */}
        <Modal visible={showPaymentModal} transparent animationType="fade">
          <View style={styles.compactModalOverlay}>
            <View style={styles.compactModalContent}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Text style={styles.compactModalTitle}>Update Payment</Text>
                    {selectedOrder?.id && (
                      <View style={styles.orderPill}>
                        <Text style={styles.orderPillTxt}>#{selectedOrder.id}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.compactModalSub}>
                    Customer: {selectedOrder?.customer || 'Customer'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowPaymentModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginVertical: 12 }}>
                {[
                  { icon: '💳', title: 'Paid', desc: 'Full payment collected', value: 'Paid' as const, bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
                  { icon: '⏳', title: 'Unpaid', desc: 'Payment pending from customer', value: 'Unpaid' as const, bg: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
                  { icon: '🌗', title: 'Partial', desc: 'Partially settled amount', value: 'Partial' as const, bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' },
                ].map((item) => {
                  const isActive = selectedOrder?.paymentStatus === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.statusRowCard,
                        isActive && { backgroundColor: item.bg, borderColor: item.border, borderWidth: 1.5 },
                      ]}
                      onPress={() => {
                        if (selectedOrder) {
                          handleQuickPaymentUpdate(selectedOrder.id, item.value);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.statusIconBox, { backgroundColor: isActive ? item.border + '40' : '#F1EFFF' }]}>
                        <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={[styles.statusTitleTxt, isActive && { color: item.text, fontFamily: FONTS.bold }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.statusDescTxt}>{item.desc}</Text>
                      </View>
                      {isActive ? (
                        <View style={[styles.activeBadge, { backgroundColor: item.text }]}>
                          <Text style={styles.activeBadgeTxt}>✓ Active</Text>
                        </View>
                      ) : (
                        <View style={styles.actionArrowBox}>
                          <Text style={styles.actionArrowTxt}>➔</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.closeCompactBtn}
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeCompactTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cancellation Reason Prompt Modal */}
        <Modal visible={showCancelReasonModal} transparent animationType="fade">
          <View style={styles.compactModalOverlay}>
            <View style={[styles.compactModalContent, { maxWidth: 420 }]}>
              <Text style={[styles.compactModalTitle, { color: '#DC2626' }]}>❌ Cancel Order</Text>
              <Text style={styles.compactModalSub}>
                Please select the reason for cancelling order {selectedOrder?.id}. This reason will be sent directly to the customer.
              </Text>

              <View style={{ marginVertical: 12, gap: 8 }}>
                {CANCEL_REASONS.map((reason) => {
                  const isSelected = selectedCancelReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setSelectedCancelReason(reason)}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#DC2626' : COLORS.border,
                        backgroundColor: isSelected ? '#FEF2F2' : COLORS.card,
                      }}
                    >
                      <Text style={{ fontFamily: isSelected ? FONTS.bold : FONTS.medium, fontSize: 13, color: isSelected ? '#DC2626' : COLORS.text }}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedCancelReason === '✍️ Other Reason' && (
                <TextInput
                  placeholder="Type custom cancellation reason here..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={customReasonText}
                  onChangeText={setCustomReasonText}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13,
                    color: COLORS.text,
                    minHeight: 60,
                    marginTop: 6,
                    textAlignVertical: 'top',
                  }}
                />
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowCancelReasonModal(false)}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const finalReason = selectedCancelReason === '✍️ Other Reason'
                      ? (customReasonText.trim() || 'Cancelled by laundry shop owner')
                      : selectedCancelReason;
                    if (selectedOrder) {
                      if (selectedOrder.numericId) {
                        partnerService.updateOrderStatus(selectedOrder.numericId, 'cancelled', undefined, finalReason);
                      }
                      mockDataStore.updateOrderStatus(selectedOrder.id, 'Cancelled', finalReason, finalReason);
                      setOrders(prev => prev.map(o => (o.id === selectedOrder.id ? { ...o, status: 'Cancelled', cancellation_reason: finalReason } : o)));
                      Alert.alert('Order Cancelled ❌', `Order ${selectedOrder.id} cancelled.\nReason sent to customer: "${finalReason}"`);
                    }
                    setShowCancelReasonModal(false);
                  }}
                  style={{ flex: 1.2, paddingVertical: 11, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' }}>Confirm & Notify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create
  ({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: COLORS.card,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerTitle: {
      fontFamily: FONTS.bold,
      fontSize: 20,
      color: COLORS.primary,
    },
    addOrderBtn: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: SIZES.radius_sm,
    },
    addOrderTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.white,
    },
    fabBtn: {
      position: 'absolute',
      bottom: 85,
      right: 20,
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 12,
      borderRadius: SIZES.radius_full,
      elevation: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 999,
    },
    fabPlus: {
      color: COLORS.white,
      fontFamily: FONTS.bold,
      fontSize: 22,
      marginRight: 6,
    },
    fabTxt: {
      fontFamily: FONTS.bold,
      fontSize: 14,
      color: COLORS.white,
    },
    filterScroll: {
      backgroundColor: COLORS.card,
      maxHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    filterScrollContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: 8,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: 8,
      borderRadius: SIZES.radius_full,
      backgroundColor: COLORS.background,
      marginRight: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterTxt: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    filterTxtActive: {
      color: COLORS.white,
      fontFamily: FONTS.bold,
    },
    container: {
      padding: SPACING.lg,
      paddingBottom: 140,
    },
    orderCard: {
      marginBottom: SPACING.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    orderId: {
      fontFamily: FONTS.bold,
      fontSize: 16,
      color: COLORS.primary,
    },
    urgentBadge: {
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: SIZES.radius_sm,
      borderWidth: 1,
      borderColor: '#FECACA',
    },
    urgentTxt: {
      fontFamily: FONTS.bold,
      fontSize: 11,
      color: COLORS.error,
    },
    statusDropdownBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4.5,
      borderRadius: 20,
      borderWidth: 1.2,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    statusDropdownTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
    },
    statusDropdownChevron: {
      fontSize: 9,
      fontFamily: FONTS.bold,
      marginLeft: 4,
    },
    paymentDropdownBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 16,
      borderWidth: 1.2,
    },
    paymentDropdownTxt: {
      fontFamily: FONTS.bold,
      fontSize: 11.5,
    },
    paymentDropdownChevron: {
      fontSize: 8,
      fontFamily: FONTS.bold,
      marginLeft: 3,
    },
    statusBadge: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 4,
      borderRadius: SIZES.radius_full,
    },
    bgWarning: { backgroundColor: COLORS.warning + '25' },
    bgSuccess: { backgroundColor: COLORS.success + '25' },
    bgPrimary: { backgroundColor: COLORS.primaryLight },
    statusTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.text,
    },
    customerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    customerName: {
      fontFamily: FONTS.bold,
      fontSize: 16,
      color: COLORS.text,
    },
    phoneTxt: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    compactAddressTxt: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: 4,
    },
    compactServiceTxt: {
      fontFamily: FONTS.medium,
      fontSize: 13.5,
      color: COLORS.text,
      marginBottom: 8,
    },
    compactDeliveryTxt: {
      fontFamily: FONTS.medium,
      fontSize: 12.5,
      color: COLORS.textSecondary,
    },
    serviceTxt: {
      fontFamily: FONTS.medium,
      fontSize: 14,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    typeTxt: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    amountTxt: {
      fontFamily: FONTS.bold,
      fontSize: 18,
      color: COLORS.primary,
    },
    assignedTxt: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: SPACING.md,
    },
    expandedContentBox: {
      backgroundColor: '#F8FAFC',
      borderRadius: SIZES.radius_sm,
      padding: SPACING.sm + 2,
      marginTop: 6,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    expandedField: {
      marginBottom: 6,
    },
    expandedLabel: {
      fontFamily: FONTS.bold,
      fontSize: 11.5,
      color: COLORS.textSecondary,
      marginBottom: 2,
    },
    expandedVal: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.text,
    },
    expandToggleBtn: {
      height: 38,
      paddingHorizontal: 10,
      borderRadius: SIZES.radius_sm,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#CBD5E1',
    },
    expandToggleTxt: {
      fontFamily: FONTS.bold,
      fontSize: 11.5,
      color: COLORS.primary,
    },
    availabilityPromptBadge: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FCD34D',
      borderRadius: SIZES.radius_sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      marginTop: 6,
      marginBottom: 4,
    },
    availabilityPromptTxt: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: '#B45309',
    },
    availabilityConfirmedBadge: {
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
      borderRadius: SIZES.radius_sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      marginTop: 6,
      marginBottom: 4,
    },
    availabilityConfirmedTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: '#047857',
    },
    deliveryAssignedBadge: {
      backgroundColor: '#EFF6FF',
      borderWidth: 1,
      borderColor: '#BFDBFE',
      borderRadius: SIZES.radius_sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      marginTop: 6,
      marginBottom: 4,
    },
    deliveryAssignedTxt: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: '#1D4ED8',
    },
    primaryActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: SIZES.radius_sm,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    primaryActionTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.white,
      textAlign: 'center',
    },
    actionGrid: {
      marginTop: SPACING.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
    },
    assignDeliveryBtn: {
      flex: 1,
      height: 40,
      backgroundColor: '#F59E0B',
      borderRadius: SIZES.radius_sm,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      elevation: 2,
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    assignDeliveryTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.white,
      textAlign: 'center',
    },
    viewDetailsSecondaryBtn: {
      flex: 1,
      height: 40,
      backgroundColor: COLORS.primaryLight,
      borderRadius: SIZES.radius_sm,
      borderWidth: 1,
      borderColor: COLORS.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    viewDetailsSecondaryTxt: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.primaryDark,
      textAlign: 'center',
    },
    viewDetailsFullBtn: {
      flex: 1,
      width: '100%',
      height: 40,
      backgroundColor: COLORS.primaryLight,
      borderRadius: SIZES.radius_sm,
      borderWidth: 1,
      borderColor: COLORS.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    viewDetailsFullTxt: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      color: COLORS.primaryDark,
      textAlign: 'center',
    },
    statusControlBox: {
      backgroundColor: COLORS.background,
      padding: SPACING.md,
      borderRadius: SIZES.radius_md,
      marginVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    controlLabel: {
      fontFamily: FONTS.bold,
      fontSize: 12,
      color: COLORS.textSecondary,
      marginBottom: 4,
    },
    statusChipBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: SIZES.radius_full,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginRight: 6,
    },
    statusChipBtnActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    statusChipTxt: {
      fontFamily: FONTS.medium,
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    statusChipTxtActive: {
      fontFamily: FONTS.bold,
      color: COLORS.white,
    },
    dropdownSelectBtn: {
      backgroundColor: COLORS.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: SIZES.radius_sm,
      borderWidth: 1,
      borderColor: COLORS.primary,
      alignItems: 'center',
      marginTop: 6,
    },
    dropdownSelectTxt: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      color: COLORS.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: SIZES.radius_lg,
      borderTopRightRadius: SIZES.radius_lg,
      padding: SPACING.xl,
    },
    modalTitle: {
      fontFamily: FONTS.bold,
      fontSize: 20,
      color: COLORS.text,
    },
    modalSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      marginBottom: SPACING.lg,
    },
    boyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      backgroundColor: COLORS.background,
      borderRadius: SIZES.radius_md,
      marginBottom: SPACING.sm,
    },
    boyName: {
      fontFamily: FONTS.bold,
      fontSize: 16,
      color: COLORS.text,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    cancelBtn: {
      marginTop: SPACING.md,
      backgroundColor: COLORS.textSecondary,
    },
    compactModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 12, 35, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.md,
    },
    compactModalContent: {
      width: '92%',
      maxWidth: 400,
      backgroundColor: COLORS.card,
      borderRadius: 20,
      padding: SPACING.lg,
      elevation: 12,
      shadowColor: '#1F0B66',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 16,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    compactModalTitle: {
      fontFamily: FONTS.bold,
      fontSize: 17,
      color: COLORS.text,
    },
    orderPill: {
      backgroundColor: (COLORS.primaryLight || '#D7D9FC') + '40',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: COLORS.primaryLight || '#CECCFC',
    },
    orderPillTxt: {
      fontFamily: FONTS.bold,
      color: COLORS.primary,
      fontSize: 12,
    },
    compactModalSub: {
      fontFamily: FONTS.regular,
      fontSize: 12.5,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#F1EFF8',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    modalCloseTxt: {
      fontSize: 13,
      color: COLORS.textSecondary,
      fontWeight: 'bold',
    },
    statusRowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statusRowDisabled: {
      opacity: 0.5,
      backgroundColor: '#FAF9FE',
      borderColor: '#EFEBF8',
    },
    statusIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    statusTitleTxt: {
      fontFamily: FONTS.bold,
      fontSize: 13.5,
      color: COLORS.text,
    },
    statusDescTxt: {
      fontFamily: FONTS.regular,
      fontSize: 11,
      color: COLORS.textSecondary,
      marginTop: 1,
    },
    activeBadge: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    activeBadgeTxt: {
      color: '#FFFFFF',
      fontFamily: FONTS.bold,
      fontSize: 10.5,
    },
    passedBadge: {
      backgroundColor: '#ECEAF4',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    passedBadgeTxt: {
      color: COLORS.textLight,
      fontSize: 10.5,
      fontFamily: FONTS.medium,
    },
    actionArrowBox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: COLORS.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    actionArrowTxt: {
      fontSize: 11,
      color: COLORS.primaryDark,
      fontFamily: FONTS.bold,
    },
    closeCompactBtn: {
      marginTop: 12,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: '#F3F1FA',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    closeCompactTxt: {
      fontFamily: FONTS.bold,
      fontSize: 13.5,
      color: COLORS.textSecondary,
    },
    mobileContactBar: {
      marginTop: SPACING.xs,
      backgroundColor: COLORS.primaryLight || '#F3F0FF',
      borderRadius: SIZES.radius_sm,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: (COLORS.primary || '#6C5CE7') + '25',
    },
    mobileContactTxt: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.primaryDark,
    },
    mobileContactNum: {
      fontFamily: FONTS.bold,
      color: COLORS.primaryDark,
      fontSize: 14,
    },
  }); 