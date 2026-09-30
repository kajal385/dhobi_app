import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useDispatch } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, DARK_COLORS, SPACING } from '../../constants/theme';
import { authSuccess } from '../../store/authSlice';
import apiClient from '../../api/client';
import Toast from 'react-native-toast-message';

export const OtpVerifyScreen = ({ route, navigation }: any) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

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
      const response = await apiClient.post('/auth/verify-otp', {
        mobile: phone,
        otp,
        country_code: '91',
      });

      const { user, access_token, is_new_user } = response.data.data;

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
      // else: App root will auto-switch to Home Stack based on auth status
    } catch (error: any) {
      console.error('Verify OTP error:', error.response?.data || error.message);
      const msg =
        error.response?.data?.message ||
        (error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join(', ')
          : null) ||
        'Invalid or expired OTP.';
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: msg,
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
