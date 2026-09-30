import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';

// Example screen that handles both Pickup and Delivery workflows
export const TaskWorkflowScreen = ({ _route }: any) => {
  const insets = useSafeAreaInsets();
  // In a real app, task details would be passed via route.params
  const taskType = 'Pickup'; // or 'Delivery'
  
  const [step, setStep] = useState(0); // 0: Reached, 1: OTP, 2: Details/Photo, 3: Signature
  const [otp, setOtp] = useState('');
  const [quantity, setQuantity] = useState(5);

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
    else console.log('Task Completed!');
  };

  const renderReachedStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Navigate to Customer</Text>
      <Text style={styles.customerDetail}>Rahul Sharma</Text>
      <Text style={styles.addressDetail}>123 Main St, Sector 4</Text>
      
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>[ Map Integration Placeholder ]</Text>
      </View>
      
      <AppButton title="I have reached the location" onPress={handleNextStep} />
    </View>
  );

  const renderOtpStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Verify OTP</Text>
      <Text style={styles.stepDesc}>Ask the customer for their 4-digit {taskType} OTP.</Text>
      
      <AppInput 
        placeholder="Enter 4-digit OTP" 
        keyboardType="number-pad" 
        maxLength={4}
        value={otp}
        onChangeText={setOtp}
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
      />
      
      <AppButton 
        title="Verify OTP" 
        onPress={handleNextStep} 
        disabled={otp.length !== 4} 
      />
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{taskType === 'Pickup' ? 'Update Quantity & Photos' : 'Upload Delivery Proof'}</Text>
      
      {taskType === 'Pickup' && (
        <AppCard style={{ marginBottom: SPACING.lg }}>
          <Text style={styles.sectionLabel}>Actual Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </AppCard>
      )}

      <AppCard style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.sectionLabel}>Capture Photos</Text>
        <TouchableOpacity style={styles.photoUploadBox}>
          <Text style={styles.photoUploadText}>+ Take Photo</Text>
        </TouchableOpacity>
      </AppCard>

      <AppButton title="Confirm Details" onPress={handleNextStep} />
    </View>
  );

  const renderSignatureStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Customer Signature</Text>
      <Text style={styles.stepDesc}>Please ask the customer to sign below to confirm the {taskType}.</Text>
      
      <View style={styles.signatureBox}>
        <Text style={styles.signaturePlaceholder}>[ Digital Signature Pad Placeholder ]</Text>
      </View>
      
      <AppButton title={`Complete ${taskType}`} onPress={handleNextStep} />
    </View>
  );

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{taskType} Workflow</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {step === 0 && renderReachedStep()}
        {step === 1 && renderOtpStep()}
        {step === 2 && renderDetailsStep()}
        {step === 3 && renderSignatureStep()}
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
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  container: {
    padding: SPACING.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  stepDesc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  customerDetail: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  addressDetail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: SIZES.radius_md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  mapText: {
    fontFamily: FONTS.medium,
    color: COLORS.textLight,
  },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primaryDark,
  },
  qtyText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
  },
  photoUploadBox: {
    height: 120,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius_md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  photoUploadText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },
  signatureBox: {
    height: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xl,
  },
  signaturePlaceholder: {
    fontFamily: FONTS.medium,
    color: COLORS.textLight,
  },
});
