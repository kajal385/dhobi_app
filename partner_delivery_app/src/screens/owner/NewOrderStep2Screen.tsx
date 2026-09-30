import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';
import { mockDataStore, ServiceItem, OrderItem, ManualOrder } from '../../services/mockDataStore';
import { useAuth } from '../../context/AuthContext';

export const NewOrderStep2Screen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { currentShop } = useAuth();
  const shopDisplayName = currentShop?.name || currentShop?.shop_name || 'DhobiPro Laundry';
  const step1Data = route?.params?.step1Data || {
    societyName: 'Green Valley Homes',
    tower: 'Tower A',
    flat: 'A-203',
    customerName: 'Ajit Sharma',
    mobile: '9876543210',
    address: 'Flat A-203, Tower A, Green Valley Homes, Pune',
  };

  // Available Services
  const allServices = mockDataStore.getServices();
  const recommendedServices = mockDataStore.getRecommendedServicesForSociety(step1Data.societyName);

  // Selected Services & Quantities
  const [selectedServices, setSelectedServices] = useState<{ [id: string]: number }>({
    srv_2: 1, // Default selected Wash & Iron
  });

  // Schedule State
  const [dueDate, setDueDate] = useState<'Tomorrow' | '2 Days' | '3 Days' | '5 Days' | '1 Week'>('2 Days');
  const [dueTime, setDueTime] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Evening');
  const [deliveryType, setDeliveryType] = useState<'Self Pickup' | 'Home Delivery'>('Home Delivery');

  // Urgent & Express Toggles
  const [isUrgent, setIsUrgent] = useState(false);
  const [expressSLA, setExpressSLA] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Partial' | 'POD' | 'Bank' | 'Paid' | 'Unpaid'>('UPI');
  const [partialAmountInput, setPartialAmountInput] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Success Modal State
  const [createdOrder, setCreatedOrder] = useState<ManualOrder | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Toggle quantity
  const handleUpdateQty = (serviceId: string, delta: number) => {
    setSelectedServices((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      }
      return { ...prev, [serviceId]: next };
    });
  };

  // Price Calculation
  const selectedOrderItems: OrderItem[] = Object.keys(selectedServices).map((id) => {
    const srv = allServices.find((s) => s.id === id)!;
    const qty = selectedServices[id];
    const unitPrice = expressSLA ? Math.round(srv.price * srv.expressPriceMultiplier) : srv.price;
    return {
      serviceId: srv.id,
      serviceName: srv.name,
      qty,
      unit: srv.unit,
      pricePerUnit: unitPrice,
      totalPrice: qty * unitPrice,
    };
  });

  const totalAmount = selectedOrderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  let paidAmount = 0;
  if (paymentMethod === 'UPI' || paymentMethod === 'Cash' || paymentMethod === 'Paid' || paymentMethod === 'Bank') {
    paidAmount = totalAmount;
  } else if (paymentMethod === 'Partial') {
    paidAmount = Math.min(totalAmount, parseFloat(partialAmountInput) || 0);
  } else {
    paidAmount = 0;
  }
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // WhatsApp Receipt Helper
  const sendWhatsAppReceipt = (savedOrder: ManualOrder) => {
    const itemsList = savedOrder.items
      .map((i) => `• ${i.serviceName} (${i.qty} ${i.unit}) - ₹${i.totalPrice}`)
      .join('\n');

    const receiptMsg =
      `*🧺 ${savedOrder.societyName ? savedOrder.societyName + ' - ' : ''}${shopDisplayName} Receipt*\n` +
      `----------------------------------------\n` +
      `*Order ID:* ${savedOrder.id}\n` +
      `*Customer:* ${savedOrder.customerName}\n` +
      `*Phone:* ${savedOrder.mobile}\n` +
      `*Address:* ${savedOrder.address}\n` +
      `----------------------------------------\n` +
      `*Services Requested:*\n` +
      `${itemsList}\n` +
      `----------------------------------------\n` +
      `*Total Bill:* ₹${savedOrder.totalAmount}\n` +
      `*Payment Mode:* ${savedOrder.paymentMethod}\n` +
      `*Amount Paid:* ₹${savedOrder.paidAmount} (${savedOrder.paymentStatus})\n` +
      `*Due Balance:* ₹${savedOrder.remainingAmount}\n` +
      `*Expected Due:* ${savedOrder.dueDate} (${savedOrder.dueTime})\n` +
      `*Delivery Mode:* ${savedOrder.deliveryType}\n` +
      `----------------------------------------\n` +
      `Thank you for choosing ${shopDisplayName}! 💙`;

    const encoded = encodeURIComponent(receiptMsg);
    const cleanPhone = savedOrder.mobile.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const appUrl = `whatsapp://send?phone=${formattedPhone}&text=${encoded}`;
    const webUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;

    Linking.openURL(appUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert(
          'Receipt Generated 📱',
          `Order #${savedOrder.id} saved for ${savedOrder.customerName}.\nDirect WhatsApp link: https://wa.me/${formattedPhone}`
        );
      });
    });
  };

  // Handle Save Order
  const handleSaveOrder = (sendWhatsApp: boolean = false) => {
    if (selectedOrderItems.length === 0) {
      Alert.alert('Select Service', 'Please select at least one service/item for the order.');
      return;
    }

    const newOrderData = {
      customerName: step1Data.customerName,
      mobile: step1Data.mobile,
      societyName: step1Data.societyName,
      tower: step1Data.tower,
      flat: step1Data.flat,
      address: step1Data.address,
      items: selectedOrderItems,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentMethod,
      paymentStatus: (remainingAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid') as any,
      deliveryType,
      dueDate,
      dueTime,
      isUrgent,
      expressSLA,
      notes: notes.trim(),
    };

    const savedOrder = mockDataStore.createOrder(newOrderData, currentShop?.id);
    setCreatedOrder(savedOrder);

    if (sendWhatsApp) {
      sendWhatsAppReceipt(savedOrder);
    }

    setShowSuccessModal(true);
  };

  const handleFinishSuccess = () => {
    setShowSuccessModal(false);
    if (createdOrder) {
      navigation.navigate('OrderDetail', { orderId: createdOrder.id, orderObj: createdOrder });
    } else {
      navigation.navigate('OwnerTabs', { screen: 'Orders' });
    }
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Order</Text>
            <Text style={styles.stepIndicator}>Step 2 of 2 - Service & Schedule</Text>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeTxt}>2 / 2</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {/* Customer Summary Banner */}
          <View style={styles.custBanner}>
            <Text style={styles.custBannerName}>👤 {step1Data.customerName} ({step1Data.mobile})</Text>
            <Text style={styles.custBannerAddress}>📍 {step1Data.address}</Text>
          </View>

          {/* 13. QUICK PRICE PREVIEW */}
          <AppCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Quick Price Preview</Text>
              <Text style={styles.previewTotal}>₹{totalAmount}</Text>
            </View>
            <Text style={styles.previewNote}>
              Add approximate item count now or leave blank. Final bill can still be adjusted while marking ready.
            </Text>
          </AppCard>

          {/* 14 & 15. SERVICE SELECTION & RECOMMENDATIONS */}
          <AppCard style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Select Service(s)</Text>
              {recommendedServices.length > 0 && (
                <View style={styles.recBadge}>
                  <Text style={styles.recTxt}>⭐ Recommended for {step1Data.societyName.split(' ')[0]}</Text>
                </View>
              )}
            </View>

            {allServices.map((srv) => {
              const qty = selectedServices[srv.id] || 0;
              const isRec = recommendedServices.some((r) => r.id === srv.id);
              return (
                <View key={srv.id} style={[styles.srvRow, qty > 0 && styles.srvRowActive]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.srvName}>{srv.name}</Text>
                      {isRec && (
                        <View style={styles.miniTag}>
                          <Text style={styles.miniTagTxt}>Most Used</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.srvPrice}>
                      ₹{expressSLA ? Math.round(srv.price * srv.expressPriceMultiplier) : srv.price} / {srv.unit}
                    </Text>
                  </View>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleUpdateQty(srv.id, -1)}
                    >
                      <Text style={styles.stepBtnTxt}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyTxt}>{qty}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleUpdateQty(srv.id, 1)}
                    >
                      <Text style={styles.stepBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </AppCard>

          {/* 16 & 17. EXPECTED DUE DATE & TIME */}
          <AppCard style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Expected Due Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {(['Tomorrow', '2 Days', '3 Days', '5 Days', '1 Week'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, dueDate === d && styles.chipActive]}
                  onPress={() => setDueDate(d)}
                >
                  <Text style={[styles.chipTxt, dueDate === d && styles.chipTxtActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Expected Due Time Slot</Text>
            <View style={styles.timeGrid}>
              {(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, dueTime === t && styles.timeChipActive]}
                  onPress={() => setDueTime(t)}
                >
                  <Text style={[styles.timeTxt, dueTime === t && styles.timeTxtActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>

          {/* 18. DELIVERY TYPE */}
          <AppCard style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Delivery Type</Text>
            <View style={styles.delivGrid}>
              {(['Self Pickup', 'Home Delivery'] as const).map((dt) => (
                <TouchableOpacity
                  key={dt}
                  style={[styles.delivCard, deliveryType === dt && styles.delivCardActive]}
                  onPress={() => setDeliveryType(dt)}
                >
                  <Text style={styles.delivIcon}>{dt === 'Self Pickup' ? '🏃‍♂️' : '🛵'}</Text>
                  <Text style={[styles.delivTxt, deliveryType === dt && styles.delivTxtActive]}>
                    {dt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>

          {/* 19 & 20. URGENT & EXPRESS SLA TOGGLES */}
          <AppCard style={styles.sectionCard}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>🔥 Mark as Urgent</Text>
                <Text style={styles.toggleSub}>Move to top of processing queue</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ false: COLORS.border, true: COLORS.warning + '80' }}
                thumbColor={isUrgent ? COLORS.warning : COLORS.textLight}
              />
            </View>

            <View style={[styles.toggleRow, { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>⚡ Express SLA</Text>
                <Text style={styles.toggleSub}>Auto-suggests faster due date & express pricing</Text>
              </View>
              <Switch
                value={expressSLA}
                onValueChange={setExpressSLA}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                thumbColor={expressSLA ? COLORS.primary : COLORS.textLight}
              />
            </View>
          </AppCard>

          {/* 21. PAYMENT METHOD */}
          <AppCard style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Payment Mode</Text>
            <View style={styles.payGrid}>
              {(['UPI', 'Cash'] as const).map((pm) => (
                <TouchableOpacity
                  key={pm}
                  style={[styles.payChip, paymentMethod === pm && styles.payChipActive]}
                  onPress={() => setPaymentMethod(pm)}
                >
                  <Text style={[styles.payTxt, paymentMethod === pm && styles.payTxtActive]}>{pm}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethod === 'Partial' && (
              <View style={{ marginTop: SPACING.md }}>
                <AppInput
                  label="Amount Received Now (₹) *"
                  placeholder="e.g. 200"
                  keyboardType="numeric"
                  value={partialAmountInput}
                  onChangeText={setPartialAmountInput}
                />
                <View style={styles.balanceRow}>
                  <Text style={styles.balLbl}>Total: ₹{totalAmount}</Text>
                  <Text style={styles.balLbl}>Paid: ₹{paidAmount}</Text>
                  <Text style={[styles.balLbl, { color: COLORS.error, fontFamily: FONTS.bold }]}>
                    Remaining: ₹{remainingAmount}
                  </Text>
                </View>
              </View>
            )}
          </AppCard>

          {/* 22. NOTES */}
          <AppCard style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <AppInput
              placeholder="Handle with care, stain on collar..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </AppCard>
        </ScrollView>

        {/* 23 & 24. SAVE BUTTONS FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveOutlineBtn}
            onPress={() => handleSaveOrder(false)}
          >
            <Text style={styles.saveOutlineTxt}>Save Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveWhatsAppBtn}
            onPress={() => handleSaveOrder(true)}
          >
            <Text style={styles.saveWhatsAppTxt}>WhatsApp Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* 25. ORDER CREATED SUCCESS MODAL */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconBox}>
                <Text style={styles.successIcon}>🎉</Text>
              </View>
              <Text style={styles.successTitle}>Order Created Successfully!</Text>

              {createdOrder && (
                <View style={styles.orderSummaryBox}>
                  <Text style={styles.sumId}>Order ID: {createdOrder.id}</Text>
                  <Text style={styles.sumCust}>{createdOrder.customerName}</Text>
                  <Text style={styles.sumDetails}>
                    {createdOrder.items.length} Service(s) • Total: ₹{createdOrder.totalAmount}
                  </Text>
                  <Text style={styles.sumDue}>Due: {createdOrder.dueDate} ({createdOrder.dueTime})</Text>
                </View>
              )}

              <AppButton
                title="View Order Details ➔"
                onPress={handleFinishSuccess}
                style={styles.modalFinishBtn}
              />
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
  backBtn: { paddingRight: SPACING.md },
  backTxt: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  stepIndicator: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  stepBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
  },
  stepBadgeTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primaryDark },
  container: { padding: SPACING.lg, paddingBottom: 120 },
  custBanner: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.lg,
  },
  custBannerName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primaryDark },
  custBannerAddress: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  previewCard: {
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  previewTotal: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.white },
  previewNote: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primaryLight,
    marginTop: SPACING.xs,
  },
  sectionCard: { marginBottom: SPACING.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  recBadge: { backgroundColor: COLORS.success + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.radius_full },
  recTxt: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.success },
  srvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  srvRowActive: { backgroundColor: COLORS.primaryLight + '30' },
  srvName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  srvPrice: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  miniTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  miniTagTxt: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.primaryDark },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnTxt: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primaryDark },
  qtyTxt: { fontFamily: FONTS.bold, fontSize: 16, minWidth: 24, textAlign: 'center' },
  fieldLabel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: SPACING.xs },
  chipRow: { flexDirection: 'row' },
  chip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginRight: SPACING.xs,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  chipTxtActive: { fontFamily: FONTS.bold, color: COLORS.white },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  timeChip: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  timeTxtActive: { fontFamily: FONTS.bold, color: COLORS.white },
  delivGrid: { flexDirection: 'row', gap: SPACING.md },
  delivCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  delivCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  delivIcon: { fontSize: 24, marginBottom: 4 },
  delivTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  delivTxtActive: { fontFamily: FONTS.bold, color: COLORS.primaryDark },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  toggleSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  payGrid: { flexDirection: 'row', gap: SPACING.xs },
  payChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  payChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  payTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  payTxtActive: { fontFamily: FONTS.bold, color: COLORS.white },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  balLbl: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveOutlineBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  saveOutlineTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
  saveWhatsAppBtn: {
    flex: 1.5,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.success,
    alignItems: 'center',
  },
  saveWhatsAppTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  successIcon: { fontSize: 32 },
  successTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  orderSummaryBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sumId: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  sumCust: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginTop: 2 },
  sumDetails: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sumDue: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.success, marginTop: 4 },
  modalFinishBtn: { width: '100%', backgroundColor: COLORS.primary },
});
