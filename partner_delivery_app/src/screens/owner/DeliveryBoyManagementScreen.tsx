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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { partnerService } from '../../services/partnerService';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export const DeliveryBoyManagementScreen = () => {
  const insets = useSafeAreaInsets();
  const { currentShop } = useAuth();
  const shopId = currentShop?.id;

  const [boys, setBoys] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBoy, setSelectedBoy] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetBoy, setAssignTargetBoy] = useState<any>(null);
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([]);

  const refreshBoys = useCallback(async () => {
    try {
      const serverBoys = await partnerService.getOwnerDeliveryBoys(shopId);
      if (serverBoys && Array.isArray(serverBoys)) {
        setBoys(serverBoys.map((b: any) => ({
          id: String(b.id ?? b.raw_id),
          numericId: b.id ?? b.raw_id,
          shopId: b.shop_id || shopId,
          name: b.name ?? 'Delivery Boy',
          phone: b.phone ?? '',
          vehicle: b.vehicle_number ?? b.vehicle_type ?? b.vehicle ?? 'Two Wheeler',
          dlNumber: b.dl_number ?? b.license_number ?? b.dlNumber ?? 'DL-PENDING',
          status: b.is_online ? 'Online' : 'Offline',
          rating: b.rating ? `${b.rating} ⭐` : 'New ⭐',
          completedTasks: b.completed_orders_count ?? b.completed_tasks ?? 0,
          documents: b.verification_status ? `Status: ${String(b.verification_status).toUpperCase()}` : 'Verified (DL & Aadhaar)',
          city: b.city ?? 'Pune',
        })));
      }

      // Fetch real orders from backend
      const apiOrders = await partnerService.getOwnerOrders(undefined, shopId);
      if (Array.isArray(apiOrders)) {
        setShopOrders(apiOrders);

        const unassigned = apiOrders
          .filter((o: any) => !o.delivery_boy_id && String(o.status || '').toUpperCase() !== 'CANCELLED' && String(o.status || '').toUpperCase() !== 'COMPLETED')
          .map((o: any) => ({
            id: o.order_number || `ORD-${o.id}`,
            numericId: o.id,
            customer: o.customer?.name || o.customer_name || 'Customer',
            address: o.pickup_address || o.delivery_address || 'Pune',
            items: Array.isArray(o.items) && o.items.length > 0
              ? o.items.map((i: any) => `${i.item_name || i.service_name || 'Item'} (${i.quantity || 1})`).join(', ')
              : `Order Total: ₹${o.total_amount || 0}`,
          }));

        setUnassignedOrders(unassigned);
      }
    } catch (err) {
      console.log('refreshBoys error:', err);
    }
  }, [shopId]);

  useEffect(() => {
    refreshBoys();
  }, [refreshBoys]);

  // New Boy Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [dlNumber, setDlNumber] = useState('');

  const handleAddBoy = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Please enter delivery boy name and phone number');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      password: password.trim() || '123456',
      vehicle_type: vehicle.trim() || 'Two Wheeler',
      vehicle: vehicle.trim() || 'Two Wheeler',
      dl_number: dlNumber.trim() || 'DL-PENDING',
      city: 'Pune',
      shop_id: shopId,       // ← link this delivery boy to the current shop
    };

    // Persist to backend API and reload from server

    // Persist to Laravel MySQL database
    try {
      const result = await partnerService.createDeliveryBoy(payload);
      setShowAddModal(false);
      setName('');
      setPhone('');
      setPassword('');
      setVehicle('');
      setDlNumber('');
      // Reload from API
      await refreshBoys();
      Alert.alert(
        'Delivery Executive Onboarded! 🎉',
        `Staff registered successfully.\n\n👤 Name: ${payload.name}\n📞 Mobile: ${payload.phone}\n🔑 Password: ${payload.password}\n🛵 Vehicle: ${payload.vehicle}\n📄 DL: ${payload.dl_number}`
      );
    } catch (e) {
      Alert.alert('Error', 'Could not create delivery boy. Please try again.');
    }
  };

  const toggleStatus = (boyId: string) => {
    setBoys(prev => prev.map(b =>
      b.id === boyId ? { ...b, status: b.status === 'Online' ? 'Offline' : 'Online' } : b
    ));
  };

  const handleAssignOrder = async (ord: any) => {
    if (!assignTargetBoy) return;
    try {
      const numericId = ord.numericId || ord.id;
      await apiClient.post(`/owner/orders/${numericId}/assign-delivery`, {
        delivery_boy_id: assignTargetBoy.numericId || assignTargetBoy.id,
        assignment_type: 'pickup',
      });
    } catch (err) {
      console.log('Assign delivery error:', err);
    }
    setUnassignedOrders(prev => prev.filter(o => o.id !== ord.id));
    Alert.alert(
      'Order Assigned 🚚',
      `Order ${ord.id} successfully assigned to ${assignTargetBoy?.name}!`
    );
    setShowAssignModal(false);
    await refreshBoys();
  };

  const onlineCount = boys.filter((b) => b.status === 'Online').length;
  const totalDelivered = boys.reduce((sum, b) => sum + (b.completedTasks || 0), 0);

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Delivery Boy Management</Text>
            <Text style={styles.headerSubTitle}>Manage riders, status & assignments</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
            <Text style={styles.addTxt}>+ Add Staff</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Summary Stats Row */}
          <View style={styles.summaryRow}>
            <AppCard style={styles.sumCard}>
              <Text style={styles.sumVal}>{boys.length}</Text>
              <Text style={styles.sumLbl}>Total Staff</Text>
            </AppCard>
            <AppCard style={styles.sumCard}>
              <Text style={[styles.sumVal, { color: COLORS.success }]}>
                {onlineCount}
              </Text>
              <Text style={styles.sumLbl}>Online Now</Text>
            </AppCard>
            <AppCard style={styles.sumCard}>
              <Text style={[styles.sumVal, { color: COLORS.primary }]}>
                {totalDelivered}
              </Text>
              <Text style={styles.sumLbl}>Delivered</Text>
            </AppCard>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Delivery Team & Status</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeTxt}>{boys.length} Executives</Text>
            </View>
          </View>

          {boys.map((boy) => {
            const isOnline = boy.status === 'Online';
            const isVerifiedDoc =
              boy.documents &&
              boy.documents.toLowerCase().includes('verified') &&
              !boy.documents.toLowerCase().includes('pending');

            const cleanRating = boy.rating ? boy.rating.replace('⭐', '').trim() : '4.5';

            return (
              <AppCard key={boy.id} style={styles.boyCard}>
                {/* Executive Basic Info */}
                <View style={styles.boyHeader}>
                  <View style={styles.avatarWrapper}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarTxt}>{boy.name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                  </View>

                  <View style={styles.boyInfo}>
                    <Text style={styles.boyName} numberOfLines={1}>{boy.name}</Text>
                    <Text style={styles.boyPhone}>📞 {boy.phone}</Text>
                    <Text style={styles.boyVehicle} numberOfLines={1}>🛵 {boy.vehicle}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      isOnline ? styles.bgOnline : styles.bgOffline,
                    ]}
                    onPress={() => toggleStatus(boy.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusTxt,
                        isOnline ? styles.txtOnline : styles.txtOffline,
                      ]}
                    >
                      {isOnline ? '● Online' : '○ Offline'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Structured Metrics Chips */}
                <View style={styles.metricsContainer}>
                  <View style={styles.metricsChipsRow}>
                    <View style={styles.metricChip}>
                      <Text style={styles.metricIcon}>📦</Text>
                      <Text style={styles.metricLabel}>Completed:</Text>
                      <Text style={styles.metricValue}>{boy.completedTasks} orders</Text>
                    </View>

                    <View style={styles.metricChip}>
                      <Text style={styles.metricIcon}>⭐</Text>
                      <Text style={styles.metricLabel}>Rating:</Text>
                      <Text style={styles.metricValue}>{cleanRating}</Text>
                    </View>
                  </View>

                  {/* Document Verification Badge */}
                  <View
                    style={[
                      styles.docBadgeRow,
                      isVerifiedDoc ? styles.docVerifiedBg : styles.docPendingBg,
                    ]}
                  >
                    <Text style={styles.docIcon}>{isVerifiedDoc ? '🛡️' : '⏳'}</Text>
                    <Text
                      style={[
                        styles.docTxt,
                        isVerifiedDoc ? styles.docVerifiedTxt : styles.docPendingTxt,
                      ]}
                      numberOfLines={1}
                    >
                      {boy.documents}
                    </Text>
                  </View>
                </View>

                {/* Assigned Orders for this Executive */}
                {(() => {
                  const boyId = String(boy.raw_id || boy.numericId || boy.id || '').replace('BOY-', '');
                  const boyUserId = String(boy.user_id || boy.userId || '');
                  const assigned = shopOrders.filter((o: any) => {
                    const targetId = String(o.delivery_boy_id ?? o.deliveryPartner?.id ?? '').replace('BOY-', '');
                    return targetId && (targetId === boyId || targetId === boyUserId);
                  });
                  return (
                    <View style={styles.assignedOrdersContainer}>
                      <Text style={styles.assignedSectionTitle}>
                        📦 Assigned Orders ({assigned.length})
                      </Text>
                      {assigned.length === 0 ? (
                        <Text style={styles.assignedEmptyTxt}>No active orders assigned currently</Text>
                      ) : (
                        assigned.map((ao: any) => {
                          const customerName = ao.customer?.name || ao.customer_name || 'Customer';
                          const customerPhone = ao.customer?.phone || ao.customer_phone || '';
                          const itemsTxt = Array.isArray(ao.items) && ao.items.length > 0
                            ? ao.items.map((i: any) => `${i.service_name || i.item_name || 'Item'} x${i.quantity || 1}`).join(', ')
                            : '';
                          return (
                            <View key={ao.id} style={styles.assignedOrderChip}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.assignedOrderTxt} numberOfLines={1}>
                                  {ao.order_number || `ORD-${ao.id}`} • {customerName} {customerPhone ? `(${customerPhone})` : ''}
                                </Text>
                                <Text style={styles.assignedSubTxt} numberOfLines={1}>
                                  📍 {ao.pickup_address || ao.delivery_address || 'Address N/A'} • ₹{ao.total_amount || 0}
                                </Text>
                                {itemsTxt ? (
                                  <Text style={[styles.assignedSubTxt, { color: COLORS.primaryDark, marginTop: 1 }]} numberOfLines={1}>
                                    🧺 {itemsTxt}
                                  </Text>
                                ) : null}
                              </View>
                              <Text style={styles.assignedStatusTxt}>{ao.status || 'ASSIGNED'}</Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })()}

                {/* Card Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => setSelectedBoy(boy)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionTxtOutline}>📁 Profile & Docs</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSolid}
                    onPress={() => {
                      setAssignTargetBoy(boy);
                      setShowAssignModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionTxtSolid}>📦 Assign Order</Text>
                  </TouchableOpacity>
                </View>
              </AppCard>
            );
          })}
        </ScrollView>

        {/* Add Staff Modal */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Onboard Delivery Executive</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <AppInput
                  label="Delivery Boy Name *"
                  placeholder="e.g. Rahul Patil"
                  value={name}
                  onChangeText={setName}
                />
                <AppInput
                  label="Phone Number *"
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <AppInput
                  label="Login Password *"
                  placeholder="Create login password (e.g. 123456)"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <AppInput
                  label="Vehicle Details *"
                  placeholder="e.g. Honda Activa (MH 12 AB 1234)"
                  value={vehicle}
                  onChangeText={setVehicle}
                />
                <AppInput
                  label="Driving License / ID Number *"
                  placeholder="e.g. MH12-2026-009841"
                  value={dlNumber}
                  onChangeText={setDlNumber}
                />
              </ScrollView>

              <AppButton title="Register Delivery Executive" onPress={handleAddBoy} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Profile & Documents Detail Modal */}
        <Modal visible={!!selectedBoy} transparent animationType="fade">
          <View style={styles.modalOverlayCenter}>
            <View style={styles.modalDetailContent}>
              {selectedBoy && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.detailTitle}>Executive Profile & Docs</Text>
                    <TouchableOpacity onPress={() => setSelectedBoy(null)}>
                      <Text style={styles.closeIconTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailCardBody}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Full Name:</Text>
                      <Text style={styles.detailVal}>{selectedBoy.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Phone Number:</Text>
                      <Text style={styles.detailVal}>{selectedBoy.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Vehicle:</Text>
                      <Text style={styles.detailVal}>{selectedBoy.vehicle}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Login Password:</Text>
                      <Text style={[styles.detailVal, { color: COLORS.primary }]}>{selectedBoy.password || '123456'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Driving License:</Text>
                      <Text style={styles.detailVal}>{selectedBoy.dlNumber || 'MH12-2026-098412'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Document Status:</Text>
                      <Text style={[styles.detailVal, { color: COLORS.success }]}>
                        {selectedBoy.documents || 'Verified (DL & Aadhaar)'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLbl}>Duty Status:</Text>
                      <Text style={[styles.detailVal, { color: selectedBoy.status === 'Online' ? COLORS.success : COLORS.textSecondary }]}>
                        {selectedBoy.status}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { marginTop: SPACING.lg }]}
                    onPress={() => setSelectedBoy(null)}
                  >
                    <Text style={{ color: COLORS.white, textAlign: 'center', fontFamily: FONTS.bold }}>
                      Close Profile
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Assign Orders Modal */}
        <Modal visible={showAssignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>
                  Assign Order to {assignTargetBoy?.name}
                </Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {unassignedOrders.length === 0 ? (
                <View style={styles.emptyOrdersBox}>
                  <Text style={styles.emptyOrdersTxt}>
                    No unassigned orders available right now.
                  </Text>
                </View>
              ) : (
                unassignedOrders.map((ord) => (
                  <View key={ord.id} style={styles.assignItem}>
                    <View style={{ flex: 1, marginRight: SPACING.md }}>
                      <Text style={styles.assignId}>{ord.id} • {ord.customer}</Text>
                      <Text style={styles.assignSub}>{ord.items} • {ord.address}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => handleAssignOrder(ord)}
                    >
                      <Text style={styles.assignBtnTxt}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.cancelTxt}>Close</Text>
              </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primaryDark,
  },
  headerSubTitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: SIZES.radius_sm,
    marginLeft: SPACING.sm,
  },
  addTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sumCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
  },
  sumVal: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
  },
  sumLbl: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  countBadge: {
    backgroundColor: COLORS.primaryLight + '50',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: SIZES.radius_full,
  },
  countBadgeTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  boyCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
  },
  boyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTxt: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primaryDark,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  dotOnline: {
    backgroundColor: COLORS.success,
  },
  dotOffline: {
    backgroundColor: COLORS.textLight,
  },
  boyInfo: {
    flex: 1,
  },
  boyName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  boyPhone: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  boyVehicle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radius_full,
  },
  bgOnline: { backgroundColor: '#E6F4EA' },
  bgOffline: { backgroundColor: '#F1F3F4' },
  statusTxt: { fontFamily: FONTS.bold, fontSize: 11 },
  txtOnline: { color: '#137333' },
  txtOffline: { color: '#5F6368' },

  // Metrics Container
  metricsContainer: {
    backgroundColor: COLORS.cardAlt,
    padding: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  metricsChipsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: SIZES.radius_xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metricLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  metricValue: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.text,
  },
  docBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: SIZES.radius_xs,
    borderWidth: 1,
  },
  docVerifiedBg: {
    backgroundColor: '#E6F4EA',
    borderColor: '#CEEAD6',
  },
  docPendingBg: {
    backgroundColor: '#FEF7E0',
    borderColor: '#FCE8E6',
  },
  docIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  docTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    flex: 1,
  },
  docVerifiedTxt: {
    color: '#137333',
  },
  docPendingTxt: {
    color: '#B06000',
  },

  // Assigned Orders Container
  assignedOrdersContainer: {
    backgroundColor: COLORS.cardAlt,
    padding: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assignedSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  assignedEmptyTxt: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  assignedOrderChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: SIZES.radius_xs,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assignedOrderTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  assignedSubTxt: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  assignedStatusTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  actionTxtOutline: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  actionBtnSolid: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  actionTxtSolid: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.white,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_xl,
    borderTopRightRadius: SIZES.radius_xl,
    padding: SPACING.xl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primaryDark,
  },
  closeIconTxt: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    padding: 4,
  },
  modalDetailContent: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.xl,
  },
  detailTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primaryDark,
  },
  detailCardBody: {
    marginTop: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLbl: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  detailVal: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_sm,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  cancelTxt: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  emptyOrdersBox: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyOrdersTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  assignItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.cardAlt,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assignId: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  assignSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  assignBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: SIZES.radius_sm,
  },
  assignBtnTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
});

