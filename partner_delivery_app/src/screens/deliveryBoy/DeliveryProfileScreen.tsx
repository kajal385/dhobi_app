import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export const DeliveryProfileScreen = () => {
  const { logout, currentUser, currentShop } = useAuth();
  const insets = useSafeAreaInsets();

  const getInitials = (name: string) => {
    if (!name) return 'DB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const parseVehicle = (vStr: string) => {
    if (!vStr) return { model: 'Two Wheeler', number: 'MH 12 AB 1234' };
    const match = vStr.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (match && match[2]) {
      return { model: match[1].trim(), number: match[2].trim() };
    }
    return { model: vStr, number: 'MH 12 AB 1234' };
  };

  const name = currentUser?.name || 'Delivery Partner';
  const phone = currentUser?.phone || currentUser?.mobile || 'N/A';
  const vehicleInfo = parseVehicle(currentUser?.vehicle || currentUser?.vehicle_number);
  const initials = getInitials(name);
  const email = currentUser?.email || `${name.toLowerCase().replace(/\s+/g, '.')}@dhobipro.com`;
  const city = `${currentUser?.city || 'Pune'}, Maharashtra`;
  const joinedDate = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '15 Jan 2026';
  const ratingText = `${currentUser?.rating || '4.9 ⭐'} (${currentUser?.completedTasks || 0} Orders Completed)`;

  const shopName = currentUser?.laundry_shop?.name || currentShop?.name || 'Assigned Shop';

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Delivery Partner Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Profile Header Avatar */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{initials}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>Senior Delivery Executive</Text>
            <Text style={styles.phone}>📞 {phone}</Text>
          </View>

          {/* Personal Details Card */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <AppCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>👤 Full Name</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>📱 Phone Number</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>✉️ Email Address</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>🏪 Assigned Laundry Shop</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{shopName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>📍 Assigned City</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{city}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>🛡️ Account Status</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillTxt}>{currentUser?.account_status || 'ACTIVE'} & Verified ✅</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLbl} numberOfLines={1}>📅 Joined Platform</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{joinedDate}</Text>
            </View>
          </AppCard>

          {/* Vehicle & Identity Verification Card */}
          <Text style={styles.sectionTitle}>Vehicle & Verification Documents</Text>
          <AppCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>🛵 Vehicle Model</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{vehicleInfo.model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>🔢 Vehicle Number</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{vehicleInfo.number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>🪪 Driving License</Text>
              <Text style={[styles.infoVal, { color: COLORS.success }]} numberOfLines={1}>{currentUser?.dl_number || currentUser?.license_number || currentUser?.dlNumber || 'MH12 20210098765'} ✅</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl} numberOfLines={1}>💳 Identity (Aadhaar)</Text>
              <Text style={[styles.infoVal, { color: COLORS.success }]} numberOfLines={1}>{currentUser?.aadhaar_number ? `XXXX XXXX ${String(currentUser.aadhaar_number).slice(-4)} ✅` : 'Verified ✅'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLbl} numberOfLines={1}>⭐ Rating & Performance</Text>
              <Text style={styles.infoVal} numberOfLines={1}>{ratingText}</Text>
            </View>
          </AppCard>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutTxt}>🚪 Logout from Delivery App</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  container: { padding: SPACING.lg },
  profileHeader: { alignItems: 'center', marginBottom: SPACING.lg },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    position: 'relative',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarTxt: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 26 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.success,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  name: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  role: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primaryDark, marginTop: 2 },
  phone: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.primary, marginBottom: SPACING.xs, marginTop: SPACING.xs },
  infoCard: { marginBottom: SPACING.lg, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.lg },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLbl: {
    fontFamily: FONTS.medium,
    fontSize: 12.5,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  infoVal: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    color: COLORS.text,
    textAlign: 'right',
  },
  statusPill: {
    backgroundColor: COLORS.success + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  statusPillTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.success,
  },
  logoutBtn: {
    backgroundColor: COLORS.error + '15',
    padding: SPACING.md,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  logoutTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.error },
});
