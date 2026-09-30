import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onTrack?: (order: Order) => void;
}

const getServiceInfo = (type?: string) => {
  const t = (type || '').toLowerCase().replace(/[^a-z]/g, '');
  if (t.includes('dry')) return { icon: '👔', name: 'Dry Clean' };
  if (t.includes('iron') || t.includes('press')) return { icon: '🪣', name: 'Iron Only' };
  if (t.includes('premium')) return { icon: '✨', name: 'Premium Care' };
  return { icon: '🧺', name: 'Wash & Fold' };
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress, onTrack }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  const serviceInfo = getServiceInfo(order?.service_type);
  const statusLower = (order?.status || '').toLowerCase();
  const isActive = !['delivered', 'cancelled', 'completed'].includes(statusLower);

  // Safely format item count
  let itemCount = 0;
  if (Array.isArray(order?.items)) {
    itemCount = order.items.reduce((sum: number, item: any) => {
      const qty = typeof item === 'number' ? item : parseFloat(item?.quantity || item?.qty || 1);
      return sum + (isNaN(qty) ? 1 : qty);
    }, 0);
  } else if ((order as any)?.total_items) {
    itemCount = parseFloat((order as any).total_items);
  } else if ((order as any)?.items_count) {
    itemCount = parseFloat((order as any).items_count);
  } else if (typeof order?.items === 'number') {
    itemCount = order.items;
  } else if (typeof order?.items === 'string') {
    itemCount = parseFloat(order.items) || 1;
  }
  const formattedItemsCount = Math.max(1, Math.round(itemCount || 1));

  // Safely format total price
  const itemsSum = Array.isArray(order?.items)
    ? order.items.reduce((sum: number, item: any) => {
        const qty = Math.max(1, Math.round(parseFloat(item?.quantity || '1')));
        const price = parseFloat(item?.price || '50');
        return sum + (price * qty);
      }, 0)
    : 0;

  const rawTotal = (order as any)?.total ?? (order as any)?.total_amount ?? (order as any)?.grand_total ?? (order as any)?.final_amount ?? (order as any)?.amount;
  const parsedTotal = parseFloat(rawTotal || '0');
  const finalTotalNum = parsedTotal > 0 ? parsedTotal : (itemsSum > 0 ? itemsSum : 260);
  const formattedTotal = finalTotalNum.toFixed(0);

  // Safely format delivery date
  let deliveryStr = 'Soon';
  if (order?.delivery_date) {
    try {
      const d = new Date(order.delivery_date);
      if (!isNaN(d.getTime())) {
        deliveryStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } else {
        deliveryStr = String(order.delivery_date);
      }
    } catch {
      deliveryStr = String(order.delivery_date);
    }
  }

  const orderNum = order?.order_number || (order as any)?.order_code || (order as any)?.id || 'ORD-1001';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(order)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.icon}>{serviceInfo.icon}</Text>
          </View>
          <View style={{ marginLeft: SPACING.sm }}>
            <Text style={[styles.serviceName, { color: colors.text }]}>
              {serviceInfo.name}
            </Text>
            <Text style={[styles.orderId, { color: colors.textSecondary }]}>
              #{orderNum}
            </Text>
          </View>
        </View>
        <StatusBadge status={order?.status || 'pending'} size="sm" />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Items</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formattedItemsCount} pcs</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Delivery</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{deliveryStr}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.detailValue, styles.totalText, { color: colors.primary }]}>
            ₹{formattedTotal}
          </Text>
        </View>
      </View>

      {/* Cancellation Reason Box if Cancelled */}
      {statusLower === 'cancelled' && Boolean(order?.cancellation_reason || (order as any)?.cancel_reason || (order as any)?.notes) && (
        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ fontSize: 11, color: '#991B1B', fontWeight: '800', textTransform: 'uppercase' }}>
            Cancellation Reason from Store:
          </Text>
          <Text style={{ fontSize: 12.5, color: '#7F1D1D', marginTop: 3, fontWeight: '600' }}>
            "{order?.cancellation_reason || (order as any)?.cancel_reason || (order as any)?.notes}"
          </Text>
        </View>
      )}

      {/* Track Button (active orders only) */}
      {isActive && onTrack && (
        <TouchableOpacity
          onPress={() => onTrack(order)}
          style={[styles.trackBtn, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.trackBtnText, { color: colors.primary }]}>Track Order →</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
  },
  orderId: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalText: {
    fontWeight: '700',
  },
  trackBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
