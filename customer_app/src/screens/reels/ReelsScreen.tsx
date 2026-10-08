import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import { useIsFocused } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import Toast from 'react-native-toast-message';
import { reelService, Reel } from '../../services/reelService';
import { BASE_URL, resolveImageUrl } from '../../constants/config';
const { width, height } = Dimensions.get('window');

const LOCAL_VIDEOS: Record<string, any> = {
  'vid_44_1791365128.mp4': require('../../../assets/myvideos/vid_44_1791365128.mp4'),
  'vid_30_1791363480.mp4': require('../../../assets/myvideos/vid_30_1791363480.mp4'),
  'vid_30_1791358743.mp4': require('../../../assets/myvideos/vid_30_1791358743.mp4'),
  'vid_30_1791363091.mp4': require('../../../assets/myvideos/vid_30_1791363091.mp4'),
};

const ReelVideoPlayer = ({
  videoUrl,
  posterUrl,
  isPaused,
}: {
  videoUrl: string;
  posterUrl: string;
  isPaused: boolean;
}) => {
  const filename = videoUrl.split('/').pop()?.split('?')[0] || '';
  const resolvedVideoUri = resolveImageUrl(videoUrl);
  const resolvedPosterUri = resolveImageUrl(posterUrl);
  const initialSource = LOCAL_VIDEOS[filename] || (resolvedVideoUri ? { uri: resolvedVideoUri } : LOCAL_VIDEOS['vid_44_1791365128.mp4']);
  const [source, setSource] = useState<any>(initialSource);

  useEffect(() => {
    const fName = videoUrl.split('/').pop()?.split('?')[0] || '';
    const uri = resolveImageUrl(videoUrl);
    setSource(LOCAL_VIDEOS[fName] || (uri ? { uri } : LOCAL_VIDEOS['vid_44_1791365128.mp4']));
  }, [videoUrl]);

  return (
    <Video
      source={source}
      poster={resolvedPosterUri || undefined}
      posterResizeMode="cover"
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      repeat={true}
      paused={isPaused}
      muted={false}
      playInBackground={false}
      playWhenInactive={false}
      ignoreSilentSwitch="ignore"
      onError={() => {
        // If remote URL fails, fallback to bundled video
        if (source?.uri) {
          setSource(LOCAL_VIDEOS['vid_44_1791365128.mp4']);
        }
      }}
    />
  );
};

export const ReelsScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchReels();
  }, []);

  const isVideoFile = (url?: string) => {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.mov') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.mkv') ||
      clean.includes('/videos/') ||
      clean.includes('video') ||
      clean.includes('mixkit') ||
      clean.includes('youtube') ||
      clean.includes('youtu.be') ||
      clean.includes('vimeo')
    );
  };

  const fetchReels = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await reelService.getReels();
      // Only keep items that have a real playable video URL
      const videoOnly = (data || []).filter((item: Reel) => isVideoFile(item.video_url));
      setReels(videoOnly.length > 0 ? videoOnly : data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load videos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReels();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const decodeHtml = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  };

  const renderReelItem = ({ item, index }: { item: Reel; index: number }) => {
    const isCurrent = isFocused && currentIndex === index;
    const videoToPlay = item.video_url || '';
    const rawPoster = item.thumbnail_url || (!isVideoFile(item.video_url) ? item.video_url : null);
    const resolvedPoster = rawPoster ? resolveImageUrl(rawPoster) : 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&auto=format&fit=crop&q=80';

    let fullVideoUrl = resolveImageUrl(videoToPlay) || videoToPlay;
    if (!fullVideoUrl.startsWith('http://') && !fullVideoUrl.startsWith('https://')) {
      const clean = fullVideoUrl.startsWith('/') ? fullVideoUrl : `/${fullVideoUrl}`;
      fullVideoUrl = `${BASE_URL}${clean}`;
    }

    const hasVideo = isVideoFile(fullVideoUrl);

    return (
      <View style={[styles.reelContainer, { backgroundColor: '#000' }]}>
        {hasVideo ? (
          <ReelVideoPlayer
            videoUrl={fullVideoUrl}
            posterUrl={resolvedPoster}
            isPaused={!isCurrent}
          />
        ) : (
          <Image
            source={{ uri: resolvedPoster }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
          style={styles.overlay}
        >
          {/* Bottom Container: Left Info + Right Side Bottom Book Now Button */}
          <View style={styles.bottomRow}>
            {/* Left Info Panel: Laundry Name, Owner Name, Location */}
            <View style={styles.leftInfoPanel}>
              {/* Laundry Shop Name */}
              <Text style={styles.shopName} numberOfLines={1}>{decodeHtml(item.shopName || item.caption)}</Text>

              {/* Owner Name at laundry shop */}
              {item.ownerName ? (
                <Text style={styles.ownerText} numberOfLines={1}>
                  👤 Owner: {decodeHtml(item.ownerName)}
                </Text>
              ) : null}

              {/* Location that laundry */}
              {item.location ? (
                <View style={styles.locationRow}>
                  <Text style={styles.locationText} numberOfLines={1}>📍 {decodeHtml(item.location)}</Text>
                </View>
              ) : null}
            </View>

            {/* Book Now Button on Right Side Bottom */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.bookBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                const shopIdNum = item.shopId ? Number(item.shopId) : 44;
                navigation.navigate('Booking', {
                  shopId: shopIdNum,
                  shop_id: shopIdNum,
                  shopName: item.shopName || 'Star Wash Ultra Premium',
                  shop_name: item.shopName || 'Star Wash Ultra Premium',
                  ownerName: item.ownerName || 'Ashish Bhosale',
                  owner_name: item.ownerName || 'Ashish Bhosale',
                  shopLocation: item.location || 'Tathawade, Pune',
                  shop_address: item.location || 'Tathawade, Pune',
                  shopPhone: '9876543210',
                  shop_phone: '9876543210',
                  shop: {
                    id: shopIdNum,
                    name: item.shopName || 'Star Wash Ultra Premium',
                    owner_name: item.ownerName || 'Ashish Bhosale',
                    address: item.location || 'Tathawade, Pune',
                    phone: '9876543210',
                    rating: 4.9,
                    review_count: 28,
                  },
                });
              }}
            >
              <Text style={styles.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reels.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🎬</Text>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>No Videos Uploaded Yet</Text>
          <Text style={{ color: '#A0A0A0', fontSize: 13, marginTop: 4 }}>Laundry shop videos will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          renderItem={renderReelItem}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - 60}
          snapToAlignment="start"
          decelerationRate="fast"
          refreshing={refreshing}
          onRefresh={onRefresh}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    width: width,
    height: height - 60, // approximate screen height minus tab bar
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    padding: SPACING.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  leftInfoPanel: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  shopName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  ownerText: {
    color: '#F3F4F6',
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  locationText: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bookBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: SIZES.radius_lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    marginBottom: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
export default ReelsScreen;
