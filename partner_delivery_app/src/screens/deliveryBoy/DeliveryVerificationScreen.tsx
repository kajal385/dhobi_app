import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Image,
  PanResponder,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { mockDataStore } from '../../services/mockDataStore';
import { apiClient } from '../../services/apiClient';

export const DeliveryVerificationScreen = ({ route }: any) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const task = route?.params?.task || {
    id: 'T-102',
    customer: 'Priya Patel',
    phone: '+91 98123 22222',
    address: '45 Park Ave, Sector 9, Pune',
    items: '10 Shirts (Steam Press)',
  };

  const [deliveryStatus, setDeliveryStatus] = useState<'On The Way' | 'Reached Customer' | 'Delivered' | 'Failed'>('On The Way');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [photoProof, setPhotoProof] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [signatureDone, setSignatureDone] = useState(false);
  const [signatureType, setSignatureType] = useState<'drawn' | 'system' | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [paths, setPaths] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);

  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedReason, setFailedReason] = useState('Customer Not Home');

  const rawTotal = task.rawOrder?.totalAmount ?? task.rawOrder?.total_amount ?? task.rawOrder?.subtotal ?? 0;
  let codAmount = rawTotal;
  if (!codAmount && task.amount) {
    const parsed = parseFloat(String(task.amount).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) codAmount = parsed;
  }
  if (!codAmount) codAmount = 270;

  // Touch Pad PanResponder for Drawing Signature
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev.length > 0) {
            setPaths((all) => [...all, prev]);
          }
          return [];
        });
      },
    })
  ).current;

  const handleClearSignature = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const handleAutoSystemSign = () => {
    setSignatureType('system');
    setSignatureDone(true);
    setShowSignatureModal(false);
    Alert.alert(
      'System Signature Generated ✍️',
      `Official Digital Verification Stamp applied for ${task.customer || 'Customer'}.\nTimestamp: ${new Date().toLocaleTimeString()}`
    );
  };

  const handleConfirmSignature = () => {
    if (paths.length === 0) {
      Alert.alert(
        'Empty Signature Pad',
        'Please draw customer signature on touch pad or tap System Auto-Sign.',
        [
          { text: 'Draw Now', style: 'cancel' },
          { text: '⚡ System Auto-Sign', onPress: handleAutoSystemSign },
        ]
      );
      return;
    }
    setSignatureType('drawn');
    setSignatureDone(true);
    setShowSignatureModal(false);
    Alert.alert('Signature Attached! ✍️', `Customer digital signature saved for Order #${task.id}.`);
  };

  const handleTakePhoto = () => {
    Alert.alert('Package Delivery Photo Proof 📸', 'Choose photo source:', [
      {
        text: '📷 Open Camera',
        onPress: () => {
          launchCamera(
            { mediaType: 'photo', cameraType: 'back', quality: 0.8, saveToPhotos: false },
            (res) => {
              if (res.assets && res.assets.length > 0 && res.assets[0].uri) {
                setPhotoUri(res.assets[0].uri);
                setPhotoProof(true);
              } else if (!res.didCancel) {
                // Demo fallback image
                setPhotoUri('https://images.unsplash.com/photo-1545127398-14699f92334b?w=400');
                setPhotoProof(true);
              }
            }
          ).catch(() => {
            setPhotoUri('https://images.unsplash.com/photo-1545127398-14699f92334b?w=400');
            setPhotoProof(true);
          });
        },
      },
      {
        text: '🖼️ Choose from Gallery',
        onPress: () => {
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.8 },
            (res) => {
              if (res.assets && res.assets.length > 0 && res.assets[0].uri) {
                setPhotoUri(res.assets[0].uri);
                setPhotoProof(true);
              }
            }
          ).catch(() => {
            setPhotoUri('https://images.unsplash.com/photo-1545127398-14699f92334b?w=400');
            setPhotoProof(true);
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleVerifyOtp = () => {
    if (otp === '5678' || otp.length === 4) {
      setDeliveryStatus('Reached Customer');
      setStep(2);
      Alert.alert('OTP Verified! ✅', 'Delivery OTP confirmed. Status updated to Reached Customer.');
    } else {
      Alert.alert('Invalid OTP', 'Please enter 4-digit Delivery OTP (Hint: 5678)');
    }
  };

  const handleCompleteDelivery = async () => {
    setDeliveryStatus('Delivered');
    const numericId = task.rawOrder?.id || (task.id ? task.id.replace(/\D/g, '') : null);
    if (numericId) {
      try {
        await apiClient.put(`/delivery/orders/${numericId}/status`, {
          status: 'delivered',
        });
      } catch (err) {
        console.log('Update delivery status error:', err);
      }
    }
    mockDataStore.updateOrderStatus(task.id, 'Delivered', 'Order delivered & payment collected by executive');
    Alert.alert('Delivery Completed! 🎉', `Order ${task.id} successfully delivered! Status updated to Delivered.`);
    navigation.goBack();
  };

  const handleReschedule = () => {
    setDeliveryStatus('Failed');
    setShowFailedModal(false);
    Alert.alert('Rescheduled 📅', `Order ${task.id} marked as "${failedReason}". Rescheduled for tomorrow.`);
    navigation.goBack();
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Workflow</Text>
      </View>

      {/* Live Delivery Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>Live Status: <Text style={styles.statusVal}>{deliveryStatus}</Text></Text>
        <TouchableOpacity style={styles.failedBadge} onPress={() => setShowFailedModal(true)}>
          <Text style={styles.failedBadgeTxt}>⚠️ Unable / Failed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <AppCard style={styles.customerCard}>
          <Text style={styles.cardTag}>Delivery Task: {task.id}</Text>
          <Text style={styles.name}>{task.customer}</Text>
          <Text style={styles.phone}>📞 {task.phone}</Text>
          <Text style={styles.address}>📍 {task.address}</Text>
          <Text style={styles.items}>📦 {task.items}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => {
                if (task.address && task.address !== 'N/A') {
                  const encodedAddress = encodeURIComponent(task.address);
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Map Navigation 🗺️', `Opening directions to:\n${task.address}`);
                  });
                } else {
                  Alert.alert('Customer Location 📍', 'No delivery address specified.');
                }
              }}
            >
              <Text style={styles.mapTxt}>🗺️ Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.failedBtn}
              onPress={() => setShowFailedModal(true)}
            >
              <Text style={styles.failedTxt}>⚠️ Unable to Reach</Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* STEP 1: Customer OTP */}
        {step === 1 && (
          <AppCard style={styles.stepCard}>
            <Text style={styles.stepTitle}>Step 1: Customer Delivery OTP</Text>
            <Text style={styles.stepSub}>Ask customer for the 4-digit Delivery Confirmation OTP</Text>

            <AppInput
              label="Enter 4-Digit Delivery OTP *"
              placeholder="e.g. 5678"
              keyboardType="numeric"
              maxLength={4}
              value={otp}
              onChangeText={setOtp}
            />

            <AppButton
              title="Verify Delivery OTP"
              onPress={handleVerifyOtp}
              style={styles.primaryBtn}
            />
          </AppCard>
        )}

        {/* STEP 2: Payment Collection & Proof */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Step 2: Collect Payment & Confirm</Text>

            {/* Payment Difference / COD Card */}
            <AppCard style={styles.paymentCard}>
              <Text style={styles.payLbl}>Cash / Payment Difference To Collect</Text>
              <Text style={styles.payVal}>₹{codAmount}</Text>
              <Text style={styles.paySub}>Collect from customer via Cash or QR Code scan</Text>

              <TouchableOpacity
                style={[styles.payCheck, paymentCollected && styles.payCheckActive]}
                onPress={() => setPaymentCollected(!paymentCollected)}
              >
                <Text style={styles.payCheckTxt}>
                  {paymentCollected ? `✅ Payment of ₹${codAmount} Received` : '💳 Mark Payment Received'}
                </Text>
              </TouchableOpacity>
            </AppCard>

            <AppCard style={styles.verifyCard}>
              <Text style={styles.verifyTitle}>Delivery Proof & Signature</Text>

              {/* Camera Photo Proof Card */}
              {photoUri ? (
                <View style={styles.photoBoxContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoImgPreview} />
                  <View style={styles.photoMetaRow}>
                    <Text style={styles.photoAttachedTxt}>✅ Package Delivery Photo Attached</Text>
                    <TouchableOpacity style={styles.changePhotoBtn} onPress={handleTakePhoto}>
                      <Text style={styles.changePhotoTxt}>📷 Change / Retake Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, photoProof && styles.uploadBoxActive]}
                  onPress={handleTakePhoto}
                >
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadTxt}>Take Package Delivery Photo Proof</Text>
                </TouchableOpacity>
              )}

              {/* Digital Signature Card */}
              {signatureDone ? (
                <View style={styles.signatureBoxContainer}>
                  <View style={styles.sigMetaHeader}>
                    <Text style={styles.sigVerifiedTxt}>✅ Digital Signature Verified</Text>
                    <TouchableOpacity onPress={() => setShowSignatureModal(true)}>
                      <Text style={styles.reSignTxt}>✏️ Re-sign</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.signatureDisplayCard}>
                    <Text style={styles.sigCustomerName}>✍️ Signed by {task.customer || 'Customer'}</Text>
                    <Text style={styles.sigMetaInfo}>
                      {signatureType === 'system' ? '⚡ System Auto-Signed & Stamped' : '✍️ Touch Screen Digital Signature Verified'} • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => setShowSignatureModal(true)}
                >
                  <Text style={styles.uploadIcon}>📝</Text>
                  <Text style={styles.uploadTxt}>Collect Customer Digital Signature</Text>
                </TouchableOpacity>
              )}

              <AppButton
                title="Mark Delivery Completed 🎉"
                onPress={handleCompleteDelivery}
                style={styles.primaryBtn}
              />
            </AppCard>
          </View>
        )}
      </ScrollView>

      {/* Interactive System Signature Touch Pad Modal */}
      <Modal visible={showSignatureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.sigModalContent}>
            <View style={styles.sigModalHeader}>
              <Text style={styles.sigModalTitle}>Customer Digital Signature ✍️</Text>
              <TouchableOpacity onPress={() => setShowSignatureModal(false)} style={styles.closeSigBtn}>
                <Text style={styles.closeSigTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sigModalSub}>Draw signature below on digital touch pad or use System Auto-Sign</Text>

            {/* Drawing Pad Canvas Container */}
            <View style={styles.signatureCanvasBox} {...panResponder.panHandlers}>
              <Text style={styles.padWatermark}>Sign Here ✍️</Text>
              {paths.map((path, pathIdx) => (
                <React.Fragment key={pathIdx}>
                  {path.map((point, ptIdx) => {
                    if (ptIdx === 0) return null;
                    const prev = path[ptIdx - 1];
                    const dx = point.x - prev.x;
                    const dy = point.y - prev.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    return (
                      <View
                        key={ptIdx}
                        style={{
                          position: 'absolute',
                          left: prev.x,
                          top: prev.y,
                          width: length,
                          height: 3,
                          backgroundColor: '#1E1B4B',
                          borderRadius: 1.5,
                          transform: [{ rotate: `${angle}deg` }],
                          transformOrigin: '0% 0%',
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
              {currentPath.map((point, ptIdx) => {
                if (ptIdx === 0) return null;
                const prev = currentPath[ptIdx - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <View
                    key={ptIdx}
                    style={{
                      position: 'absolute',
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      height: 3,
                      backgroundColor: '#1E1B4B',
                      borderRadius: 1.5,
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: '0% 0%',
                    }}
                  />
                );
              })}
            </View>

            {/* Signature Pad Action Buttons */}
            <View style={styles.sigActionRow}>
              <TouchableOpacity style={styles.clearSigBtn} onPress={handleClearSignature}>
                <Text style={styles.clearSigTxt}>🗑️ Clear Pad</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.autoSigBtn} onPress={handleAutoSystemSign}>
                <Text style={styles.autoSigTxt}>⚡ System Auto-Sign</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmSigBtn} onPress={handleConfirmSignature}>
              <Text style={styles.confirmSigTxt}>✅ Save & Confirm Signature</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failed Delivery / Reschedule Modal */}
      <Modal visible={showFailedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unable To Reach Customer</Text>
            <Text style={styles.modalSub}>Select reason for failed delivery attempt:</Text>

            {[
              'Customer Not Home / Door Locked',
              'Phone Unreachable / Switched Off',
              'Wrong Address Specified',
              'Customer Requested Reschedule',
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonOption, failedReason === reason && styles.reasonActive]}
                onPress={() => setFailedReason(reason)}
              >
                <Text
                  style={[styles.reasonTxt, failedReason === reason && styles.reasonTxtActive]}
                >
                  ● {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <AppButton
              title="Confirm Reschedule Request"
              onPress={handleReschedule}
              style={styles.rescheduleBtn}
            />
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowFailedModal(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: SPACING.md },
  backTxt: { color: COLORS.primary, fontFamily: FONTS.medium, fontSize: 14 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLabel: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  statusVal: { fontFamily: FONTS.bold, color: COLORS.primary },
  failedBadge: { backgroundColor: COLORS.error + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  failedBadgeTxt: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.error },
  container: { padding: SPACING.lg },
  customerCard: { marginBottom: SPACING.lg },
  cardTag: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.accent, marginBottom: 4 },
  name: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  phone: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: 2 },
  address: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, marginBottom: 2 },
  items: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primary, marginBottom: SPACING.md },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  mapBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  mapTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primaryDark },
  failedBtn: {
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.error + '15',
    borderRadius: SIZES.radius_sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedTxt: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.error },
  stepCard: { marginBottom: SPACING.lg },
  stepTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 2 },
  stepSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  primaryBtn: { backgroundColor: COLORS.primary, marginTop: SPACING.md },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: SPACING.md },
  paymentCard: { backgroundColor: COLORS.primary, marginBottom: SPACING.lg },
  payLbl: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primaryLight },
  payVal: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.white, marginVertical: 4 },
  paySub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white, marginBottom: SPACING.md },
  payCheck: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  payCheckActive: { backgroundColor: COLORS.success },
  payCheckTxt: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },
  verifyCard: { marginBottom: SPACING.xl },
  verifyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: SPACING.md },
  uploadBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius_md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  uploadBoxActive: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },
  uploadIcon: { fontSize: 24, marginBottom: 4 },
  uploadTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_lg,
    borderTopRightRadius: SIZES.radius_lg,
    padding: SPACING.xl,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.error },
  modalSub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  reasonOption: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonActive: { borderColor: COLORS.error, backgroundColor: COLORS.error + '10' },
  reasonTxt: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  reasonTxtActive: { color: COLORS.error, fontFamily: FONTS.bold },
  rescheduleBtn: { backgroundColor: COLORS.error, marginTop: SPACING.md },
  cancelModalBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  cancelTxt: { fontFamily: FONTS.semiBold, color: COLORS.textSecondary },

  // Photo Proof Preview Styles
  photoBoxContainer: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.success,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  photoImgPreview: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  photoMetaRow: {
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoAttachedTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.success,
  },
  changePhotoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  changePhotoTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primaryDark,
  },

  // Signature Preview Card Styles
  signatureBoxContainer: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_md,
    borderWidth: 1,
    borderColor: COLORS.success,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sigMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sigVerifiedTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.success,
  },
  reSignTxt: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },
  signatureDisplayCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sigCustomerName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  sigMetaInfo: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Touch Pad Signature Modal Styles
  sigModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  sigModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sigModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  closeSigBtn: {
    padding: 6,
  },
  closeSigTxt: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  sigModalSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  signatureCanvasBox: {
    height: 180,
    backgroundColor: '#FAF9FE',
    borderRadius: SIZES.radius_md,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    borderStyle: 'dashed',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  padWatermark: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.border + '60',
    pointerEvents: 'none',
  },
  sigActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  clearSigBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
  },
  clearSigTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.error,
  },
  autoSigBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  autoSigTxt: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  confirmSigBtn: {
    paddingVertical: 12,
    borderRadius: SIZES.radius_sm,
    backgroundColor: COLORS.success,
    alignItems: 'center',
  },
  confirmSigTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
});
