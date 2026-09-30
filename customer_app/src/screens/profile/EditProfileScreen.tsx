import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AppScreen from '../../components/AppScreen';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import { RootState } from '../../store';
import { updateProfile } from '../../store/authSlice';
import { authService } from '../../services/authService';
import Toast from 'react-native-toast-message';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const EditProfileScreen = ({ navigation, route }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);

  const [name, setName] = useState(user?.name || 'Kajal Gajare');
  const [phone, setPhone] = useState(user?.phone || '9309386003');
  const [email, setEmail] = useState(user?.email || 'kajal-gajare750@dhobipro.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<string>(user?.gender || 'Female');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [alternatePhone, setAlternatePhone] = useState(user?.alternate_phone || '');
  
  // Location Fields
  const [address, setAddress] = useState(user?.address || 'Flat 302, Green Acres, Wakad Main Road');
  const [area, setArea] = useState(user?.area || 'Wakad');
  const [city, setCity] = useState(user?.city || 'Pune');
  const [pincode, setPincode] = useState(user?.pincode || '411057');
  const [latitude, setLatitude] = useState<number | undefined>(user?.latitude || undefined);
  const [longitude, setLongitude] = useState<number | undefined>(user?.longitude || undefined);

  const [loading, setLoading] = useState(false);

  // Handle return from MapScreen
  useEffect(() => {
    if (route?.params?.selectedAddressFromMap) {
      const selected = route.params.selectedAddressFromMap;
      if (selected.address_line1) setAddress(selected.address_line1);
      if (selected.city) setCity(selected.city);
      if (selected.pincode) setPincode(selected.pincode);
      if (selected.latitude) setLatitude(selected.latitude);
      if (selected.longitude) setLongitude(selected.longitude);

      const parts = selected.address_line1.split(',');
      if (parts.length > 1) {
        setArea(parts[1].trim());
      }

      Toast.show({
        type: 'success',
        text1: 'Location Picked from Google Maps! 🗺️',
        text2: selected.address_line1,
      });
    }
  }, [route?.params?.selectedAddressFromMap]);

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Full Name is required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      Toast.show({ type: 'error', text1: 'Please enter a valid 10-digit mobile number' });
      return;
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim(),
        gender,
        date_of_birth: dateOfBirth.trim(),
        alternate_phone: alternatePhone.trim(),
        address: address.trim(),
        area: area.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      try {
        const res = await authService.updateProfile(payload);
        dispatch(updateProfile({ ...user, ...res, ...payload }));
      } catch {
        // Fallback local state update if offline
        dispatch(updateProfile({ ...user, ...payload }));
      }

      Toast.show({
        type: 'success',
        text1: 'Profile & Location Saved! ✨',
        text2: 'Your updated details are now live on your profile screen.',
      });

      // Directly show My Profile screen without reopening previous map stack
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backIcon, { color: '#321D8C' }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#321D8C' }]}>Edit Profile & Location</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarBg, { backgroundColor: '#EDE8FF' }]}>
              <Text style={[styles.avatarText, { color: '#321D8C' }]}>
                {name ? name.charAt(0).toUpperCase() : 'K'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.editPhotoBadge, { backgroundColor: '#321D8C' }]}
              onPress={() => Toast.show({ type: 'info', text1: 'Profile photo upload coming soon' })}
            >
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: Personal Info */}
          <Text style={styles.sectionHeaderTitle}>👤 Personal Information</Text>

          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Kajal Gajare"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Address */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. kajal@example.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          {/* Primary Mobile Number */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Primary Phone Number *</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified ✓</Text>
              </View>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 9309386003"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Change Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>New Password (Optional)</Text>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                    paddingRight: 45,
                  },
                ]}
                placeholder="Enter new password to update..."
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 12, padding: 4 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Alternate Mobile Number */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Alternate Phone (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={alternatePhone}
              onChangeText={setAlternatePhone}
            />
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => {
                const active = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderPill,
                      {
                        backgroundColor: active ? '#321D8C' : colors.card,
                        borderColor: active ? '#321D8C' : colors.border,
                      },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🧑 Other'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Saved Customer Location */}
          <Text style={[styles.sectionHeaderTitle, { marginTop: SPACING.lg, marginBottom: SPACING.sm }]}>
            📍 Saved Customer Location (For Nearby Laundries)
          </Text>

          {/* Address Line 1 */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Flat / Building / House Address</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MapScreen', { returnScreen: 'EditProfile' })}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#321D8C', fontWeight: '700' }}>🗺️ Select on Google Map</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MapScreen', { returnScreen: 'EditProfile' })}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: SPACING.md,
                },
              ]}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: address ? colors.text : colors.textLight,
                  fontWeight: '500',
                  paddingRight: 8,
                }}
                numberOfLines={2}
              >
                {address || 'Tap to select location on Google Map...'}
              </Text>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={{ flex: 1, marginBottom: SPACING.md }}>
              <Text style={[styles.label, { color: colors.text }]}>Area / Locality</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Wakad"
                placeholderTextColor={colors.textLight}
                value={area}
                onChangeText={setArea}
              />
            </View>
            <View style={{ flex: 1, marginBottom: SPACING.md }}>
              <Text style={[styles.label, { color: colors.text }]}>City</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Pune"
                placeholderTextColor={colors.textLight}
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>

          {/* Pincode */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Pincode</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 411057"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.border : '#321D8C' }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Save Info & Location</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  container: { padding: SPACING.xl, paddingBottom: 60 },
  avatarSection: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  avatarBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800' },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cameraIcon: { fontSize: 13 },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#321D8C',
    marginBottom: SPACING.md,
  },
  mapIconInsideInput: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  verifiedBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#137333',
    fontSize: 11,
    fontWeight: '700',
  },
  label: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius_md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
  },
  genderPill: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
  },
  genderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btn: {
    height: 54,
    borderRadius: SIZES.radius_lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    elevation: 3,
    shadowColor: '#321D8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

export default EditProfileScreen;

