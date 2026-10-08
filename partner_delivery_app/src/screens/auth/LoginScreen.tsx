import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SIZES, SPACING } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../../context/AuthContext';
import { partnerService } from '../../services/partnerService';
import { SplashScreen } from '../SplashScreen';

type AuthStackParamList = {
  Login: undefined;
  Registration: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [role, setRole] = useState<'owner' | 'delivery_boy'>('owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Post-login Splash Screen state
  const [showSplashOnLogin, setShowSplashOnLogin] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{
    role: 'owner' | 'delivery_boy';
    user: any;
    shop: any;
  } | null>(null);

  const handleRoleChange = (newRole: 'owner' | 'delivery_boy') => {
    setRole(newRole);
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your email or mobile number.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Required', 'Please enter your password.');
      return;
    }
    setIsLoading(true);
    try {
      if (role === 'owner') {
        const res = await partnerService.ownerLogin(phone, password);
        const status = (
          res?.verification_status ||
          res?.shop?.verification_status ||
          res?.data?.verification_status ||
          res?.data?.shop?.verification_status ||
          'APPROVED'
        ).toUpperCase();

        if (!res?.success) {
          setIsLoading(false);
          Alert.alert(
            'Login Failed ❌',
            res?.message || 'Incorrect mobile number or password. Please try again.'
          );
          return;
        }

        if (status === 'REJECTED') {
          setIsLoading(false);
          Alert.alert(
            'Application Rejected ❌',
            'Your Laundry Shop registration was rejected by Admin. Please contact support.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (status === 'PENDING') {
          setIsLoading(false);
          Alert.alert(
            'Under Verification ⏳',
            'Your application is still under Admin review. You will be notified once approved.\n\nPlease check back later.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (status === 'DOCS_REQUIRED') {
          setIsLoading(false);
          Alert.alert(
            'Documents Required 📄',
            'Admin has requested additional documents. Please check your registered email for details.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Laundry Owner login succeeded -> trigger Laundry Owner splash screen
        setPendingAuth({
          role: 'owner',
          user: res?.user || { name: res?.shop?.owner_name, phone },
          shop: res?.shop,
        });
        setShowSplashOnLogin(true);
      } else {
        // Delivery Boy Login via real API
        const res = await partnerService.deliveryBoyLogin(phone, password);
        if (!res?.success) {
          setIsLoading(false);
          Alert.alert('Login Failed 🔑', res?.message || 'Invalid delivery executive credentials.');
          return;
        }

        // Delivery Boy login succeeded -> trigger Delivery Boy splash screen
        setPendingAuth({
          role: 'delivery_boy',
          user: res?.user,
          shop: res?.shop,
        });
        setShowSplashOnLogin(true);
      }
    } catch {
      Alert.alert('Login Failed', 'Unable to complete login. Please check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Called when post-login splash screen completes its animation
  const handleSplashFinish = () => {
    setShowSplashOnLogin(false);
    if (pendingAuth) {
      login(pendingAuth.role, pendingAuth.user, pendingAuth.shop);
      setPendingAuth(null);
    }
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      {/* Show Role-Specific Splash Screen IMMEDIATELY AFTER LOGIN SUCCESS */}
      {showSplashOnLogin && pendingAuth && (
        <Modal visible transparent animationType="fade">
          <SplashScreen
            role={pendingAuth.role}
            onFinish={handleSplashFinish}
          />
        </Modal>
      )}

      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {role === 'delivery_boy' ? 'Delivery Executive' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {role === 'delivery_boy'
                ? 'Login to manage deliveries'
                : 'Login to manage laundry shop'}
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleSelection}>
            <Text style={styles.roleLabel}>Login As</Text>
            <View style={styles.roleButtonsRow}>
              <TouchableOpacity
                style={[styles.roleButton, role === 'owner' && styles.roleButtonActive]}
                onPress={() => handleRoleChange('owner')}
              >
                <Text style={styles.roleIcon}>🧺</Text>
                <Text style={[styles.roleText, role === 'owner' && styles.roleTextActive]}>
                  Laundry Owner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'delivery_boy' && styles.roleButtonActive,
                  role === 'delivery_boy' && styles.deliveryBoyActive,
                ]}
                onPress={() => handleRoleChange('delivery_boy')}
              >
                <Text style={styles.roleIcon}>🛵</Text>
                <Text style={[styles.roleText, role === 'delivery_boy' && styles.roleTextActive]}>
                  Delivery Boy
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {role === 'owner' && (
              <View style={styles.syncBox}>
                <View style={styles.syncHeaderRow}>
                  <Text style={styles.syncBadge}>🌐 Web Panel Synced</Text>
                  <Text style={styles.syncHint}>Same login as Admin Web Panel</Text>
                </View>
                <Text style={styles.syncTitle}>Choose Laundry Account to Login:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  <TouchableOpacity
                    style={[
                      styles.accountChip,
                      (phone === 'ashish.laundry@dhobipro.com' || phone === '8600692767') && styles.accountChipActive,
                    ]}
                    onPress={() => {
                      setPhone('ashish.laundry@dhobipro.com');
                      setPassword('owner123');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipShopName}>⭐ Star Wash Ultra</Text>
                    <Text style={styles.chipOwnerName}>Ashish Bhosale</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.accountChip,
                      (phone === 'ram@gmail.com' || phone === '9021991344') && styles.accountChipActive,
                    ]}
                    onPress={() => {
                      setPhone('ram@gmail.com');
                      setPassword('owner123');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipShopName}>🧺 Dhobi UltraPro</Text>
                    <Text style={styles.chipOwnerName}>Ram Kale</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.accountChip,
                      (phone === 'rajesh.laundry@dhobipro.com' || phone === '9876543210') && styles.accountChipActive,
                    ]}
                    onPress={() => {
                      setPhone('rajesh.laundry@dhobipro.com');
                      setPassword('owner123');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipShopName}>👔 My Laundry Shop</Text>
                    <Text style={styles.chipOwnerName}>Rajesh Sharma</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.accountChip,
                      (phone === 'javed.laundry@dhobipro.com' || phone === '020394859292') && styles.accountChipActive,
                    ]}
                    onPress={() => {
                      setPhone('javed.laundry@dhobipro.com');
                      setPassword('owner123');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipShopName}>✨ Super Clean Wash</Text>
                    <Text style={styles.chipOwnerName}>Javed Atkhar</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            <AppInput
              label="Email or Mobile Number"
              placeholder="e.g. ashish.laundry@dhobipro.com or 8600692767"
              keyboardType="email-address"
              autoCapitalize="none"
              value={phone}
              onChangeText={setPhone}
            />
            <AppInput
              label="Password"
              placeholder="Enter password (e.g. owner123)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <AppButton
              title={`Login as ${role === 'owner' ? 'Laundry Owner' : 'Delivery Boy'}`}
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginButton}
            />
          </View>

          {role === 'owner' && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have a partner account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                <Text style={styles.footerLink}>Register Here</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: SPACING.xxxl,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  roleSelection: {
    marginBottom: SPACING.xxl,
  },
  roleLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  roleButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  roleButton: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  deliveryBoyActive: {
    backgroundColor: '#EDE5FF',
    borderColor: '#6B35DE',
  },
  roleIcon: {
    fontSize: 20,
  },
  roleText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  roleTextActive: {
    color: COLORS.primaryDark,
    fontFamily: FONTS.semiBold,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  loginButton: {
    marginTop: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  syncBox: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  syncBadge: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  syncHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  syncTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  accountChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 120,
  },
  accountChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EDE9FE',
  },
  chipShopName: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  chipOwnerName: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
