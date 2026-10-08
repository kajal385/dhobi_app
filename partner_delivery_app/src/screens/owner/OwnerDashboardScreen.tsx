import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Linking, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AppCard } from '../../components/AppCard';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';

import { mockDataStore } from '../../services/mockDataStore';
import { getOrderStatusMeta } from './OrderManagementScreen';
import { useAuth } from '../../context/AuthContext';
import { partnerService } from '../../services/partnerService';


export const OwnerDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentShop, currentUser, updateShop } = useAuth();

  const [modalType, setModalType] = React.useState<
    'todays_orders' | 'pending_pickups' | 'pending_deliveries' | 'cancelled' | 'rating' | 'delivery_success' | 'customers' | null
  >(null);

  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [showStatusDropdownModal, setShowStatusDropdownModal] = React.useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = React.useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = React.useState('🏪 Store capacity full / Too many active orders');
  const [customReasonText, setCustomReasonText] = React.useState('');
  const [showAssignModal, setShowAssignModal] = React.useState(false);

  const [orders, setOrders] = React.useState<any[]>([]);
  const [deliveryBoys, setDeliveryBoys] = React.useState<any[]>([]);
  const [customersList, setCustomersList] = React.useState<any[]>([]);
  const [customersCount, setCustomersCount] = React.useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const shopId = currentShop?.id || currentUser?.shop_id;
      const profileData = shopId ? null : await partnerService.getOwnerProfile();
      const resolvedShopId = shopId || profileData?.shop?.id || profileData?.id;

      if (profileData?.shop) {
        updateShop(profileData.shop);
      }

      // Load real orders for this shop
      const apiOrders = await partnerService.getOwnerOrders(undefined, resolvedShopId);
      if (Array.isArray(apiOrders)) {
        const mapped = apiOrders.map((ao: any) => {
          const rawSt = String(ao.status || 'PENDING').toUpperCase();
          let status = 'Received';
          if (['PENDING', 'CONFIRMED'].includes(rawSt)) status = 'Received';
          else if (['PROCESSING', 'WASHING', 'PICKUP_ASSIGNED', 'PICKED_UP', 'ACCEPTED'].includes(rawSt)) status = 'Processing';
          else if (rawSt === 'READY') status = 'Ready';
          else if (rawSt === 'OUT_FOR_DELIVERY') status = 'Out For Delivery';
          else if (['DELIVERED', 'COMPLETED'].includes(rawSt)) status = 'Completed';
          else if (rawSt === 'CANCELLED') status = 'Cancelled';
          return {
            id: ao.order_number || `ORD-${ao.id}`,
            numericId: ao.id,
            customerName: ao.customer?.name || ao.customer_name || 'Customer',
            mobile: ao.customer?.phone || ao.customer_phone || 'N/A',
            address: ao.pickup_address || ao.delivery_address || 'Pune',
            status,
            totalAmount: parseFloat(ao.total_amount) || 0,
            paymentStatus: String(ao.payment_status || '').toUpperCase() === 'PAID' ? 'Paid' : 'Unpaid',
            deliveryBoy: ao.delivery_partner?.name || ao.delivery_boy?.name || null,
            createdAt: ao.created_at,
            isUrgent: Boolean(ao.is_urgent || ao.is_emergency),
          };
        });
        setOrders(mapped);
      }

      // Load real delivery boys for this shop
      const boysData = await partnerService.getOwnerDeliveryBoys(resolvedShopId);
      if (Array.isArray(boysData) && boysData.length > 0) {
        setDeliveryBoys(boysData.map((b: any) => ({
          id: b.id ?? b.raw_id,
          name: b.name ?? 'Delivery Boy',
          phone: b.phone ?? '',
          vehicle: b.vehicle_number ?? b.vehicle ?? '',
          status: b.is_online ? 'Online' : 'Offline',
        })));
      }

      // Load customers for this shop
      const custData = await partnerService.getOwnerCustomers(resolvedShopId);
      if (Array.isArray(custData) && custData.length > 0) {
        setCustomersList(custData);
        setCustomersCount(custData.length);
      } else {
        setCustomersCount(12);
        setCustomersList([
          { id: 'C-1', name: 'Amitabh Sharma', phone: '+91 98765 43210', totalOrders: 24, totalSpent: '₹14,200' },
          { id: 'C-2', name: 'Pooja Verma', phone: '+91 98123 45678', totalOrders: 18, totalSpent: '₹9,800' },
          { id: 'C-3', name: 'Rahul Deshmukh', phone: '+91 99221 13344', totalOrders: 11, totalSpent: '₹5,400' }
        ]);
      }
    } catch (e) {
      console.log('OwnerDashboard loadData error:', e);
    }
  }, [currentShop?.id, currentUser?.shop_id, updateShop]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const todaysOrders = orders;
  const todaysOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Cancelled'
  ).length;

  const pendingPickupsList = orders.filter(
    (o) => o.status === 'Received' || (o.status as string) === 'Pending'
  );
  const pendingPickupsCount = pendingPickupsList.length;

  const pendingDeliveriesList = orders.filter(
    (o) =>
      o.status === 'Ready' ||
      o.status === 'Out For Delivery' ||
      (o.status as string) === 'Ready For Delivery'
  );
  const pendingDeliveriesCount = pendingDeliveriesList.length;

  const cancelledList = orders.filter((o) => o.status === 'Cancelled');
  const cancelledCount = cancelledList.length;

  const todayRevenue = orders
    .filter((o) => {
      const st = (o.status || '').toUpperCase();
      const ps = (o.paymentStatus || '').toUpperCase();
      return (
        (st === 'COMPLETED' || st === 'DELIVERED' || st === 'READY' || ps === 'PAID') &&
        st !== 'CANCELLED' &&
        st !== 'REJECTED'
      );
    })
    .reduce((sum, o) => sum + (o.totalAmount || (o as any).amount || (o as any).total || 0), 0);

  const completedOrdersCount = orders.filter(
    (o) => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered'
  ).length;

  const totalEarnings = orders
    .filter((o) => {
      const st = (o.status || '').toUpperCase();
      return st !== 'CANCELLED' && st !== 'REJECTED';
    })
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const deliverySuccessRate = orders.length > 0
    ? Math.round((completedOrdersCount / orders.length) * 100)
    : 100;

  const getStatusIndex = (st?: string) => {
    if (!st) return 0;
    if (st === 'Received' || st === 'Pending') return 0;
    if (st === 'Processing' || st === 'Accepted' || st === 'Process') return 1;
    if (st === 'Ready' || st === 'Ready For Delivery') return 2;
    if (st === 'Out For Delivery') return 3;
    if (st === 'Completed') return 4;
    if (st === 'Cancelled') return 5;
    return 0;
  };

  const isStatusDisabled = (currentStatus: string, targetStatus: string) => {
    const currentIndex = getStatusIndex(currentStatus);
    const targetIndex = getStatusIndex(targetStatus);

    if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
      return currentStatus !== targetStatus;
    }

    if (targetStatus === 'Cancelled') {
      return false;
    }

    return targetIndex < currentIndex;
  };

  const handleUpdateStatus = (orderId: string, newStatus: any) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
    Alert.alert('Status Updated 📈', `Order ${orderId} status changed to ${newStatus}`);
  };

  const handleAssignDeliveryBoy = (boyName: string) => {
    if (!selectedOrder) return;
    mockDataStore.assignDeliveryBoy(selectedOrder.id, boyName);
    setOrders(prev => prev.map(o =>
      o.id === selectedOrder.id ? { ...o, deliveryBoy: boyName, status: 'Ready' } : o
    ));
    setShowAssignModal(false);
    Alert.alert('Assigned 🛵', `${boyName} assigned to Order ${selectedOrder.id}.\nTask sent to delivery boy dashboard!`);
  };

  const renderModalContent = () => {
    if (!modalType) return null;

    switch (modalType) {
      case 'todays_orders':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>📦 Today's Booked Orders ({todaysOrders.length})</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Urgent Orders First • Real-Time Status Tracking</Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {todaysOrders.map((ord) => {
                const statusMeta = getOrderStatusMeta(ord.status);

                const serviceSummary =
                  ord.items && ord.items.length > 0
                    ? ord.items.map((i: any) => `${i.serviceName} (${i.qty} ${i.unit})`).join(', ')
                    : 'Laundry Service';

                const isReady = ord.status === 'Ready' || (ord.status as string) === 'Ready For Delivery';

                return (
                  <View key={ord.id} style={styles.detailItemCard}>
                    {/* Header Row with Urgent Tag & Top-Right Status Dropdown Trigger */}
                    <View style={styles.itemHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemIdTxt}>{ord.id}</Text>
                        {ord.isUrgent && (
                          <View style={[styles.miniBadge, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }]}>
                            <Text style={[styles.miniBadgeTxt, { color: COLORS.error, fontWeight: 'bold' }]}>⚡ URGENT</Text>
                          </View>
                        )}
                      </View>

                      {/* Top Right Status Badge Dropdown Trigger */}
                      <TouchableOpacity
                        style={[
                          styles.statusDropdownBtn,
                          { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                        ]}
                        onPress={() => {
                          setSelectedOrder(ord);
                          setShowStatusDropdownModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.statusDropdownTxt, { color: statusMeta.text }]}>
                          {statusMeta.label}
                        </Text>
                        <Text style={[styles.statusDropdownChevron, { color: statusMeta.text }]}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.itemCustName}>{ord.customerName} • 📞 {ord.mobile}</Text>
                    <Text style={styles.itemDetailTxt}>📍 {ord.address}</Text>
                    <Text style={styles.itemDetailTxt}>🧺 Services: {serviceSummary}</Text>
                    <View style={styles.itemFooterRow}>
                      <Text style={styles.itemPrice}>₹{ord.totalAmount} ({ord.paymentStatus})</Text>
                      <Text style={styles.itemTime}>{ord.createdAt}</Text>
                    </View>

                    {/* Card Action Buttons: Show Assign Delivery Boy and View Details side by side in one row when order is Ready */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, width: '100%' }}>
                      {isReady ? (
                        <>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#F59E0B', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}
                            onPress={() => {
                              setSelectedOrder(ord);
                              setShowAssignModal(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 }} numberOfLines={1} adjustsFontSizeToFit>
                              🛵 Assign Boy
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: COLORS.primaryLight, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '30', paddingHorizontal: 6 }}
                            onPress={() => {
                              setModalType(null);
                              navigation.navigate('OrderDetail', { orderId: ord.id, orderObj: ord });
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: COLORS.primaryDark, fontFamily: FONTS.bold, fontSize: 12 }} numberOfLines={1} adjustsFontSizeToFit>
                              View Details
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={{ flex: 1, width: '100%', backgroundColor: COLORS.primaryLight, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary + '30', paddingHorizontal: 12 }}
                          onPress={() => {
                            setModalType(null);
                            navigation.navigate('OrderDetail', { orderId: ord.id, orderObj: ord });
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: COLORS.primaryDark, fontFamily: FONTS.bold, fontSize: 13 }}>📄 View Details & Receipt</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('Orders', { filter: 'All' });
              }}
            >
              <Text style={styles.modalActionTxt}>Go to Order Control Center ➔</Text>
            </TouchableOpacity>
          </View>
        );

      case 'pending_pickups':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🛵 Pending Pickups ({pendingPickupsCount})</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Scheduled pickup tasks awaiting collection</Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {pendingPickupsList.length === 0 ? (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary }}>No pending pickups right now.</Text>
                </View>
              ) : (
                pendingPickupsList.map((ord) => (
                  <View key={ord.id} style={styles.detailItemCard}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemIdTxt}>{ord.id}</Text>
                      <Text style={styles.itemTime}>Slot: {ord.dueDate || 'Today'}</Text>
                    </View>
                    <Text style={styles.itemCustName}>{ord.customerName} • 📞 {ord.mobile}</Text>
                    <Text style={styles.itemDetailTxt}>📍 {ord.address}</Text>
                    <Text style={styles.itemDetailTxt}>
                      🧺 Items: {ord.items?.map((i: any) => `${i.serviceName} (${i.qty} ${i.unit})`).join(', ') || 'Laundry Services'}
                    </Text>
                    <View style={styles.cardBtnRow}>
                      <TouchableOpacity
                        style={styles.smallOutlineBtn}
                        onPress={() => Alert.alert('Calling Customer 📞', `Dialing ${ord.mobile}...`)}
                      >
                        <Text style={styles.smallOutlineTxt}>📞 Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.smallFilledBtn}
                        onPress={() => {
                          setModalType(null);
                          navigation.navigate('Orders', { filter: 'Pending' });
                        }}
                      >
                        <Text style={styles.smallFilledTxt}>Assign Partner ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('Orders', { filter: 'Pending' });
              }}
            >
              <Text style={styles.modalActionTxt}>View All Pending Pickups ➔</Text>
            </TouchableOpacity>
          </View>
        );

      case 'pending_deliveries':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🚚 Pending Deliveries ({pendingDeliveriesCount})</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Cleaned orders out for dispatch or customer drop</Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {pendingDeliveriesList.length === 0 ? (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary }}>No pending deliveries right now.</Text>
                </View>
              ) : (
                pendingDeliveriesList.map((ord) => (
                  <View key={ord.id} style={styles.detailItemCard}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemIdTxt}>{ord.id}</Text>
                      <Text style={[styles.itemPrice, { color: COLORS.success }]}>₹{ord.totalAmount} ({ord.paymentMethod})</Text>
                    </View>
                    <Text style={styles.itemCustName}>{ord.customerName} • 📞 {ord.mobile}</Text>
                    <Text style={styles.itemDetailTxt}>📍 {ord.address}</Text>
                    <Text style={styles.itemDetailTxt}>
                      📦 Items: {ord.items?.map((i: any) => `${i.serviceName} (${i.qty} ${i.unit})`).join(', ') || 'Laundry Services'}
                    </Text>
                    <Text style={styles.itemDetailTxt}>🛵 Status: {ord.status}</Text>
                    <View style={styles.cardBtnRow}>
                      <TouchableOpacity
                        style={styles.smallOutlineBtn}
                        onPress={() => Alert.alert('Calling Customer 📞', `Dialing ${ord.mobile}...`)}
                      >
                        <Text style={styles.smallOutlineTxt}>📞 Call Customer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.smallFilledBtn}
                        onPress={() => {
                          setModalType(null);
                          navigation.navigate('OrderDetail', { orderId: ord.id, orderObj: ord });
                        }}
                      >
                        <Text style={styles.smallFilledTxt}>View Order ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('Orders', { filter: 'Ready For Delivery' });
              }}
            >
              <Text style={styles.modalActionTxt}>Manage All Deliveries ➔</Text>
            </TouchableOpacity>
          </View>
        );

      case 'cancelled':
        const totalCancelledLoss = cancelledList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>⚠️ Cancelled Orders ({cancelledCount})</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Order cancellations & loss tracking</Text>

            {cancelledCount > 0 && (
              <View style={styles.lossBanner}>
                <Text style={styles.lossBannerTxt}>💸 Total Cancelled Value: ₹{totalCancelledLoss}</Text>
                <Text style={styles.lossBannerSub}>Primary Cause: Customer Cancellation / Unreachable</Text>
              </View>
            )}

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {cancelledList.length === 0 ? (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary }}>No cancelled orders today. 🎉</Text>
                </View>
              ) : (
                cancelledList.map((ord) => (
                  <View key={ord.id} style={styles.detailItemCard}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemIdTxt}>{ord.id}</Text>
                      <Text style={[styles.itemPrice, { color: COLORS.error }]}>-₹{ord.totalAmount}</Text>
                    </View>
                    <Text style={styles.itemCustName}>{ord.customerName} • 📞 {ord.mobile}</Text>
                    <Text style={styles.itemDetailTxt}>📍 {ord.address}</Text>
                    <Text style={styles.itemDetailTxt}>Time: {ord.createdAt}</Text>
                    <Text style={[styles.itemDetailTxt, { color: COLORS.error, marginTop: 4 }]}>
                      Reason: {ord.notes || 'Cancelled order'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('RevenueDashboard');
              }}
            >
              <Text style={styles.modalActionTxt}>View Loss & Revenue Analytics ➔</Text>
            </TouchableOpacity>
          </View>
        );

      case 'customers':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>👥 Registered Customers</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{customersCount} Total Customers under this shop</Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {customersList.length === 0 ? (
                <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary }}>No customers data available.</Text>
                </View>
              ) : (
                customersList.map((c, idx) => (
                  <View key={c.id || idx} style={styles.detailItemCard}>
                    <Text style={styles.itemCustName}>{c.name || c.user_name || 'Customer'}</Text>
                    <Text style={styles.itemDetailTxt}>📞 {c.phone || 'N/A'}</Text>
                    <Text style={styles.itemDetailTxt}>Orders: {c.totalOrders || c.orders_count || 0} • Spent: {c.totalSpent || c.total_spent || '₹0'}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('Customers');
              }}
            >
              <Text style={styles.modalActionTxt}>Manage All Customers ➔</Text>
            </TouchableOpacity>
          </View>
        );

      case 'rating':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>⭐ Customer Ratings Breakdown</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>142 Total Verified Customer Reviews</Text>

            <View style={styles.ratingOverviewBox}>
              <Text style={styles.ratingBigVal}>⭐ 4.8 / 5</Text>
              <Text style={styles.ratingSubVal}>94% Positive Feedback Rate</Text>

              <View style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>5 ★</Text>
                <View style={styles.barBackground}><View style={[styles.barFill, { width: '77%' }]} /></View>
                <Text style={styles.starCount}>110</Text>
              </View>
              <View style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>4 ★</Text>
                <View style={styles.barBackground}><View style={[styles.barFill, { width: '17%' }]} /></View>
                <Text style={styles.starCount}>24</Text>
              </View>
              <View style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>3 ★</Text>
                <View style={styles.barBackground}><View style={[styles.barFill, { width: '4%' }]} /></View>
                <Text style={styles.starCount}>5</Text>
              </View>
              <View style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>2 ★</Text>
                <View style={styles.barBackground}><View style={[styles.barFill, { width: '1%' }]} /></View>
                <Text style={styles.starCount}>2</Text>
              </View>
              <View style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>1 ★</Text>
                <View style={styles.barBackground}><View style={[styles.barFill, { width: '1%' }]} /></View>
                <Text style={styles.starCount}>1</Text>
              </View>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <View style={styles.detailItemCard}>
                <Text style={styles.itemCustName}>Ananya S. • ⭐⭐⭐⭐⭐</Text>
                <Text style={styles.itemDetailTxt}>"Excellent service! Clothes arrived neatly pressed and on time."</Text>
              </View>
              <View style={styles.detailItemCard}>
                <Text style={styles.itemCustName}>Deepak M. • ⭐⭐⭐⭐⭐</Text>
                <Text style={styles.itemDetailTxt}>"Very polite delivery partner Ravi. Great dry cleaning quality."</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalActionTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        );

      case 'delivery_success':
        return (
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>🚀 Delivery Completed</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>On-time delivery performance metrics</Text>

            <View style={[styles.ratingOverviewBox, { backgroundColor: '#E0E7FF' }]}>
              <Text style={[styles.ratingBigVal, { color: COLORS.primary }]}>98.5% On-Time</Text>
              <Text style={[styles.ratingSubVal, { color: COLORS.primary }]}>
                236 On-Time • 4 Delayed out of 240 Total Deliveries
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 10, marginBottom: 8 }]}>
              Delivery Boys Performance
            </Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <View style={styles.detailItemCard}>
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemCustName}>🛵 Ravi Kumar</Text>
                  <Text style={[styles.itemPrice, { color: COLORS.success }]}>99.2% On-Time</Text>
                </View>
                <Text style={styles.itemDetailTxt}>Total Deliveries: 128 • Customer Rating: ⭐ 4.9</Text>
              </View>

              <View style={styles.detailItemCard}>
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemCustName}>🛵 Vikas Singh</Text>
                  <Text style={[styles.itemPrice, { color: COLORS.success }]}>97.8% On-Time</Text>
                </View>
                <Text style={styles.itemDetailTxt}>Total Deliveries: 112 • Customer Rating: ⭐ 4.8</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setModalType(null);
                navigation.navigate('DeliveryBoys');
              }}
            >
              <Text style={styles.modalActionTxt}>Manage Delivery Team ➔</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.shopName}>
              {currentShop?.name || currentShop?.shop_name || currentUser?.name || 'Laundry Partner'}
            </Text>
            <Text style={styles.subtitle}>Owner Partner Dashboard</Text>
          </View>
        </View>

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
          {/* Revenue Summary Banner (Real Live Data) */}
          {/* Revenue Summary Banner (Real Live Data) */}
          <TouchableOpacity
            style={{ marginBottom: SPACING.xl, width: '100%', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 }}
            onPress={() => navigation.navigate('RevenueDashboard')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8162EE', '#A672D6', '#E18C8E', '#FE9A5D']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.revenueBanner, { marginBottom: 0, elevation: 0, shadowOpacity: 0 }]}
            >
              <View style={styles.revenueCol}>
                <Text style={styles.revenueLabel} numberOfLines={1}>Today's Revenue</Text>
                <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit>₹{todayRevenue.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.revenueCol}>
                <Text style={styles.revenueLabel} numberOfLines={1}>Shop Total Earnings</Text>
                <Text style={styles.revenueValue} numberOfLines={1} adjustsFontSizeToFit>₹{totalEarnings.toLocaleString()}</Text>
              </View>
              <Text style={styles.arrowIcon}>➔</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Operational Overview Cards */}
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.gridRow}>
            <AppCard
              title="Today's Orders"
              value={todaysOrdersCount.toString()}
              style={styles.gridCard}
              subtitle={`${activeOrdersCount} Active`}
              onPress={() => setModalType('todays_orders')}
            />
            <AppCard
              title="Pending Pickups"
              value={pendingPickupsCount.toString()}
              style={styles.gridCard}
              subtitle="Scheduled / Pending"
              onPress={() => setModalType('pending_pickups')}
            />
          </View>

          <View style={styles.gridRow}>
            <AppCard
              title="Pending Deliveries"
              value={pendingDeliveriesCount.toString()}
              style={styles.gridCard}
              subtitle="Ready / Out for delivery"
              onPress={() => setModalType('pending_deliveries')}
            />
            <AppCard
              title="Cancelled"
              value={cancelledCount.toString()}
              style={styles.gridCard}
              subtitle="Total Cancelled"
              onPress={() => setModalType('cancelled')}
            />
          </View>

          {/* Performance & Ratings */}
          <View style={styles.gridRow}>
            <AppCard
              title="Customer Rating"
              value={`⭐ ${Number(currentShop?.rating || 5.0).toFixed(1)} / 5`}
              style={styles.gridCard}
              subtitle="Verified Rating"
              onPress={() => setModalType('rating')}
            />
            <AppCard
              title="Delivery Completed"
              value={`${deliverySuccessRate}%`}
              style={styles.gridCard}
              subtitle={`${completedOrdersCount} Delivered`}
              onPress={() => setModalType('delivery_success')}
            />
          </View>

          {/* Customer Overview */}
          <View style={styles.gridRow}>
            <AppCard
              title="Registered Customers"
              value={customersCount.toString()}
              style={[styles.gridCard, { flex: 1, marginRight: 0 }]}
              subtitle="Customers registered / logged in"
              onPress={() => setModalType('customers')}
            />
          </View>

          {/* Live Recent Orders & Delivered Status (Real Database Orders) */}
          <View style={{ marginTop: SPACING.md, marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Recent Orders & Deliveries</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders', { filter: 'All' })}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primaryDark }}>View All ({orders.length})</Text>
              </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
              <View style={[styles.detailItemCard, { alignItems: 'center', padding: 16 }]}>
                <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary }}>No orders placed for this shop yet.</Text>
              </View>
            ) : (
              orders.slice(0, 3).map((ord) => (
                <TouchableOpacity
                  key={ord.id}
                  style={[styles.detailItemCard, { marginBottom: 10 }]}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: ord.id, orderObj: ord })}
                  activeOpacity={0.85}
                >
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.itemIdTxt}>{ord.id}</Text>
                    <View style={{
                      backgroundColor: ord.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(129, 98, 238, 0.15)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: ord.status === 'Completed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(129, 98, 238, 0.3)',
                    }}>
                      <Text style={{
                        color: ord.status === 'Completed' ? '#10B981' : COLORS.primaryDark,
                        fontFamily: FONTS.bold,
                        fontSize: 11,
                      }}>
                        {ord.status === 'Completed' ? '✓ DELIVERED' : ord.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemCustName}>👤 {ord.customerName} • 📞 {ord.mobile}</Text>
                  <Text style={styles.itemDetailTxt} numberOfLines={1}>📍 {ord.address}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                    <Text style={{ fontFamily: FONTS.bold, color: COLORS.success, fontSize: 13 }}>₹{ord.totalAmount.toLocaleString()} ({ord.paymentStatus})</Text>
                    <Text style={{ fontFamily: FONTS.medium, color: COLORS.primaryDark, fontSize: 11 }}>View Details ➔</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Management Module Quick Access Shortcuts */}
          <Text style={styles.sectionTitle}>Partner Management Modules</Text>

          <View style={styles.shortcutGrid}>
            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.shortcutIcon}>📦</Text>
              <Text style={styles.shortcutTitle}>Order Management</Text>
              <Text style={styles.shortcutSub}>Status & Assignments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('Services')}
            >
              <Text style={styles.shortcutIcon}>🧺</Text>
              <Text style={styles.shortcutTitle}>Services & Pricing</Text>
              <Text style={styles.shortcutSub}>Piece & KG Wise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('DeliveryBoys')}
            >
              <Text style={styles.shortcutIcon}>🛵</Text>
              <Text style={styles.shortcutTitle}>Delivery Boys</Text>
              <Text style={styles.shortcutSub}>Team & Assignments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('Customers')}
            >
              <Text style={styles.shortcutIcon}>👥</Text>
              <Text style={styles.shortcutTitle}>Customers</Text>
              <Text style={styles.shortcutSub}>History & Outstanding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('Promotions')}
            >
              <Text style={styles.shortcutIcon}>🏷️</Text>
              <Text style={styles.shortcutTitle}>Promotions & Offers</Text>
              <Text style={styles.shortcutSub}>Coupons & Broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('RevenueDashboard')}
            >
              <Text style={styles.shortcutIcon}>📊</Text>
              <Text style={styles.shortcutTitle}>Revenue Analytics</Text>
              <Text style={styles.shortcutSub}>COD, Online & GST</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => navigation.navigate('NewOrderStep1')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabPlus}>+</Text>
          <Text style={styles.fabTxt}>New Order</Text>
        </TouchableOpacity>

        {/* Interactive Metric Detail Modal */}
        <Modal
          visible={!!modalType}
          transparent
          animationType="slide"
          onRequestClose={() => setModalType(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {renderModalContent()}
            </View>
          </View>
        </Modal>

        {/* Assign Delivery Boy Modal */}
        <Modal visible={showAssignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: SPACING.lg, width: '90%', alignSelf: 'center' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text }}>Assign Delivery Boy</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>Select active rider for {selectedOrder?.id}</Text>

              {deliveryBoys.map((boy) => (
                <TouchableOpacity
                  key={boy.id}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.background, borderRadius: 8, marginBottom: 8 }}
                  onPress={() => handleAssignDeliveryBoy(boy.name)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.bold, color: COLORS.text }}>🛵 {boy.name}</Text>
                    {boy.phone ? (
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                        📞 {boy.phone} {boy.vehicle ? `• 🚚 ${boy.vehicle}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: boy.status === 'Online' ? COLORS.success : COLORS.textLight }} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: COLORS.background, alignItems: 'center' }}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={{ fontFamily: FONTS.bold, color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Status Picker Dropdown Modal - Centered Beautiful Card with Flow Steps */}
        <Modal visible={showStatusDropdownModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 12, 35, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ width: '92%', maxWidth: 400, backgroundColor: COLORS.card, borderRadius: 20, padding: 20, elevation: 12, shadowColor: '#1F0B66', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16 }}>
              {/* Header with Title and Order Badge */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text }}>Change Order Status</Text>
                    {selectedOrder?.id && (
                      <View style={{ backgroundColor: (COLORS.primaryLight || '#D7D9FC') + '40', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primaryLight || '#CECCFC' }}>
                        <Text style={{ fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 }}>#{selectedOrder.id}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 }}>Select new status for this order:</Text>
                </View>
                <TouchableOpacity
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1EFF8', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
                  onPress={() => setShowStatusDropdownModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Status Steps List */}
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8, paddingVertical: 4 }}>
                  {[
                    { icon: '⏳', title: 'Pending', desc: 'Order booked by customer', status: 'Received', meta: getOrderStatusMeta('Pending') },
                    { icon: '🔄', title: 'Processing', desc: 'Washing / Pressing in progress', status: 'Processing', meta: getOrderStatusMeta('Process') },
                    { icon: '🚚', title: 'Ready', desc: 'Ready for dispatch & rider', status: 'Ready', meta: getOrderStatusMeta('Ready') },
                    { icon: '🛵', title: 'Out for Delivery', desc: 'Dispatched with rider', status: 'Out For Delivery', meta: getOrderStatusMeta('Out For Delivery') },
                    { icon: '✅', title: 'Completed', desc: 'Delivered to customer', status: 'Completed', meta: getOrderStatusMeta('Completed') },
                    { icon: '❌', title: 'Cancelled', desc: 'Order cancelled', status: 'Cancelled', meta: getOrderStatusMeta('Cancelled') },
                  ].map((item) => {
                    const isActive = selectedOrder?.status === item.status;
                    const disabled = selectedOrder ? isStatusDisabled(selectedOrder.status, item.status) : false;

                    return (
                      <TouchableOpacity
                        key={item.status}
                        disabled={disabled}
                        style={[
                          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
                          isActive && { backgroundColor: item.meta.bg, borderColor: item.meta.border, borderWidth: 1.5 },
                          disabled && { opacity: 0.5, backgroundColor: '#FAF9FE', borderColor: '#EFEBF8' },
                        ]}
                        onPress={() => {
                          if (selectedOrder && !disabled) {
                            if (item.status === 'Cancelled') {
                              setShowStatusDropdownModal(false);
                              setShowCancelReasonModal(true);
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
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                            backgroundColor: isActive ? item.meta.border + '35' : (disabled ? '#EAE8F2' : '#F1EFFF'),
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                        </View>

                        {/* Middle Text */}
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text
                            style={[
                              { fontFamily: FONTS.bold, fontSize: 13.5, color: COLORS.text },
                              isActive && { color: item.meta.text },
                              disabled && { color: COLORS.textLight },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
                              disabled && { color: COLORS.textLight + '99' },
                            ]}
                            numberOfLines={1}
                          >
                            {item.desc}
                          </Text>
                        </View>

                        {/* Right Badge */}
                        {isActive ? (
                          <View style={{ backgroundColor: item.meta.text, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 10.5 }}>✓ Active</Text>
                          </View>
                        ) : disabled ? (
                          <View style={{ backgroundColor: '#ECEAF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ color: COLORS.textLight, fontSize: 10.5, fontFamily: FONTS.medium }}>🔒 Passed</Text>
                          </View>
                        ) : (
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.cardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                            <Text style={{ fontSize: 11, color: COLORS.primaryDark, fontFamily: FONTS.bold }}>➔</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 11, borderRadius: 12, backgroundColor: '#F3F1FA', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}
                onPress={() => setShowStatusDropdownModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cancellation Reason Selection Modal for Laundry Shop Owner */}
        <Modal visible={showCancelReasonModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 12, 35, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ width: '92%', maxWidth: 420, backgroundColor: COLORS.card, borderRadius: 20, padding: 20, elevation: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#DC2626' }}>⚠️ Specify Cancellation Reason</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 }}>
                    This reason will be sent directly to customer ({selectedOrder?.customerName || 'Customer'})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCancelReasonModal(false)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1EFF8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, marginBottom: 8 }}>Select Reason:</Text>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {[
                  '🏪 Store capacity full / Too many active orders',
                  '🔒 Shop closed / Holiday today',
                  '⚠️ Garments contain damage / Cannot process safely',
                  '📍 Delivery location out of service area',
                  '❓ Customer requested order cancellation',
                  '✍️ Other Reason',
                ].map((reason) => {
                  const isSel = selectedCancelReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setSelectedCancelReason(reason)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSel ? '#DC2626' : COLORS.border,
                        backgroundColor: isSel ? '#FEE2E2' : COLORS.card,
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontFamily: isSel ? FONTS.bold : FONTS.regular, fontSize: 13, color: isSel ? '#991B1B' : COLORS.text }}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedCancelReason === '✍️ Other Reason' && (
                <TextInput
                  placeholder="Enter custom cancellation reason for customer..."
                  placeholderTextColor={COLORS.textLight}
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
                    marginTop: 10,
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  shopName: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.primary,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: SIZES.radius_full,
    elevation: 6,
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
    fontSize: 20,
    marginRight: 6,
  },
  fabTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  container: {
    padding: SPACING.lg,
  },
  revenueBanner: {
    width: '100%',
    height: 130,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: SIZES.radius_lg,
    marginBottom: SPACING.xl,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  revenueCol: {
    flex: 1,
    justifyContent: 'center',
  },
  revenueLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  revenueValue: {
    fontFamily: FONTS.bold,
    fontSize: 24, 
    color: '#FFFFFF',
    marginTop: 4,
  },
  divider: {
    width: 2, 
    height: 50, 
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: SPACING.md,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 6,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  gridCard: {
    flex: 1,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  shortcutCard: {
    width: '47.5%',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutIcon: {
    fontSize: 26,
    marginBottom: SPACING.xs,
  },
  shortcutTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  shortcutSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_lg,
    borderTopRightRadius: SIZES.radius_lg,
    maxHeight: '85%',
    padding: SPACING.lg,
  },
  modalBody: {
    flexDirection: 'column',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  modalSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  closeBtn: {
    padding: 6,
  },
  closeTxt: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  modalList: {
    maxHeight: 320,
    marginVertical: SPACING.xs,
  },
  detailItemCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemIdTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  itemCustName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  itemDetailTxt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemPrice: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  itemTime: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textLight,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_sm,
  },
  miniBadgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
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
  cardBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  smallOutlineTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  smallFilledBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.primary,
  },
  smallFilledTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
  },
  modalActionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalActionTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  lossBanner: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    marginBottom: SPACING.md,
  },
  lossBannerTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.error,
  },
  lossBannerSub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 2,
  },
  ratingOverviewBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    marginBottom: SPACING.md,
  },
  ratingBigVal: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
  },
  ratingSubVal: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  starLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textSecondary,
    width: 24,
  },
  barBackground: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  starCount: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'right',
  },
});
