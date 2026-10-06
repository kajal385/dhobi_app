import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  Alert,
  Image,
  ImageBackground,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import AppScreen from '../../components/AppScreen';
import { RootState } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { clearOrders } from '../../store/orderSlice';
import { clearWallet } from '../../store/walletSlice';
import { orderService } from '../../services/orderService';
import { walletService } from '../../services/walletService';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const { orders } = useSelector((s: RootState) => s.orders);

  const customerName = user?.name || 'Kajal Gajare';
  const customerPhone = user?.phone ? `+91 ${user.phone}` : '+91 9309386003';
  const customerEmail = user?.email || 'kajal-gajare750@dhobipro.com';
  const customerAddress = user?.address || 'Flat 302, Green Acres';
  const customerArea = user?.area || 'Wakad';
  const customerCity = user?.city || 'Pune';
  const walletBalance = parseFloat(user?.wallet_balance || '0').toFixed(0);

  const displayLocation = customerAddress
    ? customerAddress.includes(customerCity)
      ? customerAddress
      : `${customerAddress}, ${customerArea}, ${customerCity}`
    : 'Select Location...';

  const totalOrdersCount = Array.isArray(orders) ? orders.length : 0;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          dispatch(clearOrders());
          dispatch(clearWallet());
          orderService.clearLocalOrders();
          walletService.clearWalletData();
          Toast.show({ type: 'success', text1: 'Logged out successfully' });
        },
      },
    ]);
  };

  const accountMenu = [
    {
      id: 'orders',
      title: 'Order History',
      subtitle: 'Track active & past laundry bookings',
      iconName: 'tshirt-crew-outline',
      iconBg: '#EDE8FF',
      iconColor: '#321D8C',
      onPress: () => navigation.navigate('Orders'),
      badge: `${totalOrdersCount} Orders`,
    },
    {
      id: 'edit_profile',
      title: 'Edit Profile & Details',
      subtitle: 'Name, phone, email & password',
      iconName: 'account-edit-outline',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'addresses',
      title: 'Address Book',
      subtitle: 'Manage saved pickup & delivery addresses',
      iconName: 'map-marker-outline',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      onPress: () => navigation.navigate('SavedAddresses'),
    },
  ];

  const paymentMenu = [
    {
      id: 'wallet',
      title: 'Dhobi Wallet & Payments',
      subtitle: `Available Balance: ₹${walletBalance}`,
      iconName: 'wallet-outline',
      iconBg: '#DCFCE7',
      iconColor: '#15803D',
      onPress: () => navigation.navigate('Wallet'),
      badge: `₹${walletBalance}`,
    },
    {
      id: 'offers',
      title: 'Coupons & Discounts',
      subtitle: 'View promo codes & active offers',
      iconName: 'ticket-percent-outline',
      iconBg: '#FCE7F3',
      iconColor: '#BE185D',
      onPress: () => Toast.show({ type: 'info', text1: '🎁 Use code DHOBI20 for 20% OFF' }),
    },
  ];

  const appMenu = [
    {
      id: 'notifications',
      title: 'Notifications Settings',
      subtitle: 'Pickup, washing & delivery alerts',
      iconName: 'bell-outline',
      iconBg: '#EDE8FF',
      iconColor: '#5B52E8',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'support',
      title: 'Help & Customer Support',
      subtitle: '24/7 Live chat & helpline',
      iconName: 'headset',
      iconBg: '#F3E8FF',
      iconColor: '#7E22CE',
      onPress: () => Alert.alert('Support Helpline 🎧', 'Email: support@dhobipro.com\nPhone: +91 98234 56789\nWorking hours: 8:00 AM - 9:00 PM'),
    },
    {
      id: 'privacy',
      title: 'Terms & Privacy Policy',
      subtitle: 'App terms, safety & licensing',
      iconName: 'file-document-outline',
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      onPress: () => Alert.alert('Terms & Privacy', 'Dhobi App v2.4.0\nAll customer data encrypted with TLS 1.3.'),
    },
  ];

  return (
    <ImageBackground
      source={require('../../../assets/myimages/login_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Decorative Sparkles */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 120, right: 15, zIndex: 99 }}>
        <Image
          source={require('../../../assets/myimages/sparkles.png')}
          style={{ width: 28, height: 28, opacity: 0.18 }}
          resizeMode="contain"
        />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 100, left: 15, zIndex: 99 }}>
        <Image
          source={require('../../../assets/myimages/bubbles.png')}
          style={{ width: 50, height: 50, opacity: 0.12 }}
          resizeMode="contain"
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.lg) }]}>
        <Text style={[styles.headerTitle, { color: '#321D8C' }]}>My Profile</Text>
        <TouchableOpacity
          style={[styles.editHeaderBtn, { backgroundColor: '#EDE8FF' }]}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-edit-outline" size={20} color="#321D8C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Hero Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: '#EDE8FF',
              shadowColor: '#321D8C',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 14,
              elevation: 4,
            },
          ]}
        >
          {/* Avatar with Gradient Border */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#8162EE', '#A672D6', '#FE9A5D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.avatarText, { color: '#321D8C' }]}>
                  {customerName ? customerName.charAt(0).toUpperCase() : 'K'}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.verifiedDot}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
            </View>
          </View>

          {/* Customer Info */}
          <Text style={[styles.userName, { color: '#321D8C' }]}>{customerName}</Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>{customerPhone}</Text>
          <Text style={[styles.userEmail, { color: colors.textLight }]}>{customerEmail}</Text>

          {/* Customer Location Pill */}
          <TouchableOpacity
            style={[styles.locationPill, { backgroundColor: '#F4F3FA', borderColor: '#E8E5F8' }]}
            onPress={() => navigation.navigate('MapScreen', { returnScreen: 'Profile' })}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, marginRight: 6 }}>📍</Text>
            <Text style={[styles.locationPillText, { color: '#321D8C' }]} numberOfLines={1}>
              {displayLocation}
            </Text>
            <Text style={styles.locationPillEdit}>Edit ❯</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.statsBar}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: '#EDE8FF' }]}
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.8}
          >
            <Text style={styles.statEmoji}>🧺</Text>
            <Text style={[styles.statVal, { color: '#321D8C' }]}>{totalOrdersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: '#EDE8FF' }]}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.8}
          >
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statVal, { color: '#321D8C' }]}>₹{walletBalance}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wallet</Text>
          </TouchableOpacity>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: '#EDE8FF' }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statVal, { color: '#321D8C' }]}>Gold</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Member</Text>
          </View>
        </View>

        {/* Section 1: Account & Orders */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Account & Bookings</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {accountMenu.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < accountMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F4F3FA' },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                {item.badge ? (
                  <View style={styles.badgeChip}>
                    <Text style={styles.badgeChipText}>{item.badge}</Text>
                  </View>
                ) : null}
                <Text style={styles.chevronArrow}>❯</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Payments & Offers */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Payments & Discounts</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {paymentMenu.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < paymentMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F4F3FA' },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                {item.badge ? (
                  <View style={[styles.badgeChip, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.badgeChipText, { color: '#15803D' }]}>{item.badge}</Text>
                  </View>
                ) : null}
                <Text style={styles.chevronArrow}>❯</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: App Settings & Help */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Preferences & Support</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {appMenu.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < appMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F4F3FA' },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                <Text style={styles.chevronArrow}>❯</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Log Out Account</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <Text style={[styles.footerText, { color: colors.textLight }]}>
          Dhobi Laundry App • Version 2.4.0
        </Text>
        <Text style={[styles.subFooterText, { color: colors.textLight }]}>
          Made with ❤️ for premium laundry care
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  editHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xxxl,
  },
  profileCard: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#22C55E',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 12,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  locationPillEdit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B52E8',
    marginLeft: 6,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  sectionContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#321D8C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  badgeChip: {
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeChipText: {
    color: '#321D8C',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronArrow: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A09BB0',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    backgroundColor: '#FFF5F5',
    borderColor: '#FECDD3',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  subFooterText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default ProfileScreen;

