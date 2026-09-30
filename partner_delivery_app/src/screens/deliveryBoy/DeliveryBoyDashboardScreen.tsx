import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { mockDataStore } from '../../services/mockDataStore';

interface DeliveryTaskItem {
  id: string;
  type: 'Pickup' | 'Delivery';
  customer: string;
  phone: string;
  address: string;
  shopName: string;
  time: string;
  items: string;
  status: string;
  isUrgent?: boolean;
  amount?: string;
  rawOrder?: any;
}

export const DeliveryBoyDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalType, setModalType] = useState<
    'todays_pickups' | 'todays_deliveries' | 'pending_tasks' | 'completed_orders' | null
  >(null);

  const [allPickups, setAllPickups] = useState<DeliveryTaskItem[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<DeliveryTaskItem[]>([]);
  const [allCompleted, setAllCompleted] = useState<DeliveryTaskItem[]>([]);

  const deliveryBoyId = currentUser?.delivery_boy_id || currentUser?.id || null;

  const fetchAssignedOrders = useCallback(async () => {
    const pickups: DeliveryTaskItem[] = [];
    const deliveries: DeliveryTaskItem[] = [];
    const completed: DeliveryTaskItem[] = [];

    if (deliveryBoyId) {
      try {
        const res = await apiClient.get(
          `/delivery/assignments?driver_id=${deliveryBoyId}`
        );
        const assignments = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];

        for (const a of assignments) {
          const order = a.order ?? a;
          const status = String(order.status ?? a.status ?? '').toUpperCase();
          const items = Array.isArray(order.items)
            ? order.items.map((i: any) => `${i.service_name || i.item_name || 'Service'} x${i.quantity || 1}`).join(', ')
            : 'Laundry Service';
          const task: DeliveryTaskItem = {
            id: `ORD-${order.id ?? order.order_id ?? a.id}`,
            type: ['RECEIVED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(status) ? 'Pickup' : 'Delivery',
            customer: order.customer?.name || order.customerName || 'Customer',
            phone: order.customer?.phone || order.customerPhone || 'N/A',
            address: order.customer?.address || order.address || 'Pune',
            shopName: order.laundry_shop?.name || order.laundryName || 'Laundry Shop',
            time: order.pickup_time || order.delivery_time || order.created_at?.slice(0, 16)?.replace('T', ' ') || 'Today',
            items,
            status: ['DELIVERED', 'COMPLETED'].includes(status) ? 'Completed' : 'Pending',
            isUrgent: Boolean(order.is_urgent || order.isUrgent),
            amount: `₹${order.total_amount ?? order.totalAmount ?? 0} (${order.payment_status || order.paymentStatus || 'Unpaid'})`,
            rawOrder: order,
          };

          if (['DELIVERED', 'COMPLETED'].includes(status)) {
            completed.push(task);
          } else if (task.type === 'Pickup') {
            pickups.push(task);
          } else {
            deliveries.push(task);
          }
        }
      } catch {
        // silently fallback to mockDataStore
      }
    }

    // Always merge assigned orders from mockDataStore
    const storeOrders = mockDataStore.getOrders();
    for (const order of storeOrders) {
      if (!order.deliveryBoy || order.deliveryBoy === 'Unassigned') continue;

      const orderIdClean = order.id;
      const isAlreadyAdded = pickups.some(t => t.id === orderIdClean) ||
                             deliveries.some(t => t.id === orderIdClean) ||
                             completed.some(t => t.id === orderIdClean);
      if (isAlreadyAdded) continue;

      const statusUpper = String(order.status || '').toUpperCase();
      const itemsStr = Array.isArray(order.items)
        ? order.items.map((i: any) => `${i.serviceName || i.name} x${i.qty || 1}`).join(', ')
        : 'Laundry Items';

      const task: DeliveryTaskItem = {
        id: order.id,
        type: ['RECEIVED', 'CONFIRMED', 'PROCESSING'].includes(statusUpper) ? 'Pickup' : 'Delivery',
        customer: order.customerName || 'Customer',
        phone: order.mobile || 'N/A',
        address: order.address || 'Pune',
        shopName: 'DhobiPro Laundry',
        time: order.dueDate || 'Today',
        items: itemsStr,
        status: ['DELIVERED', 'COMPLETED'].includes(statusUpper) ? 'Completed' : 'Pending',
        isUrgent: Boolean(order.isUrgent),
        amount: `₹${order.totalAmount} (${order.paymentStatus || 'Unpaid'})`,
        rawOrder: order,
      };

      if (['DELIVERED', 'COMPLETED'].includes(statusUpper)) {
        completed.push(task);
      } else if (task.type === 'Pickup') {
        pickups.push(task);
      } else {
        deliveries.push(task);
      }
    }

    setAllPickups(pickups);
    setAllDeliveries(deliveries);
    setAllCompleted(completed);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [deliveryBoyId]);

  useEffect(() => {
    fetchAssignedOrders();
    const unsub = mockDataStore.subscribe(() => {
      fetchAssignedOrders();
    });
    return () => unsub();
  }, [fetchAssignedOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAssignedOrders();
  };

  const allPending = [...allPickups, ...allDeliveries];

  const handleCall = (phone: string, name: string) => {
    if (phone && phone !== 'N/A') {
      const cleanPhone = phone.replace(/\D/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        Alert.alert('Calling Customer 📞', `Dialing ${name} (${phone})...`);
      });
    } else {
      Alert.alert('Customer Contact 📞', `No phone number available for ${name}.`);
    }
  };

  const handleNavigateMap = (address: string) => {
    if (address && address !== 'N/A') {
      const encodedAddress = encodeURIComponent(address);
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(googleMapsUrl).catch(() => {
        Alert.alert('Google Maps Navigation 🗺️', `Opening directions to:\n${address}`);
      });
    } else {
      Alert.alert('Customer Address 📍', 'No delivery location set for this order.');
    }
  };

  const renderModalContent = () => {
    if (!modalType) return null;

    let title = '';
    let icon = '';
    let subtitle = '';
    let taskList: DeliveryTaskItem[] = [];
    let targetFilter: 'Pickup' | 'Delivery' | 'Pending' | 'Completed' = 'Pending';

    switch (modalType) {
      case 'todays_pickups':
        title = `Today's Pickups (${allPickups.length})`;
        icon = '🧺';
        subtitle = 'Scheduled customer cloth collections for today';
        taskList = allPickups;
        targetFilter = 'Pickup';
        break;

      case 'todays_deliveries':
        title = `Today's Deliveries (${allDeliveries.length})`;
        icon = '🚚';
        subtitle = 'Cleaned laundry ready for drop & payment collection';
        taskList = allDeliveries;
        targetFilter = 'Delivery';
        break;

      case 'pending_tasks':
        title = `Pending Tasks (${allPending.length})`;
        icon = '⏳';
        subtitle = 'Active pickups & dispatches requiring immediate action';
        taskList = allPending;
        targetFilter = 'Pending';
        break;

      case 'completed_orders':
        title = `Completed Orders (${allCompleted.length})`;
        icon = '✅';
        subtitle = 'Successfully delivered & collected orders';
        taskList = allCompleted;
        targetFilter = 'Completed';
        break;
    }

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>
              {icon} {title}
            </Text>
            <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>{subtitle}</Text>

          {/* Task List */}
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {taskList.length === 0 ? (
              <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary }}>
                  No tasks found in this section right now.
                </Text>
              </View>
            ) : (
              taskList.map((task, idx) => (
                <AppCard key={`${task.id}_${idx}`} style={styles.taskCardModal}>
                  <View style={styles.taskHeader}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View
                        style={[
                          styles.badge,
                          task.type === 'Pickup' ? styles.badgePickup : styles.badgeDelivery,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeTxt,
                            task.type === 'Pickup' ? styles.txtPickup : styles.txtDelivery,
                          ]}
                        >
                          {task.type} Task
                        </Text>
                      </View>

                      {task.isUrgent && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentTxt}>⚡ URGENT</Text>
                        </View>
                      )}

                      <View
                        style={[
                          styles.statusTag,
                          task.status === 'Completed' ? styles.bgSuccess : styles.bgWarning,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagTxt,
                            task.status === 'Completed' ? { color: COLORS.success } : { color: COLORS.warning },
                          ]}
                        >
                          {task.status === 'Completed' ? '✅ Completed' : '⏳ Pending'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.taskId}>{task.id}</Text>
                  </View>

                  <Text style={styles.customerName}>{task.customer}</Text>

                  {/* Quick Action Buttons for Phone & Maps */}
                  <View style={styles.contactRow}>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleCall(task.phone, task.customer)}
                    >
                      <Text style={styles.contactBtnTxt}>📞 Call {task.phone}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleNavigateMap(task.address)}
                    >
                      <Text style={styles.contactBtnTxt}>📍 Navigate</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.addressTxt} numberOfLines={2}>
                    📍 {task.address}
                  </Text>
                  <Text style={styles.timeTxt}>⏰ Slot / Time: {task.time}</Text>
                  <Text style={styles.itemsTxt}>📦 {task.items}</Text>

                  {task.amount && (
                    <Text style={styles.amountTxt}>💳 Amount: {task.amount}</Text>
                  )}

                  {/* Workflow / Action button */}
                  {task.status !== 'Completed' && (
                    <View style={styles.actionRowModal}>
                      <TouchableOpacity
                        style={styles.workflowBtn}
                        onPress={() => {
                          setModalType(null);
                          if (task.type === 'Pickup') {
                            navigation.navigate('PickupVerification', { task });
                          } else {
                            navigation.navigate('DeliveryVerification', { task });
                          }
                        }}
                      >
                        <Text style={styles.workflowBtnTxt}>
                          Start {task.type} Workflow ➔
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </AppCard>
              ))
            )}
          </ScrollView>

          {/* Footer Navigation Button */}
          <TouchableOpacity
            style={styles.modalFooterBtn}
            onPress={() => {
              setModalType(null);
              navigation.navigate('Assigned', { filter: targetFilter });
            }}
          >
            <Text style={styles.modalFooterTxt}>
              View All Tasks in Assigned Screen ➔
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning ☀️';
    if (hour >= 12 && hour < 17) return 'Good Afternoon 🌤️';
    if (hour >= 17 && hour < 22) return 'Good Evening 🌙';
    return 'Good Night 🌌';
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          {/* Executive Info & Duty Switch */}
          <View style={styles.headerTopRow}>
            <View style={styles.userInfo}>
              <Text style={styles.greetingText}>{getGreetingText()}</Text>
              <Text style={styles.name} numberOfLines={1}>{currentUser?.name || 'Delivery Partner'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeTxt}>🛵 Delivery Executive</Text>
              </View>
            </View>

            {/* Online / Offline Duty Switch Pill */}
            <View
              style={[
                styles.dutyPill,
                { backgroundColor: isOnline ? COLORS.success + '15' : COLORS.border + '40' },
              ]}
            >
              <Text
                style={[
                  styles.dutyTxt,
                  { color: isOnline ? COLORS.success : COLORS.textSecondary },
                ]}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: COLORS.border, true: COLORS.success + '50' }}
                thumbColor={isOnline ? COLORS.success : COLORS.textLight}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }], margin: -4 }}
              />
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginTop: 12 }}>
              Loading your assigned orders…
            </Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* 4 Clickable Metric Summary Cards (2x2 Grid) */}
          <View style={styles.summaryGrid}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sumCardTouchable}
              onPress={() => setModalType('todays_pickups')}
            >
              <AppCard style={styles.sumCardGrid}>
                <Text style={styles.sumIcon}>🧺</Text>
                <Text style={styles.sumValGrid}>{allPickups.length}</Text>
                <Text style={styles.sumLblGrid}>Today's Pickups</Text>
              </AppCard>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sumCardTouchable}
              onPress={() => setModalType('todays_deliveries')}
            >
              <AppCard style={styles.sumCardGrid}>
                <Text style={styles.sumIcon}>🚚</Text>
                <Text style={styles.sumValGrid}>{allDeliveries.length}</Text>
                <Text style={styles.sumLblGrid}>Today's Deliveries</Text>
              </AppCard>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sumCardTouchable}
              onPress={() => setModalType('pending_tasks')}
            >
              <AppCard style={styles.sumCardGrid}>
                <Text style={styles.sumIcon}>⏳</Text>
                <Text style={[styles.sumValGrid, { color: COLORS.warning }]}>
                  {allPending.length}
                </Text>
                <Text style={styles.sumLblGrid}>Pending Tasks</Text>
              </AppCard>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sumCardTouchable}
              onPress={() => setModalType('completed_orders')}
            >
              <AppCard style={styles.sumCardGrid}>
                <Text style={styles.sumIcon}>✅</Text>
                <Text style={[styles.sumValGrid, { color: COLORS.success }]}>
                  {allCompleted.length}
                </Text>
                <Text style={styles.sumLblGrid}>Completed Orders</Text>
              </AppCard>
            </TouchableOpacity>
          </View>

          {/* Shortcuts */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Assigned', { filter: 'Pending' })}
            >
              <Text style={styles.shortcutTxt}>
                📋 View All Assigned Orders ({allPending.length} Pending Active)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>My Assigned Tasks (From Laundry Shop)</Text>

          {allPending.length === 0 ? (
            <AppCard style={{ padding: SPACING.xl, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text }}>
                No Assigned Tasks Yet
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>
                When a laundry shop assigns you an order, it will appear here automatically. Pull down to refresh.
              </Text>
            </AppCard>
          ) : (
            allPending.map((task, idx) => (
              <AppCard key={`${task.id}_main_${idx}`} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View
                      style={[
                        styles.badge,
                        task.type === 'Pickup' ? styles.badgePickup : styles.badgeDelivery,
                      ]}
                    >

                      <Text
                        style={[
                          styles.badgeTxt,
                          task.type === 'Pickup' ? styles.txtPickup : styles.txtDelivery,
                        ]}
                      >
                        {task.type} Task
                      </Text>
                    </View>

                    {task.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentTxt}>⚡ URGENT</Text>
                      </View>
                    )}

                    <View
                      style={{
                        backgroundColor: COLORS.warning + '20',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.bold,
                          fontSize: 10,
                          color: COLORS.warning,
                        }}
                      >
                        ⏳ Pending
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.taskId}>{task.id}</Text>
                </View>

                <Text style={styles.customerName}>{task.customer}</Text>

                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => handleCall(task.phone, task.customer)}
                  >
                    <Text style={styles.contactBtnTxt}>📞 Call {task.phone}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => handleNavigateMap(task.address)}
                  >
                    <Text style={styles.contactBtnTxt}>📍 Navigate</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.addressTxt} numberOfLines={2}>
                  📍 {task.address}
                </Text>
                {task.shopName && (
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary, marginBottom: 2 }}>
                    🏪 Shop: {task.shopName}
                  </Text>
                )}
                <Text style={styles.timeTxt}>⏰ Slot: {task.time}</Text>
                <Text style={styles.itemsTxt}>📦 {task.items}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      if (task.type === 'Pickup') {
                        navigation.navigate('PickupVerification', { task });
                      } else {
                        navigation.navigate('DeliveryVerification', { task });
                      }
                    }}
                  >
                    <Text style={styles.actionBtnTxt}>
                      Start {task.type} Workflow ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              </AppCard>
            ))
          )}
        </ScrollView>
        )}

        {/* Modal for viewing summary card data */}
        <Modal visible={modalType !== null} transparent animationType="slide">
          {renderModalContent()}
        </Modal>

      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  greetingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12.5,
    color: COLORS.primaryDark,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.primary,
    marginTop: 1,
  },
  roleBadge: {
    marginTop: 3,
    backgroundColor: COLORS.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
  },
  roleBadgeTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  dutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dutyTxt: { fontFamily: FONTS.bold, fontSize: 12 },
  headerBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 4,
  },
  infoChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoChipTxt: { fontFamily: FONTS.semiBold, fontSize: 11.5, color: COLORS.textSecondary },
  container: { padding: SPACING.lg },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  sumCardTouchable: {
    width: '48.5%',
    marginBottom: SPACING.sm,
  },
  sumCardGrid: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sumIcon: { fontSize: 22, marginBottom: 2 },
  sumValGrid: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.primary },
  sumLblGrid: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  tapHint: {
    marginTop: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
  },
  tapHintTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.primaryDark,
  },
  shortcutRow: { marginBottom: SPACING.lg },
  shortcutBtn: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
  },
  shortcutTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primaryDark },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  taskCard: { marginBottom: SPACING.md },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgePickup: { backgroundColor: COLORS.primaryLight },
  badgeDelivery: { backgroundColor: COLORS.accentLight },
  badgeTxt: { fontFamily: FONTS.bold, fontSize: 11 },
  txtPickup: { color: COLORS.primaryDark },
  txtDelivery: { color: COLORS.accent },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.error,
  },
  taskId: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.textSecondary },
  customerName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginTop: 2 },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  contactBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contactBtnTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.primary,
  },
  addressTxt: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text, marginTop: 2 },
  timeTxt: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary, marginTop: 4 },
  itemsTxt: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amountTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.text, marginTop: 2 },
  actionRow: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  actionBtnTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: SPACING.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_full,
  },
  closeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalSub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalScroll: {
    marginBottom: SPACING.md,
  },
  taskCardModal: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bgSuccess: { backgroundColor: COLORS.success + '20' },
  bgWarning: { backgroundColor: COLORS.warning + '20' },
  statusTagTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  actionRowModal: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  workflowBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  workflowBtnTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.white,
  },
  modalFooterBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
  },
  modalFooterTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
});
