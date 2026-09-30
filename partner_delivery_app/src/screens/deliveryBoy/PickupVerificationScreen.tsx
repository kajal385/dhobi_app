import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { mockDataStore } from '../../services/mockDataStore';

// Service Categories & Preset Garment Catalog
const SERVICE_CATEGORIES = [
  {
    id: 'cat_wash_fold',
    name: 'Wash & Fold',
    icon: '🧺',
    items: [
      { id: 'cat_wf_1', name: 'T-Shirt (Wash & Fold)', price: 30 },
      { id: 'cat_wf_2', name: 'Jeans / Pants (Wash & Fold)', price: 45 },
      { id: 'cat_wf_3', name: 'Shorts / Lower (Wash & Fold)', price: 35 },
      { id: 'cat_wf_4', name: 'Single Bedsheet (Wash & Fold)', price: 60 },
      { id: 'cat_wf_5', name: 'Towel (Wash & Fold)', price: 30 },
      { id: 'cat_wf_6', name: 'Mixed Clothes (Per KG)', price: 80 },
    ],
  },
  {
    id: 'cat_wash_iron',
    name: 'Wash & Iron',
    icon: '👕',
    items: [
      { id: 'cat_wi_1', name: 'Formal Shirt (Wash & Iron)', price: 40 },
      { id: 'cat_wi_2', name: 'Formal Trousers (Wash & Iron)', price: 45 },
      { id: 'cat_wi_3', name: 'Kurta / Pyjama (Wash & Iron)', price: 70 },
      { id: 'cat_wi_4', name: 'Cotton Saree (Wash & Iron)', price: 100 },
      { id: 'cat_wi_5', name: 'Ladies Dress / Top (Wash & Iron)', price: 60 },
    ],
  },
  {
    id: 'cat_dry_clean',
    name: 'Dry Cleaning',
    icon: '👔',
    items: [
      { id: 'cat_dc_1', name: 'Suit (2 Piece) (Dry Clean)', price: 250 },
      { id: 'cat_dc_2', name: 'Blazer / Coat (Dry Clean)', price: 180 },
      { id: 'cat_dc_3', name: 'Silk Saree (Dry Clean)', price: 180 },
      { id: 'cat_dc_4', name: 'Heavy Gown / Lehenga (Dry Clean)', price: 350 },
      { id: 'cat_dc_5', name: 'Blanket / Quilt (Double)', price: 280 },
      { id: 'cat_dc_6', name: 'Winter Jacket', price: 200 },
    ],
  },
  {
    id: 'cat_steam_iron',
    name: 'Steam Iron',
    icon: '♨️',
    items: [
      { id: 'cat_si_1', name: 'Shirt / T-Shirt (Steam Iron)', price: 25 },
      { id: 'cat_si_2', name: 'Trousers / Jeans (Steam Iron)', price: 30 },
      { id: 'cat_si_3', name: 'Suit Coat (Steam Iron)', price: 90 },
      { id: 'cat_si_4', name: 'Silk Saree (Steam Iron)', price: 90 },
    ],
  },
  {
    id: 'cat_custom',
    name: 'Custom Item',
    icon: '✏️',
    items: [],
  },
];

// Official 7 Delivery Boy Task Statuses
export type DeliveryTaskStatus =
  | 'On The Way'
  | 'Reached'
  | 'Picked Up'
  | 'Delivered'
  | 'Unable To Reach'
  | 'Rescheduled'
  | 'Cancelled';

