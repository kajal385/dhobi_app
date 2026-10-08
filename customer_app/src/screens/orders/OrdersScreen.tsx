import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  StatusBar,
  Image,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { RootState } from '../../store';
import { setOrders, ordersLoading, ordersError } from '../../store/orderSlice';
import { orderService } from '../../services/orderService';
import { OrderCard } from '../../components/OrderCard';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Order } from '../../types';

type Tab = 'active' | 'history';

export const OrdersScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { orders, loading } = useSelector((s: RootState) => s.orders);
  const [tab, setTab] = useState<Tab>('active');
  const [refreshing, setRefreshing] = useState(false);

  const isHistoryStatus = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'delivered' || s === 'cancelled' || s === 'completed';
  };

  const rawOrdersList = Array.isArray(orders) ? orders : [];
  const activeOrders = rawOrdersList.filter((o) => o && !isHistoryStatus(o.status));
  const historyOrders = rawOrdersList.filter((o) => o && isHistoryStatus(o.status));
  const displayed = tab === 'active' ? activeOrders : historyOrders;

  const fetchOrders = useCallback(async () => {
    try {
      const res: any = await orderService.getOrders();
      const orderData = Array.isArray(res) ? res : (res?.data || []);
      dispatch(setOrders(orderData));
    } catch (e: any) {
      dispatch(ordersError(e.message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{tab === 'active' ? '🧺' : '📋'}</Text>
      <Text style={[styles.emptyTitle, { color: '#321D8C' }]}>
        {tab === 'active' ? 'No active orders' : 'No past orders'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {tab === 'active' ? 'Place a new order to get started' : 'Your completed orders will appear here'}
      </Text>
    </View>
  );

  return (
    <ImageBackground
      source={require('../../../assets/myimages/login_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Decorative Sparkles & Bubbles */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 140, right: 15, zIndex: 99 }}>
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.lg) }]}>
        <Text style={[styles.headerTitle, { color: '#321D8C' }]}>My Orders</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Track & manage your laundry pickups
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: '#EDE8FF' }]}>
        {(['active', 'history'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tabItem,
              tab === t && { backgroundColor: '#5B52E8', shadowColor: '#5B52E8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
            ]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? '#FFFFFF' : '#321D8C', fontWeight: tab === t ? '800' : '600' },
              ]}
            >
              {t === 'active' ? `Active (${activeOrders.length})` : `History (${historyOrders.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && displayed.length === 0 ? (
        <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.lg }}>
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} width="100%" height={130} borderRadius={SIZES.radius_lg} style={{ marginBottom: SPACING.md }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item, index) => (item?.id != null ? String(item.id) : String(index))}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B52E8" />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() =>
                navigation.navigate('Tracking', {
                  orderId: item.id,
                  order: item,
                  shopName: (item as any)?.shop_name || item?.shop?.name,
                  ownerName: (item as any)?.owner_name || (item?.shop as any)?.owner_name,
                  shopLocation: (item as any)?.shop_address || (item?.shop as any)?.address,
                  shopPhone: (item as any)?.shop_phone || (item?.shop as any)?.phone,
                })
              }
              onTrack={() =>
                navigation.navigate('Tracking', {
                  orderId: item.id,
                  order: item,
                  shopName: (item as any)?.shop_name || item?.shop?.name,
                  ownerName: (item as any)?.owner_name || (item?.shop as any)?.owner_name,
                  shopLocation: (item as any)?.shop_address || (item?.shop as any)?.address,
                  shopPhone: (item as any)?.shop_phone || (item?.shop as any)?.phone,
                })
              }
            />
          )}
        />
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    borderRadius: SIZES.radius_full,
    padding: 4,
    marginVertical: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: SIZES.radius_full,
    alignItems: 'center',
  },
  tabText: { fontSize: 13 },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100, paddingTop: SPACING.xs },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: SPACING.xl },
});

export default OrdersScreen;
