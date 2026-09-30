import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  Share,
  ActivityIndicator,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import Toast from 'react-native-toast-message';
import { reelService, Reel } from '../../services/reelService';

const { width, height } = Dimensions.get('window');

export const ReelsScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const data = await reelService.getReels();
      setReels(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load reels',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (id: string) => {
    setReels(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newLiked = !item.isLiked;
          return {
            ...item,
            isLiked: newLiked,
            likes: newLiked ? item.likes + 1 : item.likes - 1,
          };
        }
        return item;
      })
    );
  };

  const handleSave = (id: string) => {
    setReels(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newSaved = !item.isSaved;
          Toast.show({
            type: 'success',
            text1: newSaved ? 'Saved to collection' : 'Removed from saved',
          });
          return { ...item, isSaved: newSaved };
        }
        return item;
      })
    );
  };

  const handleFollow = (id: string) => {
    setReels(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newFollow = !item.isFollowing;
          Toast.show({
            type: 'success',
            text1: newFollow ? `Following ${item.shopName}` : `Unfollowed ${item.shopName}`,
          });
          return { ...item, isFollowing: newFollow };
        }
        return item;
      })
    );
  };

  const handleShare = async (item: Reel) => {
    try {
      await Share.share({
        message: `Check out ${item.shopName}'s service: ${item.service}! Offer: ${item.offer}. Book now on DhobiPro!`,
      });
    } catch (e: any) {
      console.log(e.message);
    }
  };

  const renderReelItem = ({ item }: { item: Reel }) => {
    // We use a dummy laundry video GIF to make it feel like a real reel
    const dummyGif = 'https://media.giphy.com/media/26FPJGjhefSJuaRhu/giphy.gif';

    return (
      <View style={[styles.reelContainer, { backgroundColor: '#000' }]}>
        <Image
          source={{ uri: dummyGif }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
          style={styles.overlay}
        >
          {/* Subtle play indicator */}
          <View style={styles.centerGraphics}>
            <Text style={styles.graphicsEmoji}>▶️</Text>
          </View>

          {/* Left Side Info Panel */}
          <View style={styles.leftInfoPanel}>
            <View style={styles.shopRow}>
              <Text style={styles.shopName}>{item.shopName}</Text>
              <TouchableOpacity
                onPress={() => handleFollow(item.id)}
                style={[
                  styles.followBtn,
                  { backgroundColor: item.isFollowing ? 'rgba(255,255,255,0.2)' : colors.primary },
                ]}
              >
                <Text style={styles.followBtnText}>
                  {item.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{item.service}</Text>
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>🎉 {item.offer}</Text>
            </View>

            {/* Book Now Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.bookBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('Booking', { shopName: item.shopName })}
            >
              <Text style={styles.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>

          {/* Right Side Buttons Panel */}
          <View style={styles.rightButtonsPanel}>
            {/* Like */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
              <Text style={styles.actionEmoji}>{item.isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.actionCount}>{item.likes}</Text>
            </TouchableOpacity>

            {/* Comment/Share */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
              <Text style={styles.actionEmoji}>✈️</Text>
              <Text style={styles.actionCount}>Share</Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleSave(item.id)}>
              <Text style={styles.actionEmoji}>{item.isSaved ? '⭐️' : '☆'}</Text>
              <Text style={styles.actionCount}>Save</Text>
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
      ) : (
        <FlatList
          data={reels}
          renderItem={renderReelItem}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - 60} // Height of screen minus bottom tab bar roughly
          snapToAlignment="start"
          decelerationRate="fast"
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
  centerGraphics: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  graphicsEmoji: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  graphicsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.8,
  },
  leftInfoPanel: {
    width: '80%',
    marginBottom: SPACING.xl,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  shopName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: SPACING.md,
  },
  followBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius_sm,
  },
  followBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    color: '#E0E0E0',
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  offerBadge: {
    backgroundColor: 'rgba(232, 100, 58, 0.25)',
    borderWidth: 1,
    borderColor: '#E8643A',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SIZES.radius_full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  offerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bookBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: SIZES.radius_lg,
    alignItems: 'center',
    width: 160,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  rightButtonsPanel: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xxl + 40,
    alignItems: 'center',
    gap: SPACING.xl,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default ReelsScreen;
