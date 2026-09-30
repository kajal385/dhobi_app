import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';
import { mockDataStore, Society, Customer } from '../../services/mockDataStore';

export const NewOrderStep1Screen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Form State
  const [societySearch, setSocietySearch] = useState('');
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);
  const [showSocietyDropdown, setShowSocietyDropdown] = useState(false);

  const [selectedTower, setSelectedTower] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);

  // Societies from store
  const [societies, setSocieties] = useState<Society[]>([]);
  const mostUsedSociety = mockDataStore.getMostUsedSociety();

  useEffect(() => {
    setSocieties(mockDataStore.getSocieties());
  }, []);

  // Filtered Societies for Autocomplete Search
  const filteredSocieties = societies.filter((s) =>
    s.name.toLowerCase().includes(societySearch.toLowerCase())
  );

  // Helper to normalize strings for flexible matching (handles "Tower A" vs "A", "A-101" vs "101", casing, spaces)
  const normalizeStr = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const findPreviousCustomerDetails = (
    socName: string,
    towerName: string,
    flatNo: string,
    prefillName?: string,
    prefillMobile?: string
  ) => {
    if (!socName.trim() || !towerName.trim() || !flatNo.trim()) return null;

    const normSoc = normalizeStr(socName);
    const normTower = normalizeStr(towerName);
    const normFlat = normalizeStr(flatNo);

    // 1. Check in saved Customer Master list
    const savedCust = mockDataStore.getCustomers().find((c) => {
      const matchSoc = normalizeStr(c.societyName) === normSoc;
      const matchTower =
        normalizeStr(c.tower) === normTower ||
        normTower.includes(normalizeStr(c.tower)) ||
        normalizeStr(c.tower).includes(normTower);
      const matchFlat =
        normalizeStr(c.flat) === normFlat ||
        normFlat.endsWith(normalizeStr(c.flat)) ||
        normalizeStr(c.flat).endsWith(normFlat);
      return matchSoc && matchTower && matchFlat;
    });

    if (savedCust) {
      return {
        name: savedCust.name,
        mobile: savedCust.mobile,
        customerObj: savedCust,
      };
    }

    // 2. Check in previously booked Orders history
    const pastOrder = mockDataStore.getOrders().find((o) => {
      const matchSoc = normalizeStr(o.societyName) === normSoc;
      const matchTower =
        normalizeStr(o.tower) === normTower ||
        normTower.includes(normalizeStr(o.tower)) ||
        normalizeStr(o.tower).includes(normTower);
      const matchFlat =
        normalizeStr(o.flat) === normFlat ||
        normFlat.endsWith(normalizeStr(o.flat)) ||
        normalizeStr(o.flat).endsWith(normFlat);
      return matchSoc && matchTower && matchFlat;
    });

    if (pastOrder && pastOrder.customerName && pastOrder.mobile) {
      return {
        name: pastOrder.customerName,
        mobile: pastOrder.mobile,
        customerObj: {
          id: `prev_order_${pastOrder.id}`,
          name: pastOrder.customerName,
          mobile: pastOrder.mobile,
          societyName: socName,
          tower: towerName,
          flat: flatNo,
          address: pastOrder.address || `Flat ${flatNo}, ${towerName}, ${socName}`,
          totalOrdersCount: 1,
          previousServices: pastOrder.items?.map((i) => i.serviceName) || ['Wash & Iron', 'Dry Cleaning'],
          notes: 'Auto-fetched from previous booked order history',
        },
      };
    }

    // 3. Check in registered Society Flat Master Directory
    for (const s of mockDataStore.getSocieties()) {
      if (normalizeStr(s.name) === normSoc) {
        for (const t of s.towers) {
          if (
            normalizeStr(t.name) === normTower ||
            normTower.includes(normalizeStr(t.name)) ||
            normalizeStr(t.name).includes(normTower)
          ) {
            const f = t.flats.find(
              (fl) =>
                normalizeStr(fl.flatNo) === normFlat ||
                normFlat.endsWith(normalizeStr(fl.flatNo)) ||
                normalizeStr(fl.flatNo).endsWith(normFlat)
            );
            if (f && f.customerName && f.mobile) {
              return {
                name: f.customerName,
                mobile: f.mobile,
                customerObj: {
                  id: `soc_flat_${Date.now()}`,
                  name: f.customerName,
                  mobile: f.mobile,
                  societyName: socName,
                  tower: towerName,
                  flat: flatNo,
                  address: `Flat ${flatNo}, ${towerName}, ${socName}`,
                  totalOrdersCount: 1,
                  previousServices: ['Wash & Iron'],
                  notes: 'Auto-fetched from society directory',
                },
              };
            }
          }
        }
      }
    }

    // 4. Fallback to prefilled name/mobile if provided
    if (prefillName || prefillMobile) {
      return {
        name: prefillName || '',
        mobile: prefillMobile || '',
        customerObj: {
          id: `prefill_${Date.now()}`,
          name: prefillName || '',
          mobile: prefillMobile || '',
          societyName: socName,
          tower: towerName,
          flat: flatNo,
          address: `Flat ${flatNo}, ${towerName}, ${socName}`,
          totalOrdersCount: 1,
          previousServices: ['Wash & Iron'],
        },
      };
    }

    return null;
  };

  // Automatically fetch customer details whenever Society, Tower, and Flat are all selected/entered
  useEffect(() => {
    const socName = selectedSociety ? selectedSociety.name : societySearch.trim();
    if (socName && selectedTower.trim() && selectedFlat.trim()) {
      const result = findPreviousCustomerDetails(socName, selectedTower, selectedFlat);
      if (result) {
        setCustomerName(result.name);
        setMobileNumber(result.mobile);
        setExistingCustomer(result.customerObj as any);
      }
    }
  }, [selectedSociety, societySearch, selectedTower, selectedFlat]);

  // Handle Society Select
  const handleSelectSociety = (soc: Society) => {
    setSelectedSociety(soc);
    setSocietySearch(soc.name);
    setShowSocietyDropdown(false);
    setSelectedTower('');
    setSelectedFlat('');
    setCustomerName('');
    setMobileNumber('');
    setExistingCustomer(null);
  };

  // Handle Tower Select
  const handleSelectTower = (towerName: string) => {
    setSelectedTower(towerName);
    setSelectedFlat('');
    setCustomerName('');
    setMobileNumber('');
    setExistingCustomer(null);
  };

  // Handle Flat Select & Auto-Fetch Previous Customer Details
  const handleSelectFlat = (flatNo: string, prefillName?: string, prefillMobile?: string) => {
    setSelectedFlat(flatNo);
    const socName = selectedSociety ? selectedSociety.name : societySearch.trim();
    if (socName && selectedTower && flatNo.trim()) {
      const result = findPreviousCustomerDetails(
        socName,
        selectedTower,
        flatNo.trim(),
        prefillName,
        prefillMobile
      );
      if (result) {
        setCustomerName(result.name);
        setMobileNumber(result.mobile);
        setExistingCustomer(result.customerObj as any);
      } else {
        setExistingCustomer(null);
      }
    } else {
      setExistingCustomer(null);
    }
  };

  // Navigation to Step 2 with Validation
  const handleGoNext = () => {
    const finalSocietyName = selectedSociety ? selectedSociety.name : societySearch.trim();

    if (!finalSocietyName) {
      Alert.alert('Required Field', 'Please enter or select a Society Name.');
      return;
    }
    if (!selectedTower) {
      Alert.alert('Required Field', 'Please select or enter Block / Tower.');
      return;
    }
    if (!selectedFlat) {
      Alert.alert('Required Field', 'Please select or enter Flat / Unit Number.');
      return;
    }
    if (!customerName.trim()) {
      Alert.alert('Required Field', 'Please enter Customer Name.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Mobile Number.');
      return;
    }

    const step1Data = {
      societyName: finalSocietyName,
      tower: selectedTower,
      flat: selectedFlat,
      customerName: customerName.trim(),
      mobile: mobileNumber.trim(),
      address: `Flat ${selectedFlat}, ${selectedTower}, ${finalSocietyName}`,
      existingCustomer,
    };

    navigation.navigate('NewOrderStep2', { step1Data });
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
          <Text style={styles.stepIndicator}>Step 1 of 2 - Customer Details</Text>
        </View>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeTxt}>1 / 2</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 1. Society Name */}
        <AppCard style={styles.sectionCard}>
          <Text style={styles.fieldLabel}>Society Name *</Text>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Type to search society..."
              placeholderTextColor={COLORS.textLight}
              value={societySearch}
              onChangeText={(txt) => {
                setSocietySearch(txt);
                setShowSocietyDropdown(true);
                if (selectedSociety && txt !== selectedSociety.name) {
                  setSelectedSociety(null);
                }
              }}
              onFocus={() => setShowSocietyDropdown(true)}
            />
            {societySearch.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSocietySearch('');
                  setSelectedSociety(null);
                  setShowSocietyDropdown(true);
                }}
              >
                <Text style={styles.clearTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown list */}
          {showSocietyDropdown && (
            <View style={styles.dropdown}>
              {filteredSocieties.map((soc) => {
                const isMostUsed = mostUsedSociety && mostUsedSociety.id === soc.id;
                return (
                  <TouchableOpacity
                    key={soc.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectSociety(soc)}
                  >
                    <Text style={styles.socNameTxt}>{soc.name}</Text>
                    {isMostUsed && (
                      <View style={styles.mostUsedTag}>
                        <Text style={styles.mostUsedTxt}>⭐ Most Used ({soc.orderCount} orders)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {filteredSocieties.length === 0 && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => setShowSocietyDropdown(false)}
                >
                  <Text style={styles.socNameTxt}>Use "{societySearch}" as New Society</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </AppCard>

        {/* 2. Block / Tower Selection */}
        {(selectedSociety || societySearch.length > 0) && (
          <AppCard style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Block / Tower *</Text>
            {selectedSociety ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {selectedSociety.towers.map((t) => (
                  <TouchableOpacity
                    key={t.name}
                    style={[
                      styles.chip,
                      selectedTower === t.name && styles.chipActive,
                    ]}
                    onPress={() => handleSelectTower(t.name)}
                  >
                    <Text
                      style={[
                        styles.chipTxt,
                        selectedTower === t.name && styles.chipTxtActive,
                      ]}
                    >
                      🏢 {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <AppInput
                placeholder="e.g. Tower A or Block 1"
                value={selectedTower}
                onChangeText={setSelectedTower}
              />
            )}

            {/* Flat / Unit Selection */}
            {selectedTower.length > 0 && (
              <View style={{ marginTop: SPACING.md }}>
                <Text style={styles.fieldLabel}>Flat / Unit Number *</Text>

                {selectedSociety &&
                selectedSociety.towers.find((t) => t.name === selectedTower) ? (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                      {selectedSociety.towers
                        .find((t) => t.name === selectedTower)
                        ?.flats.map((f) => (
                          <TouchableOpacity
                            key={f.flatNo}
                            style={[
                              styles.chip,
                              selectedFlat === f.flatNo && styles.chipActive,
                            ]}
                            onPress={() => handleSelectFlat(f.flatNo, f.customerName, f.mobile)}
                          >
                            <Text
                              style={[
                                styles.chipTxt,
                                selectedFlat === f.flatNo && styles.chipTxtActive,
                              ]}
                            >
                              🚪 {f.flatNo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <AppInput
                      placeholder="Or enter flat number manually (e.g. A-304)"
                      value={selectedFlat}
                      onChangeText={(val) => handleSelectFlat(val)}
                      style={{ marginTop: SPACING.xs }}
                    />
                  </View>
                ) : (
                  <AppInput
                    placeholder="e.g. Flat A-203"
                    value={selectedFlat}
                    onChangeText={(val) => handleSelectFlat(val)}
                  />
                )}
              </View>
            )}
          </AppCard>
        )}

        {/* 3. Customer Details & Auto-Fetch Notification */}
        {selectedFlat.length > 0 && (
          <AppCard style={styles.sectionCard}>
            <View style={styles.customerHeaderRow}>
              <Text style={styles.fieldLabel}>Customer Information</Text>
              {existingCustomer && (
                <View style={styles.autoFetchedBadge}>
                  <Text style={styles.autoFetchedTxt}>⚡ Auto-Fetched Record</Text>
                </View>
              )}
            </View>

            {existingCustomer && (
              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>
                  👤 Recognized Customer ({existingCustomer.totalOrdersCount} previous orders)
                </Text>
                <Text style={styles.historySub}>
                  Services: {existingCustomer.previousServices?.join(', ') || 'Wash & Fold'}
                </Text>
                {existingCustomer.notes && (
                  <Text style={styles.historySub}>Note: {existingCustomer.notes}</Text>
                )}
              </View>
            )}

            <AppInput
              label="Customer Name *"
              placeholder="e.g. Ajit Sharma"
              value={customerName}
              onChangeText={setCustomerName}
            />

            <AppInput
              label="Mobile Number *"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={setMobileNumber}
            />
          </AppCard>
        )}
      </ScrollView>

      {/* Footer Next Button */}
      <View style={styles.footer}>
        <AppButton
          title="Next: Select Service ➔"
          onPress={handleGoNext}
          style={styles.nextBtn}
        />
      </View>
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
  backBtn: {
    paddingRight: SPACING.md,
  },
  backTxt: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  stepIndicator: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  stepBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
  },
  stepBadgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  clearTxt: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textLight,
  },
  dropdown: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    marginTop: SPACING.xs,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  socNameTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  mostUsedTag: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
  },
  mostUsedTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.success,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  chip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    marginRight: SPACING.xs,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTxtActive: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  autoFetchedBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_full,
  },
  autoFetchedTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  historyBox: {
    backgroundColor: COLORS.cardAlt,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.md,
  },
  historyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  historySub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
  },
});
