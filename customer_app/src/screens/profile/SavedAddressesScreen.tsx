import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AppScreen from '../../components/AppScreen';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { Address } from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateProfile } from '../../store/authSlice';
import { addressService } from '../../services/addressService';
import Toast from 'react-native-toast-message';
import { SkeletonLoader } from '../../components/SkeletonLoader';

export const SavedAddressesScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Address Form
  const [label, setLabel] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, [user?.address]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      const list = [...data];

      if (user?.address) {
        const hasUserAddr = list.some(a => a.address_line1 === user.address);
        if (!hasUserAddr) {
          list.unshift({
            id: 999,
            label: 'Home',
            full_address: user.address,
            address_line1: user.address,
            city: user.city || 'Pune',
            state: 'Maharashtra',
            pincode: user.pincode || '411057',
            is_default: true,
          } as any);
        }
      }

      setAddresses(list);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load addresses' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressLine1 || !city || !pincode) {
      Toast.show({ type: 'error', text1: 'Please fill required fields' });
      return;
    }

    setSaving(true);
    try {
      const newAddress = await addressService.addAddress({
        label: label || 'Home',
        address_line1: addressLine1,
        address_line2: '',
        city,
        state: state || 'Default',
        pincode,
        country: 'India',
        latitude: 0,
        longitude: 0,
      });
      setAddresses([newAddress, ...addresses]);
      setShowAddModal(false);
      setLabel('');
      setAddressLine1('');
      setCity('');
      setState('');
      setPincode('');
      Toast.show({ type: 'success', text1: 'Address saved!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save address' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressService.deleteAddress(id);
            setAddresses(addresses.filter(a => a.id !== id));
            Toast.show({ type: 'success', text1: 'Address removed' });
          } catch {
            Toast.show({ type: 'error', text1: 'Could not delete address' });
          }
        },
      }
    ]);
  };

  const handleSelectAddress = (item: Address) => {
    dispatch(
      updateProfile({
        address: item.address_line1,
        city: item.city,
        pincode: item.pincode,
      })
    );
    Toast.show({
      type: 'success',
      text1: 'Address Selected as Active! 📍',
      text2: item.address_line1,
    });
    navigation.navigate('MainTabs', { screen: 'ProfileTab' });
  };

  const renderItem = ({ item }: { item: Address }) => (
    <TouchableOpacity
      style={[styles.addressCard, { backgroundColor: colors.card, borderColor: item.is_default || item.address_line1 === user?.address ? '#321D8C' : colors.border }]}
      onPress={() => handleSelectAddress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardLabel, { color: colors.text }]}>{item.label}</Text>
        {(item.is_default || item.address_line1 === user?.address) && (
          <View style={[styles.badge, { backgroundColor: '#EDE8FF' }]}>
            <Text style={[styles.badgeText, { color: '#321D8C', fontWeight: '800' }]}>✓ Active</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cardText, { color: colors.textSecondary }]}>{item.address_line1}</Text>
      {item.address_line2 ? (
        <Text style={[styles.cardText, { color: colors.textSecondary }]}>{item.address_line2}</Text>
      ) : null}
      <Text style={[styles.cardText, { color: colors.textSecondary }]}>
        {item.city}, {item.state} {item.pincode}
      </Text>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MapScreen', { returnScreen: 'Profile' })}>
          <Text style={[styles.headerAction, { color: '#321D8C', fontWeight: '800' }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: SPACING.xl, gap: SPACING.md }}>
          {[1, 2, 3].map(i => <SkeletonLoader key={i} width="100%" height={120} borderRadius={SIZES.radius_md} />)}
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.xl }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Text style={{ fontSize: 40, marginBottom: SPACING.md }}>🏠</Text>
              <Text style={{ fontSize: 18, color: colors.text, fontWeight: '700' }}>No addresses found</Text>
              <Text style={{ color: colors.textSecondary, marginTop: SPACING.sm }}>
                Add an address to make booking easier
              </Text>
            </View>
          }
        />
      )}

      {/* Add Address Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: SPACING.md }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.backBtn}>
              <Text style={[styles.backIcon, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Address</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: SPACING.xl }}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Label (e.g., Home, Work)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={label}
              onChangeText={setLabel}
              placeholder="Home"
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Address Line 1 *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="House No., Street Name"
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>City *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.textLight}
            />

            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>State</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Pincode *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="000000"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.primary }]}
              onPress={handleSaveAddress}
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {saving ? 'Saving...' : 'Save Address'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerAction: { fontSize: 16, fontWeight: '700' },
  addressCard: {
    borderWidth: 1,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardText: {
    fontSize: 14,
    marginBottom: 2,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: SPACING.sm,
  },
  actionBtn: { padding: SPACING.xs, marginLeft: SPACING.lg },
  actionText: { fontSize: 14, fontWeight: '600' },
  modalRoot: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: SPACING.xxl,
    height: 50,
    borderRadius: SIZES.radius_full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SavedAddressesScreen;
