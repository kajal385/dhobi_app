import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  useColorScheme,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, DARK_COLORS } from '../constants/theme';

const { width: W } = Dimensions.get('window');
const TAB_W = W / 5;

// Orders · Near By · Home · Video · Profile
const TABS = [
  { name: 'Orders', label: 'Orders', emoji: '🧺' },
  { name: 'NearByTab', label: 'Near By', emoji: '📍' },
  { name: 'HomeTab', label: 'Home', emoji: '🏠' },
  { name: 'Reels', label: 'Video', emoji: '🎬' },
  { name: 'ProfileTab', label: 'Profile', emoji: '👤' },
];

const BAR_HEIGHT = 62;
const BUBBLE_SIZE = 56;
const BUBBLE_RISE = 30; // how many px the bubble rises above bar top

/* ─── Individual Tab ──────────────────────────────────────────── */
const TabItem = ({
  tab, index, activeIndex, onPress, colors,
}: {
  tab: typeof TABS[0];
  index: number;
  activeIndex: number;
  onPress: (name: string, index: number) => void;
  colors: typeof COLORS;
}) => {
  const focused = index === activeIndex;

  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const yAnim = useRef(new Animated.Value(focused ? -BUBBLE_RISE : 0)).current;
  const emojiScale = useRef(new Animated.Value(focused ? 1.2 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        damping: 10,
        stiffness: 260,
        mass: 0.8,
      }),
      Animated.spring(yAnim, {
        toValue: focused ? -BUBBLE_RISE : 0,
        useNativeDriver: true,
        damping: 10,
        stiffness: 260,
        mass: 0.8,
      }),
      Animated.spring(emojiScale, {
        toValue: focused ? 1.3 : 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 260,
      }),
    ]).start();
  }, [focused]);

  return (
    <Pressable
      style={styles.tabItem}
      onPress={() => onPress(tab.name, index)}
    >
      {/* ── Floating Bubble ── */}
      <Animated.View
        style={[
          styles.bubble,
          {
            transform: [{ translateY: yAnim }, { scale: scaleAnim }],
            backgroundColor: colors.primaryLight,
            borderColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
      >
        <Animated.Text style={{ fontSize: 26, transform: [{ scale: emojiScale }] }}>
          {tab.emoji}
        </Animated.Text>
      </Animated.View>

      {/* ── Inactive: emoji + label ── */}
      {!focused && (
        <View style={styles.inactiveWrap}>
          <Text style={styles.inactiveEmoji}>{tab.emoji}</Text>
          <Text style={[styles.inactiveLabel, { color: colors.textSecondary }]}>
            {tab.label}
          </Text>
        </View>
      )}

      {/* ── Active label (below bubble) ── */}
      {focused && (
        <Text style={[styles.activeLabel, { color: colors.primary }]}>
          {tab.label}
        </Text>
      )}
    </Pressable>
  );
};

/* ─── Sliding Pill at top of bar ─────────────────────────────── */
const Pill = ({ activeIndex, colors }: { activeIndex: number; colors: typeof COLORS }) => {
  const x = useRef(new Animated.Value(activeIndex * TAB_W + TAB_W / 2 - 20)).current;
  useEffect(() => {
    Animated.spring(x, {
      toValue: activeIndex * TAB_W + TAB_W / 2 - 20,
      useNativeDriver: true,
      damping: 14,
      stiffness: 200,
    }).start();
  }, [activeIndex]);
  return (
    <Animated.View
      style={[styles.pill, { backgroundColor: colors.primary, transform: [{ translateX: x }] }]}
    />
  );
};

/* ─── Main Tab Bar ────────────────────────────────────────────── */
export const CustomTabBar = ({ state, navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const insets = useSafeAreaInsets();
  const active = state.index;

  const go = (name: string, idx: number) => {
    if (state.index !== idx) navigation.navigate(name);
  };

  return (
    /* outer wrapper: extra top space = BUBBLE_RISE so bubble isn't clipped */
    <View style={[
      styles.outerWrapper,
      {
        backgroundColor: 'transparent',
      },
    ]}>
      {/* Bar card */}
      <View style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}>
        <Pill activeIndex={active} colors={colors} />
        <View style={styles.row}>
          {TABS.map((tab, i) => (
            <TabItem
              key={tab.name}
              tab={tab}
              index={i}
              activeIndex={active}
              onPress={go}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

/* ─── Styles ──────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // wrapper that gives room for bubble to float above bar
  outerWrapper: {
    // we don't clip overflow here so bubble can rise
    overflow: 'visible',
    // top padding = rise amount so bubble is inside layout space
    paddingTop: BUBBLE_RISE,
    // pull it up so bar sits at screen bottom normally
    marginTop: -BUBBLE_RISE,
  },

  bar: {
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 18,
    overflow: 'visible',
  },

  pill: {
    width: 40,
    height: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: -4,
  },

  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    alignItems: 'center',
    overflow: 'visible',
  },

  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    overflow: 'visible',
  },

  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // sits at "top of tab area" before translateY kicks in
    top: 4,
    // shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 14,
  },

  inactiveWrap: {
    alignItems: 'center',
    paddingTop: 4,
  },
  inactiveEmoji: { fontSize: 20 },
  inactiveLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  activeLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});

export default CustomTabBar;
