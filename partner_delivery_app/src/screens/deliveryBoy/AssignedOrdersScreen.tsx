import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

interface AssignedTaskItem {
  id: string;
  type: 'Pickup' | 'Delivery';
  customer: string;
  phone: string;
  address: string;
  shopName: string;
  time: string;
  items: string;
  instructions?: string;
  status: string;
  isUrgent?: boolean;
  amount?: string;
  rawOrder?: any;
}

export const AssignedOrdersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Pickup' | 'Delivery' | 'Completed'>(
    route.params?.filter || 'All'
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allTasksCombined, setAllTasksCombined] = useState<AssignedTaskItem[]>([]);

  useEffect(() => {
    if (route.params?.filter) {
      setFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  const deliveryBoyId = currentUser?.delivery_boy_id || currentUser?.id || null;

  const fetchAssignedOrders = useCallback(async () => {
    if (!deliveryBoyId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(
        `/delivery/assignments?driver_id=${deliveryBoyId}`
      );
      const assignments = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      const liveTasks: AssignedTaskItem[] = assignments.map((a: any) => {
        const order = a.order ?? a;
        const status = String(order.status ?? a.status ?? '').toUpperCase();
        const items = Array.isArray(order.items)
          ? order.items.map((i: any) => `${i.service_name || i.item_name || 'Service'} x${i.quantity || 1}`).join(', ')
          : 'Laundry Service';

        return {
          id: `ORD-${order.id ?? order.order_id ?? a.id}`,
          type: ['RECEIVED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(status) ? 'Pickup' : 'Delivery',
          customer: order.customer?.name || order.customerName || 'Customer',
          phone: order.customer?.phone || order.customerPhone || 'N/A',
          address: order.customer?.address || order.address || 'Pune',
          shopName: order.laundry_shop?.name || order.laundryName || 'Laundry Shop',
          time: order.pickup_time || order.delivery_time || order.created_at?.slice(0, 16)?.replace('T', ' ') || 'Today',
          items,
          instructions: order.notes ? `📝 ${order.notes}` : undefined,
          status: ['DELIVERED', 'COMPLETED'].includes(status) ? 'Completed' : 'Pending',
          isUrgent: Boolean(order.is_urgent || order.isUrgent),
          amount: `₹${order.total_amount ?? order.totalAmount ?? 0} (${order.payment_status || order.paymentStatus || 'Unpaid'})`,
          rawOrder: order,
        };
      });

      setAllTasksCombined(liveTasks);
    } catch {
      // Handle error implicitly
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [deliveryBoyId]);

  useEffect(() => {
    fetchAssignedOrders();
  }, [fetchAssignedOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAssignedOrders();
  };

  const filtered = allTasksCombined.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return t.status === 'Pending';
    if (filter === 'Completed') return t.status === 'Completed';
    return t.type === filter;
  });

  const getCount = (tab: string) => {
    if (tab === 'All') return allTasksCombined.length;
    if (tab === 'Pending') return allTasksCombined.filter((x) => x.status === 'Pending').length;
    if (tab === 'Completed') return allTasksCombined.filter((x) => x.status === 'Completed').length;
    return allTasksCombined.filter((x) => x.type === tab).length;
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assigned Tasks</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRowScroll}>
          <View style={styles.tabRow}>
            {(['All', 'Pending', 'Pickup', 'Delivery', 'Completed'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, filter === t && styles.tabBtnActive]}
                onPress={() => setFilter(t)}
              >
                <Text style={[styles.tabTxt, filter === t && styles.tabTxtActive]}>
                  {t} ({getCount(t)})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginTop: 12 }}>
              Loading your tasks…
            </Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {filtered.length === 0 ? (
            <AppCard style={{ padding: SPACING.xl, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary }}>
                No tasks found in "{filter}" filter.
              </Text>
            </AppCard>
          ) : (
            filtered.map((task, idx) => (
              <AppCard key={`${task.id}_assigned_${idx}`} style={styles.taskCard}>
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
                        {task.type}
                      </Text>
                    </View>

                    {task.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentTxt}>⚡ URGENT</Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.statusBadge,
                        task.status === 'Pending' ? styles.statusPending : styles.statusDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTxt,
                          task.status === 'Pending' ? styles.txtPending : styles.txtDone,
                        ]}
                      >
                        {task.status === 'Pending' ? '⏳ Pending' : '✅ Completed'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.taskId}>{task.id}</Text>
                </View>

                <Text style={styles.customerName}>{task.customer}</Text>

                <TouchableOpacity
                  style={styles.phoneBtn}
                  onPress={() => Alert.alert('Calling Customer 📞', `Dialing ${task.customer} (${task.phone})...`)}
                >
                  <Text style={styles.phoneTxt}>📞 Call {task.phone}</Text>
                </TouchableOpacity>

                <Text style={styles.addressTxt}>📍 {task.address}</Text>
                {task.shopName && (
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary, marginBottom: 4 }}>
                    🏪 Shop: {task.shopName}
                  </Text>
                )}
                <Text style={styles.timeTxt}>⏰ Slot: {task.time}</Text>
                <Text style={styles.itemsTxt}>📦 {task.items}</Text>

                {task.amount && (
                  <Text style={styles.amountTxt}>💳 Payment: {task.amount}</Text>
                )}

                {task.instructions && (
                  <View style={styles.instructBox}>
                    <Text style={styles.instructTxt}>{task.instructions}</Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() =>
                      Alert.alert('Google Maps Navigation 🗺️', `Opening turn-by-turn directions to ${task.address}`)
                    }
                  >
                    <Text style={styles.navBtnTxt}>🗺️ Navigate</Text>
                  </TouchableOpacity>

                  {task.status !== 'Completed' && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => {
                        if (task.type === 'Pickup') {
                          navigation.navigate('PickupVerification', { task });
                        } else {
                          navigation.navigate('DeliveryVerification', { task });
                        }
                      }}
                    >
                      <Text style={styles.startBtnTxt}>Start {task.type} Workflow ➔</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AppCard>
            ))
          )}
        </ScrollView>
        )}
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  tabRowScroll: {
    backgroundColor: COLORS.card,
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tabBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: SIZES.radius_full,
    backgroundColor: COLORS.background,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  tabTxtActive: { color: COLORS.white, fontFamily: FONTS.bold },
  container: { padding: SPACING.lg },
  taskCard: { marginBottom: SPACING.md },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: SIZES.radius_full },
  badgePickup: { backgroundColor: COLORS.primary + '20' },
  badgeDelivery: { backgroundColor: COLORS.accent + '20' },
  badgeTxt: { fontFamily: FONTS.bold, fontSize: 11 },
  txtPickup: { color: COLORS.primary },
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
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: SIZES.radius_full },
  statusPending: { backgroundColor: COLORS.warning + '20' },
  statusDone: { backgroundColor: COLORS.success + '20' },
  statusTxt: { fontFamily: FONTS.bold, fontSize: 11 },
  txtPending: { color: COLORS.warning },
  txtDone: { color: COLORS.success },
  taskId: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.textSecondary },
  customerName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  phoneBtn: { marginVertical: 4 },
  phoneTxt: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },
  addressTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: 2 },
  timeTxt: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primary, marginBottom: 2 },
  itemsTxt: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 4 },
  amountTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  instructBox: {
    backgroundColor: COLORS.card,
    padding: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    marginBottom: SPACING.md,
  },
  instructTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.text,
  },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  navBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  navBtnTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary },
  startBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  startBtnTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
});
