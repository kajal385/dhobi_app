import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, DARK_COLORS, SPACING } from '../../constants/theme';
import { updateProfile } from '../../store/authSlice';
import apiClient from '../../api/client';
import Toast from 'react-native-toast-message';
import { RootState } from '../../store';

export const ProfileSetupScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  const handleCompleteSetup = async () => {
    if (!name || !email) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please fill in both name and email fields.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/profile-setup', {
        name,
        email,
        referred_by: referral || null,
      });

      const updatedUser = response.data.data;
      dispatch(updateProfile(updatedUser));

      Toast.show({
        type: 'success',
        text1: 'Profile Configured',
        text2: 'Your account is ready for booking.',
      });

      // Navigate to Home dashboard stack
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Setup Failed',
        text2: error.response?.data?.message || 'Failed to complete profile creation',
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
          <Text style={[styles.title, { color: colors.text }]}>Create Profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Complete your profile details to personalize your orders.
          </Text>
        </View>

        <Input
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Email Address"
          placeholder="john.doe@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="Referral Code (Optional)"
          placeholder="Enter code if referred"
          autoCapitalize="characters"
          value={referral}
          onChangeText={setReferral}
        />

        <Button
          title="Complete Setup"
          onPress={handleCompleteSetup}
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
export default ProfileSetupScreen;
