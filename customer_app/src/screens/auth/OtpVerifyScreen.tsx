import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, DARK_COLORS, SPACING } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { authSuccess } from '../../store/authSlice';
import apiClient from '../../api/client';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import Toast from 'react-native-toast-message';

export const OtpVerifyScreen = ({ route, navigation }: any) => {
  const { phone } = route.params;
  const [confirmation, setConfirmation] = useState<any>(route.params?.confirmation || null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const dispatch = useDispatch();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    setTimer(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      if (confirmation) {
        const newConfirmation = await firebaseAuthService.sendPhoneOtp(phone, '91');
        setConfirmation(newConfirmation);
      } else {
        await apiClient.post('/auth/send-otp', { mobile: phone });
      }

      Toast.show({
        type: 'success',
        text1: 'OTP Resent Successfully! 📩',
        text2: 'A new 6-digit verification code has been sent.',
      });
      setTimer(30);
      setCanResend(false);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: e.message || 'Could not resend OTP. Please try again.',
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Invalid OTP',
        text2: 'Please enter a valid 6-digit OTP code.',
      });
      return;
    }

    setLoading(true);
    try {
      let user: any = null;
      let access_token: string = '';
      let is_new_user: boolean = false;

      if (confirmation) {
        // 1. Confirm OTP with Firebase
        const credential = await firebaseAuthService.confirmOtp(confirmation, otp);
        const idToken = await credential.user.getIdToken();

        // 2. Synchronize with Laravel backend
        const syncRes = await firebaseAuthService.syncWithBackend(phone, idToken, 'customer');
        user = syncRes.user;
        access_token = syncRes.access_token || syncRes.token || '';
        is_new_user = Boolean(syncRes.is_new_user);
      } else {
        // Fallback to backend verification
        const response = await apiClient.post('/auth/verify-otp', {
          mobile: phone,
          otp,
          country_code: '91',
        });
        const data = response.data.data;
        user = data.user;
        access_token = data.access_token;
        is_new_user = Boolean(data.is_new_user);
      }

      // Dispatch token & profile to Redux Store
      dispatch(authSuccess({ user, token: access_token }));

      Toast.show({
        type: 'success',
        text1: 'Welcome to DhobiPro! 🎉',
        text2: user?.name ? `Hello, ${user.name}!` : 'Login successful',
      });

      if (is_new_user) {
        navigation.navigate('ProfileSetup');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Invalid or expired OTP. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 6-digit verification code sent to +91 {phone}.
          </Text>
        </View>

        <Input
          label="Verification Code"
          placeholder="Enter 6-digit OTP"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          style={{ letterSpacing: 8, textAlign: 'center' }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: SPACING.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Didn't receive code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={!canResend || resending}>
            <Text style={{
              color: canResend ? colors.primary : colors.textLight,
              fontSize: 14,
              fontWeight: '700',
              textDecorationLine: canResend ? 'underline' : 'none',
            }}>
              {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Verify OTP"
          onPress={handleVerify}
          loading={loading}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    marginTop: SPACING.lg,
  },
});
export default OtpVerifyScreen;
