import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, DARK_COLORS, SPACING } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { RootState } from '../../store';
import { authStart, authSuccess, authFailure } from '../../store/authSlice';
import apiClient from '../../api/client';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import Toast from 'react-native-toast-message';

export const PhoneInputScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, colors } = useTheme();

  const handleSendOtp = async () => {
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone Number',
        text2: 'Please enter a valid 10-digit mobile number.',
      });
      return;
    }

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      let confirmation: any = null;
      try {
        confirmation = await firebaseAuthService.sendPhoneOtp(cleanPhone, '91');
      } catch (fbErr: any) {
        console.warn('Firebase sendOtp error, falling back to backend:', fbErr?.message);
        await apiClient.post('/auth/send-otp', {
          mobile: cleanPhone,
          country_code: '91',
        });
      }

      Toast.show({
        type: 'success',
        text1: 'OTP Sent ✅',
        text2: `Verification code sent to +91 ${cleanPhone}`,
      });

      navigation.navigate('OtpVerify', { phone: cleanPhone, confirmation });
    } catch (error: any) {
      console.error('Send OTP error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Failed to send OTP',
        text2: error.message || 'Could not send verification code. Please try again.',
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
          <Text style={[styles.title, { color: colors.text }]}>Enter Phone Number</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We'll send a 6-digit verification code to log in.
          </Text>
        </View>

        <Input
          label="Mobile Number"
          placeholder="Enter 10-digit number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          iconLeft={<Text style={{ color: colors.textSecondary, marginRight: SPACING.xs }}>+91</Text>}
        />

        <Button
          title="Send OTP"
          onPress={handleSendOtp}
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
export default PhoneInputScreen;
