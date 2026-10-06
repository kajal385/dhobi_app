import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { useAuth } from '../../context/AuthContext';



export const ServiceManagementScreen = () => {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const { user } = useAuth();
  const shopId = user?.shop_id;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [shopId]);

  const fetchServices = async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await partnerService.getShopServices(shopId);
    setServices(data || []);
    setLoading(false);
  };

  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Dry Clean');
  const [pricingType, setPricingType] = useState('Piece Wise');
  const [price, setPrice] = useState('');
  const [expressCharge, setExpressCharge] = useState('');
  const [specialCharge, setSpecialCharge] = useState('');
  const [estTime, setEstTime] = useState('24 Hours');

  const toggleAvailability = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAvailable: !s.is_active } : s))
    );
  };

  
  const handleAddService = async () => {
    if (!name || !price || !shopId) {
      Alert.alert('Required Fields', 'Please fill in Service Name and Base Price');
      return;
    }
    
    // Attempt to map category to ID (hardcoded 1 for Wash & Fold, etc., or just pass string if API takes string name/id)
    // The API expects category_id. We'll pass 1 as default if category isn't matched
    let catId = 1;
    if (category === 'Dry Clean') catId = 2;
    if (category === 'Ironing') catId = 3;

    const payload = {
      shop_id: shopId,
      name,
      category_id: catId,
      price: parseFloat(price.replace(/[^0-9.]/g, '') || '0'),
      unit: pricingType === 'Piece Wise' ? 'piece' : 'KG',
    };
    
    const res = await partnerService.createShopService(payload);
    if (res?.success) {
      setShowAddModal(false);
      setName('');
      setPrice('');
      setExpressCharge('');
      setSpecialCharge('');
      fetchServices();
      Alert.alert('Success', 'New service added successfully!');
    } else {
      Alert.alert('Error', res?.message || 'Failed to add service');
    }
  };


  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Management</Text>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addBtnTxt}>+ Add Service</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {services.map((service) => (
          <AppCard key={service.id} style={styles.serviceCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.categoryTxt}>
                  {service.category} • {service.pricingType}
                </Text>
              </View>
              <Switch
                value={service.isAvailable}
                onValueChange={() => toggleAvailability(service.id)}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={service.isAvailable ? COLORS.primary : COLORS.textLight}
              />
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Base Rate</Text>
                <Text style={styles.detailVal}>{service.price}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Express Charge</Text>
                <Text style={styles.detailVal}>{service.expressCharge}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Est. Time</Text>
                <Text style={styles.detailVal}>{service.estTime}</Text>
              </View>
            </View>

            {service.specialCharge !== '₹0' && (
              <Text style={styles.specialTxt}>✨ Special Charge: {service.specialCharge}</Text>
            )}
          </AppCard>
        ))}
      </ScrollView>

      {/* Add Service Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: Math.max(SPACING.xl, insets.bottom + 36) },
            ]}
          >
            <Text style={styles.modalTitle}>Add New Laundry Service</Text>

            <AppInput
              label="Service Name *"
              placeholder="e.g. Silk Saree Dry Clean"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.tabRow}>
              {['Dry Clean', 'Wash & Fold', 'Ironing', 'Steam Press'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipTxt, category === cat && styles.chipTxtActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Pricing Model</Text>
            <View style={styles.tabRow}>
              {['Piece Wise', 'KG Wise'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, pricingType === type && styles.chipActive]}
                  onPress={() => setPricingType(type)}
                >
                  <Text style={[styles.chipTxt, pricingType === type && styles.chipTxtActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label="Base Price (₹) *"
              placeholder="e.g. 150"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <AppInput
              label="Express Delivery Charge (₹)"
              placeholder="e.g. 50"
              keyboardType="numeric"
              value={expressCharge}
              onChangeText={setExpressCharge}
            />
            <AppInput
              label="Special Charges (Stains / Delicate)"
              placeholder="e.g. 30"
              keyboardType="numeric"
              value={specialCharge}
              onChangeText={setSpecialCharge}
            />
            <AppInput
              label="Estimated Completion Time"
              placeholder="e.g. 12 Hours"
              value={estTime}
              onChangeText={setEstTime}
            />

            <View style={styles.modalActions}>
              <AppButton title="Save Service" onPress={handleAddService} style={styles.saveBtn} />
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
  },
  addBtnHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  addBtnTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  container: {
    padding: SPACING.lg,
  },
  serviceCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  serviceName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  categoryTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
  },
  detailCol: {
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  detailVal: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 2,
  },
  specialTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_lg,
    borderTopRightRadius: SIZES.radius_lg,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chipTxtActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  modalActions: {
    marginTop: SPACING.lg,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelModalBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  cancelTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
