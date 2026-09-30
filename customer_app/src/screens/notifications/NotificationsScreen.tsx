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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import AppScreen from '../../components/AppScreen';
import { RootState } from '../../store';
import { setNotifications, markAllRead, markRead, notificationsLoading } from '../../store/notificationSlice';
import { notificationService } from '../../services/notificationService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Notification } from '../../types';
import Toast from 'react-native-toast-message';

export const NotificationsScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { notifications, loading } = useSelector((s: RootState) => s.notifications);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    dispatch(notificationsLoading());
    try {
      const res = await notificationService.getNotifications();
      dispatch(setNotifications(res.data));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not load notifications' });
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      dispatch(markAllRead());
      Toast.show({ type: 'success', text1: 'All notifications marked as read' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to mark all as read' });
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.is_read) {
      try {
        await notificationService.markRead(item.id);
        dispatch(markRead(item.id));
      } catch (err) {
        // Silent error
      }
    }
    if (item.data?.order_id) {
      navigation.navigate('OrderDetail', { orderId: item.data.order_id });
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.notifRow,
        {
          backgroundColor: item.is_read ? colors.card : colors.primaryLight,
          borderColor: colors.border,
        },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notifHeader}>
        <Text style={[styles.notifTitle, { color: colors.text, fontWeight: item.is_read ? '600' : '800' }]}>
          {item.title}
        </Text>
        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
      </View>
      <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{item.body}</Text>
      <Text style={[styles.notifDate, { color: colors.textLight }]}>
        {new Date(item.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.readAllText, { color: colors.primary }]}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: SPACING.xl, gap: SPACING.md }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} width="100%" height={90} borderRadius={SIZES.radius_lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No notifications to display at the moment.
              </Text>
            </View>
          }
        />
      )}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  readAllText: { fontSize: 13, fontWeight: '700' },
  listContainer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  notifRow: {
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, flex: 1, marginRight: SPACING.sm },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: SPACING.sm },
  notifDate: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

export default NotificationsScreen;
