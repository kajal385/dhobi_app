import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';

const REVIEWS = [
  {
    id: 'R-1',
    customer: 'Pooja Verma',
    rating: 5,
    date: 'Yesterday',
    comment: 'Excellent dry cleaning! My silk saree came back spotless and fresh.',
    reply: 'Thank you Pooja! Glad you liked our service.',
    service: 'Dry Cleaning',
  },
  {
    id: 'R-2',
    customer: 'Amitabh Sharma',
    rating: 4,
    date: '3 days ago',
    comment: 'Great laundry service. Delivery was 10 mins late but quality is top notch.',
    reply: '',
    service: 'Wash & Fold',
  },
  {
    id: 'R-3',
    customer: 'Neha Gupta',
    rating: 5,
    date: '5 days ago',
    comment: 'Best laundry app in town! Stain removal on white shirt was magic.',
    reply: 'Thanks Neha! We take special care of white garments.',
    service: 'Stain Removal',
  },
];

const BEFORE_AFTER_PHOTOS = [
  { id: '1', title: 'Silk Saree Wine Stain', before: 'Stained', after: '100% Removed' },
  { id: '2', title: 'White Shirt Collar', before: 'Yellowed', after: 'Bright White' },
  { id: '3', title: 'Blazer Ink Mark', before: 'Ink Mark', after: 'Spotless' },
];

const REELS = [
  { id: '1', title: 'Steam Ironing Machine', views: '2.4k views', duration: '0:45' },
  { id: '2', title: 'Eco Dry Clean Process', views: '1.8k views', duration: '1:15' },
];

