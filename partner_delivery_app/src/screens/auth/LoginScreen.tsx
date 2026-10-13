import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppBackground } from '../../components/AppBackground';
import { StandardModal, ModalDetailItem } from '../../components/StandardModal';
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
  const scrollRef = useRef<any>(null);

  const [role, setRole] = useState<'owner' | 'delivery_boy'>('owner');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Modal feedback state
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type?: 'success' | 'info' | 'warning' | 'error';
    icon?: string;
    badgeLabel?: string;
    title: string;
    subtitle?: string;
    primaryActionText?: string;
    details?: ModalDetailItem[];
  }>({ visible: false, title: '' });

  // Post-login Splash Screen state
  const [showSplashOnLogin, setShowSplashOnLogin] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{
    role: 'owner' | 'delivery_boy';
    user: any;
    shop: any;
  } | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRoleChange = (newRole: 'owner' | 'delivery_boy') => {
    setRole(newRole);
  };

  const handleLogin = async () => {
    if (!phone.trim()) {
      setFeedbackModal({
        visible: true,
        type: 'warning',
        icon: '📱',
        badgeLabel: 'Required',
        title: 'Missing Identifier',
        subtitle: 'Please enter your registered email or 10-digit mobile number.',
      });
      return;
    }
    if (!password.trim()) {
      setFeedbackModal({
        visible: true,
        type: 'warning',
        icon: '🔑',
        badgeLabel: 'Required',
        title: 'Missing Password',
        subtitle: 'Please enter your account password to sign in.',
      });
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
          setFeedbackModal({
            visible: true,
            type: 'error',
            icon: '❌',
            badgeLabel: 'Authentication',
            title: 'Login Failed',
            subtitle: res?.message || 'Incorrect mobile number or password. Please verify and try again.',
          });
          return;
        }

        if (status === 'REJECTED') {
          setIsLoading(false);
          setFeedbackModal({
            visible: true,
            type: 'error',
            icon: '🚫',
            badgeLabel: 'Application Rejected',
            title: 'Account Not Approved',
            subtitle: 'Your Laundry Shop registration was rejected by Admin. Please contact customer support for assistance.',
          });
          return;
        }

        if (status === 'PENDING') {
          setIsLoading(false);
          setFeedbackModal({
            visible: true,
            type: 'info',
            icon: '⏳',
            badgeLabel: 'Under Review',
            title: 'Verification Pending',
            subtitle: 'Your shop application is still under Admin review. You will be notified immediately once approved.',
          });
          return;
        }

        if (status === 'DOCS_REQUIRED') {
          setIsLoading(false);
          setFeedbackModal({
            visible: true,
            type: 'warning',
            icon: '📄',
            badgeLabel: 'Documents Needed',
            title: 'Documents Required',
            subtitle: 'Admin has requested additional verification documents. Please check your registered email for details.',
          });
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
          setFeedbackModal({
            visible: true,
            type: 'error',
            icon: '🔑',
            badgeLabel: 'Authentication',
            title: 'Login Failed',
            subtitle: res?.message || 'Invalid delivery executive credentials. Please check your phone and password.',
          });
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
      setFeedbackModal({
        visible: true,
        type: 'error',
        icon: '⚠️',
        badgeLabel: 'Connection Error',
        title: 'Login Failed',
        subtitle: 'Unable to connect to server. Please check your internet connection and try again.',
      });
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.container,
              isKeyboardVisible && styles.containerKeyboardOpen,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.header, isKeyboardVisible && styles.headerCompact]}>
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
            <View style={[styles.roleSelection, isKeyboardVisible && styles.roleSelectionCompact]}>
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
              <AppInput
                label="Email or Mobile Number"
                placeholder="Enter email or mobile number"
                keyboardType="email-address"
                autoCapitalize="none"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 40, animated: true });
                  }, 120);
                }}
              />
              <AppInput
                label="Password"
                placeholder="Enter password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 190, animated: true });
                  }, 120);
                }}
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
        </KeyboardAvoidingView>
      </View>

      {/* Standard Feedback Modal */}
      <StandardModal
        visible={feedbackModal.visible}
        type={feedbackModal.type || 'error'}
        icon={feedbackModal.icon}
        badgeLabel={feedbackModal.badgeLabel}
        title={feedbackModal.title}
        subtitle={feedbackModal.subtitle}
        details={feedbackModal.details}
        primaryActionText={feedbackModal.primaryActionText || 'OK, Got It'}
        onPrimaryAction={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
        onClose={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
      />
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flexGrow: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  containerKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingTop: SPACING.md,
    paddingBottom: 280,
  },
  header: {
    marginBottom: SPACING.xxxl,
    alignItems: 'center',
  },
  headerCompact: {
    marginBottom: SPACING.md,
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
  roleSelectionCompact: {
    marginBottom: SPACING.md,
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
});

