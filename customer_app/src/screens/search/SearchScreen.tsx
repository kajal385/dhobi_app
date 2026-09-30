import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AppScreen from '../../components/AppScreen';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { Shop } from '../../types';

// Mock Search Results for shops with filter metadata
interface FilterableShop extends Shop {
  free_pickup?: boolean;
  express?: boolean;
}

const MOCK_SHOPS: FilterableShop[] = [
  {
    id: 1,
    name: 'Super Clean Laundry',
    rating: 4.8,
    review_count: 124,
    distance: '1.2 km',
    address: 'Sector 62, Noida',
    is_open: true,
    services: [],
    free_pickup: true,
    express: true,
  },
  {
    id: 2,
    name: 'Dhobi Express Services',
    rating: 4.5,
    review_count: 82,
    distance: '2.5 km',
    address: 'Indirapuram, Ghaziabad',
    is_open: true,
    services: [],
    free_pickup: false,
    express: true,
  },
  {
    id: 3,
    name: 'Royal Dry Cleaners',
    rating: 4.9,
    review_count: 210,
    distance: '3.1 km',
    address: 'Connaught Place, New Delhi',
    is_open: false,
    services: [],
    free_pickup: true,
    express: false,
  },
];

export const SearchScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  let filteredShops = MOCK_SHOPS.filter((shop) =>
    shop.name.toLowerCase().includes(query.toLowerCase()) ||
    shop.address.toLowerCase().includes(query.toLowerCase())
  );

  if (activeFilters.includes('top_rated')) {
    filteredShops = filteredShops.filter((shop) => shop.rating >= 4.7);
  }
  if (activeFilters.includes('open_now')) {
    filteredShops = filteredShops.filter((shop) => shop.is_open);
  }
  if (activeFilters.includes('free_pickup')) {
    filteredShops = filteredShops.filter((shop) => shop.free_pickup);
  }
  if (activeFilters.includes('express')) {
    filteredShops = filteredShops.filter((shop) => shop.express);
  }

  const renderShop = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('ShopDetail', { shopId: item.id, shopName: item.name })}
    >
      <View style={styles.shopHeader}>
        <Text style={[styles.shopName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.distance, { color: colors.textSecondary }]}>{item.distance}</Text>
      </View>
      <Text style={[styles.address, { color: colors.textSecondary }]}>{item.address}</Text>
      <View style={styles.footerRow}>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>⭐</Text>
          <Text style={[styles.ratingText, { color: colors.text }]}>
            {item.rating} ({item.review_count} reviews)
          </Text>
        </View>
        <Text
          style={[
            styles.statusText,
            { color: item.is_open ? colors.success : colors.error },
          ]}
        >
          {item.is_open ? 'Open Now' : 'Closed'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { key: 'top_rated', label: '⭐ Top Rated' },
    { key: 'open_now', label: '🕒 Open Now' },
    { key: 'free_pickup', label: '🧺 Free Pickup' },
    { key: 'express', label: '⚡ Express Delivery' },
  ];

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search laundry shops, dry cleaners..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {/* Filter Chips ScrollView */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {filters.map((filter) => {
            const isSelected = activeFilters.includes(filter.key);
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.8}
                onPress={() => toggleFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? COLORS.white : colors.text },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShop}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No shops found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try searching with another keyword.
            </Text>
          </View>
        }
      />
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: SIZES.radius_xl,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { fontSize: 16, marginRight: SPACING.sm },
  searchInput: { flex: 1, height: '100%', fontSize: 14, padding: 0 },
  filtersWrapper: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  filtersScroll: {
    gap: SPACING.sm,
    paddingRight: SPACING.xl,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SIZES.radius_full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
  shopCard: {
    borderRadius: SIZES.radius_lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shopName: { fontSize: 16, fontWeight: '800' },
  distance: { fontSize: 12, fontWeight: '600' },
  address: { fontSize: 13, marginBottom: SPACING.md },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 14 },
  ratingText: { fontSize: 13, fontWeight: '600' },
  statusText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 52, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});

export default SearchScreen;