export const ReviewsAndMediaScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'Reviews' | 'Media'>('Media');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [reelsList, setReelsList] = useState(REELS);
  const [photoList, setPhotoList] = useState(BEFORE_AFTER_PHOTOS);

  const handleReply = (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text) {
      Alert.alert('Required', 'Please enter a reply message');
      return;
    }
    Alert.alert('Reply Sent! 💬', 'Your response to the customer has been posted.');
    setReplyText({ ...replyText, [reviewId]: '' });
  };

  const handleAddPhoto = () => {
    const newPhoto = {
      id: String(photoList.length + 1),
      title: `Stain Removal Sample #${photoList.length + 1}`,
      before: 'Before Wash',
      after: 'After Magic',
    };
    setPhotoList([...photoList, newPhoto]);
    Alert.alert('Success 🎉', 'Before/After stain removal photo added to your store showcase!');
  };

  const handleAddReel = () => {
    const newReel = {
      id: String(reelsList.length + 1),
      title: `Store Process Reel #${reelsList.length + 1}`,
      views: '0 views',
      duration: '0:30',
    };
    setReelsList([...reelsList, newReel]);
    Alert.alert('Success 🎥', 'Promotional video reel uploaded successfully!');
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews & Media Showcase</Text>
        </View>

        {/* Main Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Reviews' && styles.tabBtnActive]}
            onPress={() => setActiveTab('Reviews')}
          >
            <Text style={[styles.tabTxt, activeTab === 'Reviews' && styles.tabTxtActive]}>
              ⭐ Reviews ({REVIEWS.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Media' && styles.tabBtnActive]}
            onPress={() => setActiveTab('Media')}
          >
            <Text style={[styles.tabTxt, activeTab === 'Media' && styles.tabTxtActive]}>
              🎥 Showcase & Reels
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {activeTab === 'Reviews' && (
            <View>
              {/* Rating Summary Header */}
              <View style={styles.ratingSummary}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.bigScore}>4.8</Text>
                  <Text style={styles.scoreMax}>/ 5</Text>
                </View>
                <View style={styles.scoreDetails}>
                  <Text style={styles.starsTxt}>⭐⭐⭐⭐⭐</Text>
                  <Text style={styles.scoreSub}>Based on 142 Verified Reviews</Text>
                  <View style={styles.tagRow}>
                    <Text style={styles.ratingTag}>👍 98% Positive</Text>
                    <Text style={styles.ratingTag}>⚡ Fast Reply</Text>
                  </View>
                </View>
              </View>

              {/* Review Cards */}
              <Text style={styles.sectionTitle}>Recent Customer Reviews</Text>
              {REVIEWS.map((rev) => (
                <AppCard key={rev.id} style={styles.revCard}>
                  <View style={styles.revHeader}>
                    <View style={styles.custHeaderLeft}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarTxt}>{rev.customer.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={styles.custName}>{rev.customer}</Text>
                        <Text style={styles.revServiceTag}>{rev.service}</Text>
                      </View>
                    </View>
                    <Text style={styles.revDate}>{rev.date}</Text>
                  </View>

                  <View style={styles.starRow}>
                    <Text style={styles.stars}>{'⭐'.repeat(rev.rating)}</Text>
                    <Text style={styles.ratingNum}>{rev.rating}.0</Text>
                  </View>

                  <Text style={styles.comment}>{rev.comment}</Text>

                  {rev.reply ? (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyTitle}>💬 Store Owner Reply:</Text>
                      <Text style={styles.replyTxt}>{rev.reply}</Text>
                    </View>
                  ) : (
                    <View style={styles.replyInputContainer}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Write a response to this review..."
                        placeholderTextColor={COLORS.textLight}
                        value={replyText[rev.id] || ''}
                        onChangeText={(txt) => setReplyText({ ...replyText, [rev.id]: txt })}
                      />
                      <TouchableOpacity
                        style={styles.replySendBtn}
                        onPress={() => handleReply(rev.id)}
                      >
                        <Text style={styles.replySendTxt}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => Alert.alert('Reported', 'Review reported to admin for verification.')}
                  >
                    <Text style={styles.reportTxt}>🚩 Report Review</Text>
                  </TouchableOpacity>
                </AppCard>
              ))}
            </View>
          )}

          {activeTab === 'Media' && (
            <View>
              {/* Media Section Header Banner */}
              <View style={styles.mediaBanner}>
                <Text style={styles.mediaBannerTitle}>Store Media & Reel Showcase</Text>
                <Text style={styles.mediaBannerSub}>
                  Upload quality photos & reels to boost customer trust and attract 3x more bookings!
                </Text>
              </View>

              {/* 1. Before / After Stain Images Showcase */}
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>📷 Stain Removal Proof</Text>
                  <Text style={styles.sectionSub}>Before & after washing magic ({photoList.length} photos)</Text>
                </View>
                <TouchableOpacity style={styles.addMediaBtn} onPress={handleAddPhoto}>
                  <Text style={styles.addMediaBtnTxt}>+ Add Photo</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {photoList.map((item) => (
                  <View key={item.id} style={styles.photoCard}>
                    <View style={styles.photoMockupContainer}>
                      <View style={styles.beforeTag}>
                        <Text style={styles.tagTxt}>Before</Text>
                      </View>
                      <View style={styles.afterTag}>
                        <Text style={styles.tagTxt}>After</Text>
                      </View>
                      <Text style={styles.photoIcon}>✨</Text>
                    </View>
                    <Text style={styles.photoTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.photoStatus}>✅ {item.after}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* 2. Promotional Videos & Reels */}
              <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl }]}>
                <View>
                  <Text style={styles.sectionTitle}>🎥 Video Reels & Process</Text>
                  <Text style={styles.sectionSub}>Showcase machinery & ironing ({reelsList.length} videos)</Text>
                </View>
                <TouchableOpacity style={styles.addMediaBtn} onPress={handleAddReel}>
                  <Text style={styles.addMediaBtnTxt}>+ Upload Reel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reelsGrid}>
                {reelsList.map((reel) => (
                  <View key={reel.id} style={styles.reelCard}>
                    <View style={styles.reelThumbnail}>
                      <View style={styles.playCircle}>
                        <Text style={styles.playIcon}>▶</Text>
                      </View>
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationTxt}>{reel.duration}</Text>
                      </View>
                    </View>
                    <View style={styles.reelInfo}>
                      <Text style={styles.reelTitle} numberOfLines={1}>{reel.title}</Text>
                      <Text style={styles.reelViews}>👁️ {reel.views}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* 3. Shop Banners & Offers */}
              <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl }]}>
                <View>
                  <Text style={styles.sectionTitle}>🖼️ Shop Offer Banner</Text>
                  <Text style={styles.sectionSub}>Displays on Customer App main banner slider</Text>
                </View>
              </View>

              <View style={styles.bannerCard}>
                <View style={styles.bannerPreviewBox}>
                  <Text style={styles.bannerBadge}>ACTIVE BANNER</Text>
                  <Text style={styles.bannerTitle}>SuperClean Laundry Fest 🎉</Text>
                  <Text style={styles.bannerSub}>Get Flat 20% OFF on all Dry Cleaning Orders!</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeBannerBtn}
                  onPress={() => Alert.alert('Banner Update', 'Select new shop banner image from gallery.')}
                >
                  <Text style={styles.changeBannerTxt}>✏️ Update Shop Banner</Text>
                </TouchableOpacity>
              </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SPACING.md,
    padding: 4,
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius_md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 2,
  },
  tabTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabTxtActive: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  container: {
    padding: SPACING.lg,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: SIZES.radius_lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  bigScore: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
  },
  scoreMax: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.primary,
    marginTop: -4,
  },
  scoreDetails: {
    flex: 1,
  },
  starsTxt: { fontSize: 16, marginBottom: 2 },
  scoreSub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: 6,
  },
  ratingTag: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.success,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_xs,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  sectionSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  revCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  custHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  custName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
  revServiceTag: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  revDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textLight,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  stars: { fontSize: 13 },
  ratingNum: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  comment: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  replyBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  replyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyTxt: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
  replyInputContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  replyInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius_sm,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
  replySendBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    borderRadius: SIZES.radius_sm,
    justifyContent: 'center',
  },
  replySendTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  reportBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reportTxt: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.error,
  },
  mediaBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    elevation: 3,
  },
  mediaBannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
    marginBottom: 4,
  },
  mediaBannerSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.primaryLight,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addMediaBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radius_sm,
  },
  addMediaBtnTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  horizontalScroll: {
    marginBottom: SPACING.sm,
  },
  photoCard: {
    width: 150,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.sm,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoMockupContainer: {
    height: 100,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius_sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  beforeTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  afterTag: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTxt: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 9,
  },
  photoIcon: {
    fontSize: 28,
  },
  photoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
  },
  photoStatus: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
  },
  reelsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  reelCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reelThumbnail: {
    height: 110,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  playIcon: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationTxt: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  reelInfo: {
    padding: SPACING.sm,
  },
  reelTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  reelViews: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bannerCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  bannerPreviewBox: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius_sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerBadge: {
    color: COLORS.warning,
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  bannerSub: {
    color: COLORS.primaryLight,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  changeBannerBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: SIZES.radius_sm,
    alignItems: 'center',
  },
  changeBannerTxt: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});
