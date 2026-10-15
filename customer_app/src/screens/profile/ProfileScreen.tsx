import React, { useState } from 'react';
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
  Switch,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { SPACING, SIZES } from '../../constants/theme';
import AppScreen from '../../components/AppScreen';
import { RootState } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { clearOrders } from '../../store/orderSlice';
import { clearWallet } from '../../store/walletSlice';
import { orderService } from '../../services/orderService';
import { walletService } from '../../services/walletService';
import { useTheme } from '../../hooks/useTheme';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StandardModal, ModalDetailItem } from '../../components/StandardModal';

export const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDark, colors, themeMode, setThemeMode, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const { orders } = useSelector((s: RootState) => s.orders);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    type?: 'info' | 'success';
    icon?: string;
    badgeLabel?: string;
    title: string;
    subtitle?: string;
    details?: ModalDetailItem[];
  }>({ visible: false, title: '' });

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
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    dispatch(logoutUser());
    dispatch(clearOrders());
    dispatch(clearWallet());
    orderService.clearLocalOrders();
    walletService.clearWalletData();
    Toast.show({ type: 'success', text1: 'Logged out successfully' });
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
      id: 'theme',
      title: 'Appearance / Theme',
      subtitle: themeMode === 'dark' ? 'Dark Mode (Active 🌙)' : themeMode === 'light' ? 'Light Mode (Active ☀️)' : 'System Default (Auto ⚙️)',
      iconName: isDark ? 'weather-night' : 'white-balance-sunny',
      iconBg: isDark ? '#26234D' : '#FEF3C7',
      iconColor: isDark ? '#7B74FF' : '#D97706',
      onPress: () => setThemeModalVisible(true),
      isToggle: true,
      toggleValue: isDark,
      onToggle: toggleTheme,
    },
    {
      id: 'notifications',
      title: 'Notifications Settings',
      subtitle: 'Pickup, washing & delivery alerts',
      iconName: 'bell-outline',
      iconBg: isDark ? '#202024' : '#EDE8FF',
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
      onPress: () => setInfoModal({
        visible: true,
        type: 'info',
        icon: '🎧',
        badgeLabel: 'Customer Care',
        title: 'Customer Helpline',
        subtitle: 'Our dedicated support team is available 7 days a week to help with your orders.',
        details: [
          { icon: '📧', label: 'Email Support', value: 'support@dhobipro.com' },
          { icon: '📞', label: 'Toll-Free Phone', value: '+91 98234 56789' },
          { icon: '⏰', label: 'Working Hours', value: '8:00 AM – 9:00 PM IST' },
        ],
      }),
    },
    {
      id: 'privacy',
      title: 'Terms & Privacy Policy',
      subtitle: 'App terms, safety & licensing',
      iconName: 'file-document-outline',
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      onPress: () => setInfoModal({
        visible: true,
        type: 'info',
        icon: '🛡️',
        badgeLabel: 'Security',
        title: 'Terms & Privacy Policy',
        subtitle: 'Your personal data, payment info and laundry records are secured.',
        details: [
          { icon: '🔒', label: 'Encryption', value: 'TLS 1.3 End-to-End' },
          { icon: '📱', label: 'App Version', value: 'Dhobi App v2.4.0' },
          { icon: '🏛️', label: 'Compliance', value: 'ISO 27001 Certified' },
        ],
      }),
    },
  ];

  const renderProfileContent = () => (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Decorative Sparkles */}
      {!isDark && (
        <>
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
        </>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, SPACING.lg) }]}>
        <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#321D8C' }]}>My Profile</Text>
        <TouchableOpacity
          style={[styles.editHeaderBtn, { backgroundColor: isDark ? colors.cardAlt : '#EDE8FF' }]}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-edit-outline" size={20} color={isDark ? colors.text : '#321D8C'} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Hero Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: '#321D8C',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0 : 0.08,
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
              <View style={[styles.avatarInner, { backgroundColor: isDark ? colors.cardAlt : '#FFFFFF' }]}>
                <Text style={[styles.avatarText, { color: isDark ? '#A5B4FC' : '#321D8C' }]}>
                  {customerName ? customerName.charAt(0).toUpperCase() : 'K'}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.verifiedDot}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
            </View>
          </View>

          {/* Customer Info */}
          <Text style={[styles.userName, { color: isDark ? colors.text : '#321D8C' }]}>{customerName}</Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>{customerPhone}</Text>
          <Text style={[styles.userEmail, { color: colors.textLight }]}>{customerEmail}</Text>

          {/* Customer Location Pill */}
          <TouchableOpacity
            style={[styles.locationPill, { backgroundColor: isDark ? colors.cardAlt : '#F4F3FA', borderColor: colors.border }]}
            onPress={() => navigation.navigate('MapScreen', { returnScreen: 'Profile' })}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, marginRight: 6 }}>📍</Text>
            <Text style={[styles.locationPillText, { color: isDark ? colors.text : '#321D8C' }]} numberOfLines={1}>
              {displayLocation}
            </Text>
            <Text style={[styles.locationPillEdit, { color: isDark ? '#A5B4FC' : '#5B52E8' }]}>Edit ❯</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.statsBar}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.8}
          >
            <Text style={styles.statEmoji}>🧺</Text>
            <Text style={[styles.statVal, { color: isDark ? colors.text : '#321D8C' }]}>{totalOrdersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.8}
          >
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statVal, { color: isDark ? colors.text : '#321D8C' }]}>₹{walletBalance}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wallet</Text>
          </TouchableOpacity>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statVal, { color: isDark ? colors.text : '#321D8C' }]}>Gold</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Member</Text>
          </View>
        </View>

        {/* Section 1: Account & Orders */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: isDark ? '#A5B4FC' : '#321D8C' }]}>Account & Bookings</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {accountMenu.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < accountMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: isDark ? colors.text : '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                {item.badge ? (
                  <View style={styles.badgeChip}>
                    <Text style={styles.badgeChipText}>{item.badge}</Text>
                  </View>
                ) : null}
                <Text style={[styles.chevronArrow, { color: isDark ? colors.textLight : '#A09EBF' }]}>❯</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Payments & Offers */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: isDark ? '#A5B4FC' : '#321D8C' }]}>Payments & Discounts</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {paymentMenu.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < paymentMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: isDark ? colors.text : '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                {item.badge ? (
                  <View style={[styles.badgeChip, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.badgeChipText, { color: '#15803D' }]}>{item.badge}</Text>
                  </View>
                ) : null}
                <Text style={[styles.chevronArrow, { color: isDark ? colors.textLight : '#A09EBF' }]}>❯</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: App Settings & Help */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Preferences & Support</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {appMenu.map((item: any, idx: number) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItemRow,
                  idx < appMenu.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#222033' : '#F4F3FA' },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.iconBg }]}>
                  <MaterialCommunityIcons name={item.iconName} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: isDark ? colors.text : '#321D8C' }]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                </View>
                {item.isToggle ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#7B74FF' : '#D97706' }}>
                      {isDark ? '🌙 DARK' : '☀️ LIGHT'}
                    </Text>
                    <Switch
                      value={item.toggleValue}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#CBD5E1', true: '#5B52E8' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ) : (
                  <Text style={[styles.chevronArrow, { color: isDark ? colors.textLight : '#A09EBF' }]}>❯</Text>
                )}
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

      {/* Logout Confirmation Modal */}
      <StandardModal
        visible={logoutModalVisible}
        type="warning"
        icon="🚪"
        badgeLabel="Account"
        title="Log Out of Dhobi?"
        subtitle="You will need to sign in again to place orders and track laundry."
        primaryActionText="Log Out"
        onPrimaryAction={confirmLogout}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setLogoutModalVisible(false)}
        onClose={() => setLogoutModalVisible(false)}
      />

      {/* Information / Helpline Modal */}
      <StandardModal
        visible={infoModal.visible}
        type={infoModal.type || 'info'}
        icon={infoModal.icon}
        badgeLabel={infoModal.badgeLabel}
        title={infoModal.title}
        subtitle={infoModal.subtitle}
        details={infoModal.details}
        primaryActionText="Got It"
        onPrimaryAction={() => setInfoModal(prev => ({ ...prev, visible: false }))}
        onClose={() => setInfoModal(prev => ({ ...prev, visible: false }))}
      />

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            {/* Grab Bar */}
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#303036' : '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="theme-light-dark" size={24} color="#5B52E8" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Appearance & Theme</Text>
              </View>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>
              Customize your viewing experience with Light Mode, Dark Mode, or match your System settings.
            </Text>

            {/* Theme Options */}
            {[
              {
                mode: 'light' as const,
                title: 'Light Mode',
                subtitle: 'Crisp, bright interface with warm pastel accents',
                icon: 'white-balance-sunny',
                iconColor: '#D97706',
                iconBg: '#FEF3C7',
              },
              {
                mode: 'dark' as const,
                title: 'Dark Mode',
                subtitle: 'Sleek #0B0B0D dark surfaces, comfortable in low light',
                icon: 'weather-night',
                iconColor: '#7B74FF',
                iconBg: '#26234D',
              },
              {
                mode: 'system' as const,
                title: 'System Default',
                subtitle: 'Automatically match your device appearance settings',
                icon: 'cellphone-cog',
                iconColor: '#10B981',
                iconBg: '#D1FAE5',
              },
            ].map((opt) => {
              const isSelected = themeMode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  activeOpacity={0.8}
                  onPress={() => {
                    setThemeMode(opt.mode);
                    Toast.show({
                      type: 'success',
                      text1: `${opt.title} Activated`,
                      text2: opt.subtitle,
                    });
                    setTimeout(() => setThemeModalVisible(false), 200);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#5B52E8' : colors.border,
                    backgroundColor: isSelected ? (isDark ? '#202024' : '#F8F7FF') : colors.card,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: opt.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <MaterialCommunityIcons name={opt.icon} size={22} color={opt.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{opt.title}</Text>
                      {isSelected && (
                        <View style={{ backgroundColor: '#5B52E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{opt.subtitle}</Text>
                  </View>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? '#5B52E8' : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B52E8' }} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setThemeModalVisible(false)}
              style={{
                marginTop: 10,
                height: 48,
                borderRadius: 14,
                backgroundColor: isDark ? '#202024' : '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  return isDark ? (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {renderProfileContent()}
    </View>
  ) : (
    <ImageBackground
      source={require('../../../assets/myimages/login_bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      {renderProfileContent()}
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

