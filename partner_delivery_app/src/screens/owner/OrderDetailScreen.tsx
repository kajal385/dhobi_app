import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { mockDataStore, ManualOrder } from '../../services/mockDataStore';
import { useAuth } from '../../context/AuthContext';
import { partnerService } from '../../services/partnerService';
import { getOrderStatusMeta } from './OrderManagementScreen';

const normalizeOrderObj = (raw: any): ManualOrder => {
  if (!raw) return raw;

  // Extract items
  let itemsList: any[] = [];
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    itemsList = raw.items.map((it: any) => ({
      serviceName: it.serviceName || it.item_name || it.name || it.service_type || 'Laundry Service',
      qty: it.qty || it.quantity || 1,
      unit: it.unit || 'piece',
      pricePerUnit: it.pricePerUnit || it.price || 0,
      totalPrice: it.totalPrice || it.total || (it.price || 0) * (it.quantity || 1),
    }));
  } else if (raw.service) {
    const parsedTotal = parseFloat(String(raw.amount || raw.totalAmount || '0').replace(/[^0-9.]/g, '')) || 0;
    itemsList = [
      {
        serviceName: raw.service,
        qty: 1,
        unit: 'pkg',
        pricePerUnit: parsedTotal,
        totalPrice: parsedTotal,
      },
    ];
  }

  const rawTotal = parseFloat(String(raw.totalAmount || raw.amount || raw.total_amount || raw.total || '0').replace(/[^0-9.]/g, '')) || 0;
  const isPaid = String(raw.paymentStatus || raw.payment_status || '').toUpperCase() === 'PAID';
  const paidAmt = isPaid ? rawTotal : (raw.paidAmount || 0);

  let mappedStatus: any = 'Placed';
  const rawStatusStr = String(raw.status || 'PLACED').toLowerCase().replace(/[\s_-]+/g, '');
  if (rawStatusStr === 'placed') mappedStatus = 'Placed';
  else if (rawStatusStr === 'received' || rawStatusStr === 'pending') mappedStatus = 'Received';
  else if (['inprocess', 'process', 'processing', 'accepted', 'washing'].includes(rawStatusStr)) mappedStatus = 'In-Process';
  else if (['readyfordelivery', 'ready', 'customerconfirmed'].includes(rawStatusStr)) mappedStatus = 'Ready';
  else if (['deliveryassigned', 'outfordelivery'].includes(rawStatusStr)) mappedStatus = 'Out for Delivery';
  else if (['delivered', 'completed'].includes(rawStatusStr)) mappedStatus = 'Delivered';
  else if (rawStatusStr === 'cancelled') mappedStatus = 'Cancelled';
  else mappedStatus = 'Placed';

  return {
    id: raw.id || raw.order_number || `ORD-${raw.numericId || 100}`,
    societyName: raw.societyName || raw.society_name || '',
    tower: raw.tower || '',
    flat: raw.flat || raw.flat_no || raw.flatNo || '',
    customerName: raw.customerName || raw.customer || raw.customer_name || raw.user?.name || 'Customer',
    mobile: raw.mobile || raw.phone || raw.customer_phone || raw.user?.phone || 'N/A',
    address: raw.address || raw.pickup_address || raw.delivery_address || 'Pune',
    deliveryType: raw.deliveryType || raw.type || 'Home Delivery',
    dueDate: raw.dueDate || raw.pickupTime || raw.pickup_date || 'Today',
    dueTime: raw.dueTime || 'Standard Time',
    isUrgent: Boolean(raw.isUrgent || raw.is_urgent || raw.is_express || raw.expressSLA),
    expressSLA: Boolean(raw.expressSLA || raw.is_express || raw.isUrgent || raw.is_urgent),
    status: mappedStatus,
    items: itemsList.length > 0 ? itemsList : [
      { serviceName: 'Laundry & Dry Cleaning', qty: 1, unit: 'pkg', pricePerUnit: rawTotal, totalPrice: rawTotal }
    ],
    subtotal: rawTotal,
    discountAmount: 0,
    totalAmount: rawTotal,
    paymentMethod: raw.paymentMethod || raw.payment_method || 'COD',
    paymentStatus: isPaid ? 'Paid' : 'Unpaid',
    paidAmount: paidAmt,
    remainingAmount: Math.max(0, rawTotal - paidAmt),
    notes: raw.notes || raw.special_instructions || '',
    timeline: raw.timeline || [
      { status: 'Order Placed', timestamp: raw.createdAt || 'Just now', note: 'Booked online by customer' },
      { status: mappedStatus, timestamp: 'Current', note: 'Order in progress' },
    ],
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

const CANCEL_REASONS = [
  '⚠️ Machine Failure / Technical Issue',
  '❌ Store Capacity Full / Overloaded',
  '🚫 Item Cannot Be Processed / Damaged Fabric Risk',
  '📍 Delivery Location Out of Service Area',
  '⏰ Urgent Processing Not Possible in Time',
  '✍️ Other Reason',
];

export const OrderDetailScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentShop } = useAuth();
  const shopDisplayName = currentShop?.name || currentShop?.shop_name || 'DhobiPro Laundry';

  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');

  const passedOrder = route?.params?.orderObj || route?.params?.order;
  const orderId = route?.params?.orderId || (passedOrder ? passedOrder.id : null);

  const [order, setOrder] = useState<ManualOrder | undefined>(() => {
    if (passedOrder) {
      return normalizeOrderObj(passedOrder);
    }
    if (orderId) {
      const mockOrd = mockDataStore.getOrderById(orderId);
      if (mockOrd) return mockOrd;
    }
    return undefined;
  });
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (passedOrder) {
      setOrder(normalizeOrderObj(passedOrder));
      setLoading(false);
      return;
    }

    if (!orderId) {
      setLoading(false);
      return;
    }

    // Check mockDataStore first
    const mockOrd = mockDataStore.getOrderById(orderId);
    if (mockOrd) {
      setOrder(mockOrd);
      setLoading(false);
      return;
    }

    // Fetch real orders from API to find matching orderId
    const fetchApiOrder = async () => {
      try {
        const apiOrders = await partnerService.getOwnerOrders(undefined, currentShop?.id);
        if (Array.isArray(apiOrders)) {
          const match = apiOrders.find(
            (o: any) =>
              String(o.id) === String(orderId) ||
              String(o.order_number || '').toLowerCase() === String(orderId).toLowerCase()
          );
          if (match) {
            setOrder(normalizeOrderObj(match));
          }
        }
      } catch (err) {
        console.log('Error fetching order detail from API:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApiOrder();
  }, [orderId, passedOrder, currentShop]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Order details could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleNextStatus = () => {
    const statuses: ManualOrder['status'][] = [
      'Placed',
      'Received',
      'In-Process',
      'Ready',
      'Out for Delivery',
      'Delivered',
    ];
    const currentIndex = statuses.indexOf(order.status);
    const nextStatus = statuses[currentIndex + 1];

    if (nextStatus) {
      const apiStatusMap: { [key: string]: string } = {
        Placed: 'placed',
        Received: 'received',
        'In-Process': 'in_process',
        Ready: 'ready_for_delivery',
        'Out for Delivery': 'out_for_delivery',
        Delivered: 'delivered',
      };
      const rawId = (order as any).numericId || (typeof order.id === 'string' ? order.id.replace(/\D/g, '') : order.id) || order.id;
      if (rawId) {
        partnerService.updateOrderStatus(rawId, apiStatusMap[nextStatus] || nextStatus.toLowerCase());
      }
      mockDataStore.updateOrderStatus(order.id, nextStatus);
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      Alert.alert('Status Updated 📈', `Order ${order.id} status changed to ${nextStatus}`);
    } else {
      Alert.alert('Delivered 🎉', `Order ${order.id} is already completed / delivered.`);
    }
  };

  const handleSendWhatsAppBill = async () => {
    const receiptMsg =
      `*🧺 ${order.societyName ? order.societyName + ' - ' : ''}${shopDisplayName} Receipt*\n` +
      `----------------------------------------\n` +
      `*Order ID:* ${order.id}\n` +
      `*Customer:* ${order.customerName}\n` +
      `*Phone:* ${order.mobile}\n` +
      `*Address:* ${order.address}\n` +
      `----------------------------------------\n` +
      `*Services Requested:*\n` +
      order.items.map((i) => `• ${i.serviceName} (${i.qty} ${i.unit}) - ₹${i.totalPrice}`).join('\n') +
      `\n----------------------------------------\n` +
      `*Total Bill:* ₹${order.totalAmount}\n` +
      `*Payment Mode:* ${order.paymentMethod}\n` +
      `*Amount Paid:* ₹${order.paidAmount} (${order.paymentStatus})\n` +
      `*Due Balance:* ₹${order.remainingAmount}\n` +
      `*Expected Due:* ${order.dueDate} (${order.dueTime})\n` +
      `----------------------------------------\n` +
      `Thank you for choosing ${shopDisplayName}! 💙`;

    const cleanPhone = order.mobile.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(receiptMsg);

    const appUrl = `whatsapp://send?phone=${formattedPhone}&text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;

    Linking.openURL(appUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert(
          'WhatsApp Receipt Ready 📱',
          `Order #${order.id} receipt formatted for ${order.customerName}.\nDirect Link: https://wa.me/${formattedPhone}`
        );
      });
    });
  };

  const handleGenerateQRLabel = () => {
    Alert.alert(
      'Garment Tag QR Generated 🏷️',
      `QR Tag Code: [QR-${order.id}]\nCustomer: ${order.customerName}\nItem Count: ${order.items.reduce((s, i) => s + i.qty, 0)} pieces\nPrint label sent to thermal printer.`
    );
  };

  const handleCancelOrder = () => {
    setSelectedCancelReason(CANCEL_REASONS[0]);
    setCustomReasonText('');
    setShowCancelReasonModal(true);
  };

  const statusMeta = getOrderStatusMeta(order.status);

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{order.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border, borderWidth: 1 }]}>
            <Text style={[styles.statusBadgeTxt, { color: statusMeta.text }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {/* Status Banner */}
          {order.status === 'Cancelled' && (
            <AppCard style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#DC2626' }}>
                ❌ Order Cancelled
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: '#991B1B', marginTop: 4 }}>
                Reason: {(order as any).cancellation_reason || (order as any).notes || 'Cancelled by laundry shop owner'}
              </Text>
            </AppCard>
          )}
          {(order.status === 'Ready' || order.status === 'Ready for Delivery' || order.status === 'Customer Confirmed') && (
            <AppCard style={[styles.card, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#047857' }}>
                ✨ Garments Ready for Delivery
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#065F46', marginTop: 4 }}>
                Laundry processing is complete! You can assign a delivery rider to dispatch the order to the customer.
              </Text>
            </AppCard>
          )}
          {/* Customer & Address Card */}
          <AppCard style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardSectionHeader}>👤 Customer Details</Text>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => {
                  if (order.mobile) {
                    Linking.openURL(`tel:${order.mobile.replace(/\D/g, '')}`);
                  }
                }}
              >
                <Text style={styles.callBtnTxt}>📞 Call {order.mobile}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.customerName}>{order.customerName}</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary, marginVertical: 4 }}>
              📞 Customer Mobile: {order.mobile}
            </Text>
            <Text style={styles.addressTxt}>📍 {order.address}</Text>
            <Text style={styles.metaTxt}>🚚 Mode: {order.deliveryType} • Due: {order.dueDate} ({order.dueTime})</Text>

            {order.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeTxt}>🔥 Marked as Urgent Order</Text>
              </View>
            )}
          </AppCard>

          {/* Services & Items Breakdown */}
          <AppCard style={styles.card}>
            <Text style={styles.cardSectionHeader}>🧺 Services & Items</Text>

            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.serviceName}</Text>
                  <Text style={styles.itemSub}>{item.qty} {item.unit} @ ₹{item.pricePerUnit}/{item.unit}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
              </View>
            ))}

            <View style={styles.billDivider} />

            <View style={styles.billRow}>
              <Text style={styles.billLbl}>Total Amount:</Text>
              <Text style={styles.billVal}>₹{order.totalAmount}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLbl}>Paid Amount ({order.paymentMethod}):</Text>
              <Text style={[styles.billVal, { color: COLORS.success }]}>₹{order.paidAmount}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLbl}>Remaining Balance:</Text>
              <Text style={[styles.billVal, { color: order.remainingAmount > 0 ? COLORS.error : COLORS.success }]}>
                ₹{order.remainingAmount}
              </Text>
            </View>
          </AppCard>

          {/* Order Timeline */}
          <AppCard style={styles.card}>
            <Text style={styles.cardSectionHeader}>⏱️ Order Timeline</Text>

            {order.timeline.map((step, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.dotLineCol}>
                  <View style={styles.timelineDot} />
                  {idx < order.timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{step.status}</Text>
                  <Text style={styles.timelineTime}>{step.timestamp}</Text>
                  {step.note && <Text style={styles.timelineNote}>{step.note}</Text>}
                </View>
              </View>
            ))}
          </AppCard>

          {/* Special Notes */}
          {order.notes ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardSectionHeader}>📝 Special Instructions / Notes</Text>
              <Text style={styles.notesTxt}>{order.notes}</Text>
            </AppCard>
          ) : null}

          {/* Cancel Button */}
          {order.status !== 'Cancelled' && order.status !== 'Completed' && (
            <TouchableOpacity style={styles.cancelOrderBtn} onPress={handleCancelOrder}>
              <Text style={styles.cancelOrderTxt}>🚫 Cancel Order</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.qrBtn, { flex: 1 }]} onPress={handleGenerateQRLabel}>
            <Text style={styles.qrBtnTxt}>🏷️ QR Tag Label</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.waBtn, { flex: 1 }]} onPress={handleSendWhatsAppBill}>
            <Text style={styles.waBtnTxt}>💬 Send WhatsApp Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Cancellation Reason Prompt Modal */}
        <Modal visible={showCancelReasonModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 420, backgroundColor: COLORS.card, borderRadius: 16, padding: 20 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#DC2626' }}>❌ Cancel Order</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                Please select the reason for cancelling order {order?.id}. This reason will be sent directly to the customer.
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
                    if (order) {
                      if ((order as any).numericId) {
                        partnerService.updateOrderStatus((order as any).numericId, 'cancelled', undefined, finalReason);
                      }
                      mockDataStore.updateOrderStatus(order.id, 'Cancelled', finalReason, finalReason);
                      setOrder(prev => prev ? { ...prev, status: 'Cancelled', cancellation_reason: finalReason } : prev);
                      Alert.alert('Order Cancelled ❌', `Order ${order.id} cancelled.\nReason sent to customer: "${finalReason}"`);
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
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  backBtn: { marginRight: SPACING.md },
  backTxt: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primary },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  statusBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
  },
  statusBadgeTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  container: { padding: SPACING.lg, paddingBottom: 110 },
  card: { marginBottom: SPACING.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSectionHeader: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primary, marginBottom: SPACING.xs },
  callBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radius_sm },
  callBtnTxt: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.primaryDark },
  customerName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginTop: SPACING.xs },
  addressTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaTxt: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary, marginTop: 4 },
  urgentBadge: {
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.xs,
    borderRadius: SIZES.radius_sm,
    marginTop: SPACING.xs,
  },
  urgentBadgeTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.warning },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  itemSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  itemPrice: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  billDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billLbl: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  billVal: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  timelineRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  dotLineCol: { alignItems: 'center', width: 24 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 2 },
  timelineContent: { flex: 1, marginLeft: 8 },
  timelineStatus: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  timelineTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary },
  timelineNote: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary },
  notesTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  cancelOrderBtn: {
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  cancelOrderTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.error },
  footer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrBtnTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.text },
  waBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.success,
    borderRadius: SIZES.radius_sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBtnTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  advanceBtn: { flex: 1, backgroundColor: COLORS.primary },
});
