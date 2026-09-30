import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { partnerService } from '../../services/partnerService';
import { useAuth } from '../../context/AuthContext';

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: string;
  outstanding: string;
  tag: string;
  notes: string;
}

const FALLBACK_CUSTOMERS: Customer[] = [
  {
    id: 'C-1',
    name: 'Amitabh Sharma',
    phone: '+91 98765 43210',
    totalOrders: 24,
    totalSpent: '₹14,200',
    outstanding: '₹0',
    tag: 'Loyal Customer',
    notes: 'Prefers mild detergent and extra starch on shirts.',
  },
  {
    id: 'C-2',
    name: 'Pooja Verma',
    phone: '+91 98123 45678',
    totalOrders: 18,
    totalSpent: '₹9,800',
    outstanding: '₹450',
    tag: 'Frequent',
    notes: 'Always requests evening pickup between 6-7 PM.',
  },
  {
    id: 'C-3',
    name: 'Rahul Deshmukh',
    phone: '+91 99221 13344',
    totalOrders: 11,
    totalSpent: '₹5,400',
    outstanding: '₹800',
    tag: 'Outstanding Payment',
    notes: 'Pending payment for blanket wash from last week.',
  },
];

export const CustomerManagementScreen = () => {
  const insets = useSafeAreaInsets();
  const { currentShop } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCustomers = async () => {
    try {
      const shopId = currentShop?.id;
      const data = await partnerService.getOwnerCustomers(shopId);
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(
          data.map((c: any) => ({
            id: c.id || String(c.user_id),
            name: c.name || 'Customer',
            phone: c.phone || '—',
            totalOrders: Number(c.totalOrders || 0),
            totalSpent: c.totalSpent || '₹0',
            outstanding: c.outstanding || '₹0',
            tag: c.tag || 'New Customer',
            notes: c.notes || 'Regular customer',
          }))
        );
      } else {
        setCustomers(FALLBACK_CUSTOMERS);
      }
    } catch {
      setCustomers(FALLBACK_CUSTOMERS);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadCustomers(); }, [currentShop?.id]);

  const onRefresh = () => { setRefreshing(true); loadCustomers(); };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesTag = selectedTag === 'All' || c.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Customer Management</Text>
          <Text style={styles.headerSub}>{customers.length} total customers</Text>
        </View>

        <View style={styles.searchBoxContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name or phone..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Chip Tabs */}
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagScrollContent}
          >
            {['All', 'Loyal Customer', 'Frequent', 'New Customer', 'Outstanding Payment'].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
                onPress={() => setSelectedTag(tag)}
              >
                <Text style={[styles.tagTxt, selectedTag === tag && styles.tagTxtActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 8 }}>
              Loading customers...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          >
            {filtered.length === 0 ? (
              <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text }}>
                  No customers yet
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  Customers who book orders with your shop will appear here automatically.
                </Text>
              </View>
            ) : (
              filtered.map((customer) => (
                <AppCard key={customer.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.name}>{customer.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        customer.outstanding !== '₹0'
                          ? styles.badgeError
                          : styles.badgePrimary,
                      ]}
                    >
                      <Text style={styles.badgeTxt}>{customer.tag}</Text>
                    </View>
                  </View>

                  <Text style={styles.phone}>📞 {customer.phone}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLbl}>Total Orders</Text>
                      <Text style={styles.statVal}>{customer.totalOrders}</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statLbl}>Total Spent</Text>
                      <Text style={styles.statVal}>{customer.totalSpent}</Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text style={styles.statLbl}>Outstanding</Text>
                      <Text
                        style={[
                          styles.statVal,
                          { color: customer.outstanding !== '₹0' ? COLORS.error : COLORS.success },
                        ]}
                      >
                        {customer.outstanding}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>📝 Special Instructions & Notes:</Text>
                    <Text style={styles.notesTxt}>{customer.notes}</Text>
                  </View>
                </AppCard>
              ))
            )}
          </ScrollView>
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
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchBoxContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.card,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_md,
    paddingHorizontal: SPACING.md,
    height: 44,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  filterWrap: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
  },
  tagScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagTxtActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  container: {
    padding: SPACING.lg,
  },
  card: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
  },
  badgePrimary: { backgroundColor: COLORS.primaryLight },
  badgeError: { backgroundColor: COLORS.error + '20' },
  badgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  phone: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    marginBottom: SPACING.md,
  },
  statCol: {
    alignItems: 'center',
  },
  statLbl: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statVal: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: COLORS.cardAlt,
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 2,
  },
  notesTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
});
