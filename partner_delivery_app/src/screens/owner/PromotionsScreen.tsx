import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';

const DEMO_OFFERS = [
  {
    id: '1',
    code: 'WELCOME50',
    title: '50% OFF First Order',
    discount: '50% Flat',
    validity: 'Valid till 31st Oct',
    usage: '142 Times Used',
    type: 'Coupon',
  },
  {
    id: '2',
    code: 'DIWALI20',
    title: 'Diwali Dry Clean Festival Offer',
    discount: '20% OFF on Dry Clean',
    validity: 'Festival Special',
    usage: '89 Times Used',
    type: 'Festival Offer',
  },
  {
    id: '3',
    code: 'REFER100',
    title: 'Refer & Earn ₹100 Laundry Credit',
    discount: '₹100 Bonus',
    validity: 'Ongoing',
    usage: '56 Referrals',
    type: 'Referral Offer',
  },
];

export const PromotionsScreen = () => {
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState(DEMO_OFFERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  const handleAddOffer = () => {
    if (!code || !title || !discount) {
      Alert.alert('Required', 'Please fill all coupon details');
      return;
    }
    const newOffer = {
      id: Date.now().toString(),
      code: code.toUpperCase(),
      title,
      discount,
      validity: 'Valid for 30 Days',
      usage: '0 Times Used',
      type: 'Discount Coupon',
    };
    setOffers([...offers, newOffer]);
    setShowAddModal(false);
    setCode('');
    setTitle('');
    setDiscount('');
    Alert.alert('Success', 'New Promotion Offer created!');
  };

  const handleSendPushNotification = () => {
    if (!pushTitle || !pushBody) {
      Alert.alert('Required', 'Please enter notification title and message');
      return;
    }
    setShowPushModal(false);
    setPushTitle('');
    setPushBody('');
    Alert.alert('Broadcast Sent! 📲', 'Push notification broadcasted to all shop customers!');
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Promotions & Offers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addTxt}>+ Create Offer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Broadcast Push Banner */}
        <TouchableOpacity style={styles.pushBanner} onPress={() => setShowPushModal(true)}>
          <View style={styles.pushContent}>
            <Text style={styles.pushTitle}>📲 Send Push Notification</Text>
            <Text style={styles.pushSub}>Broadcast offers & festival updates to all customers instantly</Text>
          </View>
          <Text style={styles.pushArrow}>➔</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Active Discount Coupons & Offers</Text>

        {offers.map((offer) => (
          <AppCard key={offer.id} style={styles.offerCard}>
            <View style={styles.cardHeader}>
              <View style={styles.codeTag}>
                <Text style={styles.codeTxt}>🎟️ {offer.code}</Text>
              </View>
              <Text style={styles.typeTxt}>{offer.type}</Text>
            </View>

            <Text style={styles.titleTxt}>{offer.title}</Text>
            <Text style={styles.discountTxt}>Discount: {offer.discount}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaTxt}>⏳ {offer.validity}</Text>
              <Text style={styles.usageTxt}>🔥 {offer.usage}</Text>
            </View>
          </AppCard>
        ))}
      </ScrollView>

      {/* Add Coupon Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Promotional Offer</Text>

            <AppInput
              label="Coupon Code *"
              placeholder="e.g. SUMMER20"
              value={code}
              onChangeText={setCode}
            />
            <AppInput
              label="Offer Title *"
              placeholder="e.g. Summer Special 20% OFF"
              value={title}
              onChangeText={setTitle}
            />
            <AppInput
              label="Discount Value *"
              placeholder="e.g. 20% Flat or ₹100 OFF"
              value={discount}
              onChangeText={setDiscount}
            />

            <AppButton title="Publish Offer" onPress={handleAddOffer} style={styles.saveBtn} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Push Notification Modal */}
      <Modal visible={showPushModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Broadcast Push Notification</Text>
            <Text style={styles.subText}>This notification will be sent to all your registered customers.</Text>

            <AppInput
              label="Notification Title *"
              placeholder="e.g. Festive Discount Alert! 🎉"
              value={pushTitle}
              onChangeText={setPushTitle}
            />
            <AppInput
              label="Message Body *"
              placeholder="e.g. Get 20% OFF on all Dry Cleaning orders this week!"
              value={pushBody}
              onChangeText={setPushBody}
            />

            <AppButton title="Broadcast Now 🚀" onPress={handleSendPushNotification} style={styles.saveBtn} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPushModal(false)}>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  addTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  container: {
    padding: SPACING.lg,
  },
  pushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.lg,
    borderRadius: SIZES.radius_md,
    marginBottom: SPACING.xl,
  },
  pushContent: { flex: 1 },
  pushTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primaryDark,
  },
  pushSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2,
  },
  pushArrow: {
    fontSize: 20,
    color: COLORS.primaryDark,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  offerCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  codeTag: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radius_sm,
  },
  codeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  typeTxt: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  titleTxt: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  discountTxt: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  metaTxt: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  usageTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_lg,
    borderTopRightRadius: SIZES.radius_lg,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
  },
  subText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  cancelTxt: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
});