export const PickupVerificationScreen = ({ route }: any) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const task = route?.params?.task || {
    id: 'T-101',
    customer: 'Rahul Sharma',
    address: '123 Main St, Sector 4, Pune',
    phone: '+91 98765 11111',
  };

  const [pickupStatus, setPickupStatus] = useState<DeliveryTaskStatus>('On The Way');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryTaskStatus>('On The Way');

  // Dynamic Garments / Clothes Items List
  const [garments, setGarments] = useState([
    { id: 'g1', name: 'Suits (Dry Clean)', price: 350, qty: 2 },
    { id: 'g2', name: 'Shirts (Steam Press)', price: 25, qty: 3 },
    { id: 'g3', name: 'Heavy Jackets', price: 200, qty: 1 },
  ]);

  // Dynamic Extra Services & Custom Items List
  const [extraServices, setExtraServices] = useState([
    { id: 'es1', name: 'Stain Removal Treatment', price: 150, selected: false },
    { id: 'es2', name: 'Antiseptic & Softener Wash', price: 80, selected: false },
    { id: 'es3', name: 'Heavy Starch Polish', price: 60, selected: false },
  ]);

  // Category & Modal Selection State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState('cat_wash_fold');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  // Signature & Photo State
  const [signatureDone, setSignatureDone] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);

  // Dynamic Total Calculation
  const totalGarmentsQty = garments.reduce((sum, g) => sum + g.qty, 0);
  const garmentsSubtotal = garments.reduce((sum, g) => sum + g.qty * g.price, 0);
  const extraServicesTotal = extraServices
    .filter((es) => es.selected)
    .reduce((sum, es) => sum + es.price, 0);
  const totalBill = garmentsSubtotal + extraServicesTotal;

  // Stepper handlers
  const updateGarmentQty = (id: string, delta: number) => {
    setGarments(
      garments.map((g) => {
        if (g.id === id) {
          const newQty = Math.max(0, g.qty + delta);
          return { ...g, qty: newQty };
        }
        return g;
      })
    );
  };

  const removeGarment = (id: string) => {
    setGarments(garments.filter((g) => g.id !== id));
  };

  const toggleExtraService = (id: string) => {
    setExtraServices(
      extraServices.map((es) => (es.id === id ? { ...es, selected: !es.selected } : es))
    );
  };

  // Add Item from Catalog Category
  const handleAddCatalogItem = (itemName: string, itemPrice: number) => {
    const existing = garments.find((g) => g.name === itemName);
    if (existing) {
      updateGarmentQty(existing.id, 1);
    } else {
      const newItem = {
        id: `g_cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: itemName,
        price: itemPrice,
        qty: 1,
      };
      setGarments((prev) => [...prev, newItem]);
    }
    Alert.alert('Item Added 🧺', `Added ${itemName} (₹${itemPrice}) to pickup.`);
  };

  // Add Custom Garment Item
  const handleAddNewGarment = () => {
    if (!newItemName || !newItemPrice) {
      Alert.alert('Required', 'Please enter item name and unit price');
      return;
    }
    const priceNum = parseFloat(newItemPrice) || 0;
    const qtyNum = parseInt(newItemQty, 10) || 1;
    const newItem = {
      id: `g_custom_${Date.now()}`,
      name: newItemName,
      price: priceNum,
      qty: qtyNum,
    };
    setGarments([...garments, newItem]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
    setShowAddItemModal(false);
    Alert.alert('Item Added 👕', `Added ${newItemName} (₹${priceNum}) to order.`);
  };

  const handleVerifyOtp = () => {
    if (otp === '1234' || otp.length === 4) {
      setPickupStatus('Reached');
      setStep(2);
      Alert.alert('OTP Verified! ✅', 'Customer identity confirmed. Status updated to Reached.');
    } else {
      Alert.alert('Invalid OTP', 'Please enter 4-digit OTP provided by customer (Hint: 1234)');
    }
  };

  const handleCompletePickup = () => {
    setPickupStatus('Picked Up');
    mockDataStore.updateOrderStatus(task.id, 'Processing', `Cloth pickup completed. Total bill: ₹${totalBill}`);
    Alert.alert('Pickup Successful! 🎉', `Order ${task.id} picked up. Status automatically updated to Processing!`);
    navigation.goBack();
  };

  const handleApplyStatusUpdate = () => {
    setPickupStatus(selectedStatus);
    setShowStatusModal(false);
    if (selectedStatus === 'Picked Up') {
      mockDataStore.updateOrderStatus(task.id, 'Processing', 'Pickup completed by delivery partner');
    } else if (selectedStatus === 'Cancelled') {
      mockDataStore.updateOrderStatus(task.id, 'Cancelled', 'Pickup cancelled by delivery partner');
    } else {
      mockDataStore.updateOrderStatus(task.id, selectedStatus as any, `Pickup status changed to ${selectedStatus}`);
    }
    Alert.alert('Status Updated ⚡', `Task ${task.id} status changed to ${selectedStatus}`);
    if (selectedStatus === 'Cancelled' || selectedStatus === 'Rescheduled' || selectedStatus === 'Delivered' || selectedStatus === 'Picked Up') {
      navigation.goBack();
    }
  };

  const activeCategory = SERVICE_CATEGORIES.find((c) => c.id === activeCategoryKey) || SERVICE_CATEGORIES[0];

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Status Workflow</Text>
        </View>

        {/* Live Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusLabel}>
            Live Status: <Text style={styles.statusVal}>{pickupStatus}</Text>
          </Text>
          <TouchableOpacity style={styles.rescheduleBadge} onPress={() => setShowStatusModal(true)}>
            <Text style={styles.rescheduleBadgeTxt}>⚡ Update Status</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <AppCard style={styles.customerCard}>
            <Text style={styles.cardTag}>Task #{task.id}</Text>
            <Text style={styles.name}>{task.customer}</Text>
            <Text style={styles.phone}>📞 {task.phone}</Text>
            <Text style={styles.address}>📍 {task.address}</Text>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => Alert.alert('Maps Navigation 🗺️', 'Opening turn-by-turn directions on Google Maps...')}
            >
              <Text style={styles.mapTxt}>🗺️ Open Google Maps Navigation</Text>
            </TouchableOpacity>
          </AppCard>

          {/* STEP 1: Reached & OTP Verification */}
          {step === 1 && (
            <AppCard style={styles.stepCard}>
              <Text style={styles.stepTitle}>Step 1: Customer OTP Verification</Text>
              <Text style={styles.stepSub}>Ask the customer for the 4-digit Pickup OTP</Text>

              <AppInput
                label="Enter 4-Digit OTP *"
                placeholder="e.g. 1234"
                keyboardType="numeric"
                maxLength={4}
                value={otp}
                onChangeText={setOtp}
              />

              <AppButton
                title="Verify OTP & Reached Location"
                onPress={handleVerifyOtp}
                style={styles.primaryBtn}
              />
            </AppCard>
          )}

          {/* STEP 2: Quantity & Extra Service Adjustment */}
          {step === 2 && (
            <View>
              <View style={styles.stepHeaderRow}>
                <Text style={styles.sectionTitle}>Step 2: Adjust Garment Quantities & Services</Text>
                <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowAddItemModal(true)}>
                  <Text style={styles.addItemTxt}>+ Add Cloth / Item</Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Garments List Card */}
              <AppCard style={styles.qtyCard}>
                <Text style={styles.cardSectionHeader}>👕 Garments & Items List</Text>

                {garments.length === 0 ? (
                  <Text style={styles.emptyTxt}>No items added yet. Click "+ Add Cloth / Item" above.</Text>
                ) : (
                  garments.map((item) => (
                    <View key={item.id} style={styles.qtyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemPrice}>₹{item.price} / piece</Text>
                      </View>

                      <View style={styles.stepper}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => updateGarmentQty(item.id, -1)}>
                          <Text style={styles.stepBtnTxt}>-</Text>
                        </TouchableOpacity>

                        <Text style={styles.qtyTxt}>{item.qty}</Text>

                        <TouchableOpacity style={styles.stepBtn} onPress={() => updateGarmentQty(item.id, 1)}>
                          <Text style={styles.stepBtnTxt}>+</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeGarment(item.id)}>
                          <Text style={styles.removeTxt}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </AppCard>

              {/* Dynamic Extra Services Card */}
              <AppCard style={styles.extraCard}>
                <Text style={styles.cardSectionHeader}>✨ Extra Services & Treatments</Text>

                {extraServices.map((es) => (
                  <TouchableOpacity
                    key={es.id}
                    style={[styles.extraRow, es.selected && styles.extraRowActive]}
                    onPress={() => toggleExtraService(es.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.extraTitle}>{es.name}</Text>
                      <Text style={styles.extraPrice}>+₹{es.price}</Text>
                    </View>
                    <Text style={[styles.checkTxt, es.selected && styles.checkTxtActive]}>
                      {es.selected ? '✅ Added' : '➕ Add'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </AppCard>

              {/* Auto Updated Bill & Receipt Card */}
              <AppCard style={styles.billCard}>
                <Text style={styles.billTitle}>Auto Calculated Bill & Receipt</Text>
                <View style={styles.billRow}>
                  <Text style={styles.billLbl}>Total Garment Pieces:</Text>
                  <Text style={styles.billVal}>{totalGarmentsQty} Items</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLbl}>Garments Subtotal:</Text>
                  <Text style={styles.billVal}>₹{garmentsSubtotal}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLbl}>Extra Services Total:</Text>
                  <Text style={styles.billVal}>₹{extraServicesTotal}</Text>
                </View>
                <View style={[styles.billRow, { marginTop: SPACING.xs, paddingTop: SPACING.xs, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={styles.billLblBold}>Final Total Bill:</Text>
                  <Text style={styles.billTotal}>₹{totalBill}</Text>
                </View>
              </AppCard>

              {/* STEP 3: Verification & Confirmation */}
              <Text style={styles.sectionTitle}>Step 3: Verification & Confirmation</Text>
              <AppCard style={styles.verifyCard}>
                <TouchableOpacity
                  style={[styles.uploadBox, photoCaptured && styles.uploadBoxActive]}
                  onPress={() => {
                    setPhotoCaptured(true);
                    Alert.alert('Photo Captured 📸', 'Item condition photo proof attached.');
                  }}
                >
                  <Text style={styles.uploadIcon}>{photoCaptured ? '✅' : '📷'}</Text>
                  <Text style={styles.uploadTxt}>
                    {photoCaptured ? 'Item Photo Proof Captured' : 'Take Clothes Photo Proof'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadBox, signatureDone && styles.uploadBoxActive]}
                  onPress={() => {
                    setSignatureDone(true);
                    Alert.alert('Digital Signature ✍️', 'Customer signed digitally.');
                  }}
                >
                  <Text style={styles.uploadIcon}>{signatureDone ? '✍️' : '📝'}</Text>
                  <Text style={styles.uploadTxt}>
                    {signatureDone ? 'Customer Signature Verified' : 'Collect Customer Digital Signature'}
                  </Text>
                </TouchableOpacity>

                <AppButton
                  title="Complete Pickup Workflow 🚀"
                  onPress={handleCompletePickup}
                  style={styles.primaryBtn}
                />
              </AppCard>
            </View>
          )}
        </ScrollView>

        {/* Category-Based Add Garment / Item Modal */}
        <Modal visible={showAddItemModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '88%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Add Garment / Item</Text>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAddItemModal(false)}>
                  <Text style={styles.closeModalTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Category Selector Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catTabScroll}>
                {SERVICE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catTab, activeCategoryKey === cat.id && styles.catTabActive]}
                    onPress={() => setActiveCategoryKey(cat.id)}
                  >
                    <Text style={styles.catTabIcon}>{cat.icon}</Text>
                    <Text style={[styles.catTabTxt, activeCategoryKey === cat.id && styles.catTabTxtActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Catalog Items List under Selected Category */}
              {activeCategoryKey !== 'cat_custom' ? (
                <ScrollView style={styles.catalogList} nestedScrollEnabled>
                  <Text style={styles.catSectionLabel}>{activeCategory.icon} {activeCategory.name} Catalog:</Text>

                  {activeCategory.items.map((ci) => {
                    const existingGarment = garments.find((g) => g.name === ci.name);
                    const qtyInCart = existingGarment ? existingGarment.qty : 0;

                    return (
                      <View key={ci.id} style={styles.catalogItemCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.catalogItemName}>{ci.name}</Text>
                          <Text style={styles.catalogItemPrice}>₹{ci.price} / piece</Text>
                        </View>

                        {qtyInCart > 0 ? (
                          <View style={styles.stepper}>
                            <TouchableOpacity style={styles.stepBtn} onPress={() => updateGarmentQty(existingGarment!.id, -1)}>
                              <Text style={styles.stepBtnTxt}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyTxt}>{qtyInCart}</Text>
                            <TouchableOpacity style={styles.stepBtn} onPress={() => updateGarmentQty(existingGarment!.id, 1)}>
                              <Text style={styles.stepBtnTxt}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addCatalogBtn}
                            onPress={() => handleAddCatalogItem(ci.name, ci.price)}
                          >
                            <Text style={styles.addCatalogTxt}>+ Add Item</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                /* Custom Garment Form */
                <ScrollView style={styles.catalogList} nestedScrollEnabled>
                  <Text style={styles.catSectionLabel}>✏️ Add Custom Garment / Cloth:</Text>

                  <AppInput
                    label="Item / Cloth Name *"
                    placeholder="e.g. Silk Saree, Curtains, Jeans"
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />

                  <AppInput
                    label="Price per piece (₹) *"
                    placeholder="e.g. 150"
                    keyboardType="numeric"
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                  />

                  <AppInput
                    label="Quantity"
                    placeholder="1"
                    keyboardType="numeric"
                    value={newItemQty}
                    onChangeText={setNewItemQty}
                  />

                  <AppButton title="Add Custom Item" onPress={handleAddNewGarment} style={styles.primaryBtn} />
                </ScrollView>
              )}

              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowAddItemModal(false)}>
                <Text style={styles.doneBtnTxt}>Done Adding Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Official 7 Status Updates Modal */}
        {showStatusModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Task Status</Text>
              <Text style={styles.modalSub}>Select official delivery boy status update:</Text>

              {[
                { status: 'On The Way', icon: '🚚', desc: 'Navigating to customer location' },
                { status: 'Reached', icon: '📍', desc: 'Arrived at customer doorstep' },
                { status: 'Picked Up', icon: '🧺', desc: 'Clothes verified & picked up' },
                { status: 'Delivered', icon: '✅', desc: 'Clean clothes delivered to customer' },
                { status: 'Unable To Reach', icon: '📵', desc: 'Customer phone unreachable / door locked' },
                { status: 'Rescheduled', icon: '⏰', desc: 'Customer requested time slot change' },
                { status: 'Cancelled', icon: '❌', desc: 'Task cancelled by customer or admin' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.status}
                  style={[styles.reasonOption, selectedStatus === item.status && styles.reasonOptionActive]}
                  onPress={() => setSelectedStatus(item.status as DeliveryTaskStatus)}
                >
                  <Text style={[styles.reasonTxt, selectedStatus === item.status && styles.reasonTxtActive]}>
                    {item.icon} {item.status}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{item.desc}</Text>
                </TouchableOpacity>
              ))}

              <AppButton title="Apply Status Update ⚡" onPress={handleApplyStatusUpdate} style={styles.primaryBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  statusVal: { fontFamily: FONTS.bold, color: COLORS.primary },
  rescheduleBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rescheduleBadgeTxt: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.primaryDark },
  backBtn: { marginRight: SPACING.md },
  backTxt: { color: COLORS.primary, fontFamily: FONTS.medium, fontSize: 14 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  container: { padding: SPACING.lg },
  customerCard: { marginBottom: SPACING.lg },
  cardTag: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary, marginBottom: 4 },
  name: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  phone: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: 2 },
  address: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, marginBottom: SPACING.md },
  mapBtn: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  mapTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primaryDark },
  stepCard: { marginBottom: SPACING.lg },
  stepTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 2 },
  stepSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  primaryBtn: { backgroundColor: COLORS.primary, marginTop: SPACING.md },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, flex: 1 },
  addItemBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  addItemTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  qtyCard: { marginBottom: SPACING.md },
  cardSectionHeader: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primary, marginBottom: SPACING.sm },
  emptyTxt: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, paddingVertical: SPACING.sm },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  itemPrice: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnTxt: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primaryDark },
  qtyTxt: { fontFamily: FONTS.bold, fontSize: 15, minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4, marginLeft: 4 },
  removeTxt: { fontSize: 14 },
  extraCard: { marginBottom: SPACING.md },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.cardAlt,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  extraRowActive: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },
  extraTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  extraPrice: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  checkTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textSecondary },
  checkTxtActive: { color: COLORS.success },
  billCard: { backgroundColor: COLORS.primary, marginBottom: SPACING.lg },
  billTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, marginBottom: SPACING.sm },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billLbl: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryLight },
  billLblBold: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  billVal: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  billTotal: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  verifyCard: { marginBottom: SPACING.xl },
  uploadBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  uploadBoxActive: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },
  uploadIcon: { fontSize: 24, marginBottom: 4 },
  uploadTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.xl },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  closeModalBtn: { padding: 4 },
  closeModalTxt: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textSecondary },
  modalSub: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },

  // Category Selector Tabs
  catTabScroll: { flexDirection: 'row', marginBottom: SPACING.md },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  catTabIcon: { fontSize: 14, marginRight: 4 },
  catTabTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primaryDark },
  catTabTxtActive: { color: COLORS.white },

  // Catalog Item List
  catalogList: { maxHeight: 260 },
  catSectionLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary, marginBottom: SPACING.xs },
  catalogItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.cardAlt,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catalogItemName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  catalogItemPrice: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  addCatalogBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  addCatalogTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  doneBtn: { backgroundColor: COLORS.success, paddingVertical: 12, borderRadius: SIZES.radius_sm, alignItems: 'center', marginTop: SPACING.md },
  doneBtnTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },

  reasonOption: { padding: SPACING.md, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xs },
  reasonOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  reasonTxt: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  reasonTxtActive: { color: COLORS.primaryDark },
  cancelBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  cancelTxt: { fontFamily: FONTS.semiBold, color: COLORS.textSecondary },
});
