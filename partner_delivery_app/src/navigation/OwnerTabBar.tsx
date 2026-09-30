import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

const { width: W } = Dimensions.get('window');
const TAB_W = W / 5;

const TABS = [
  { name: 'Dashboard', label: 'Dashboard', emoji: '🏠' },
  { name: 'Orders', label: 'Orders', emoji: '📦' },
  { name: 'Services', label: 'Services', emoji: '🧺' },
  { name: 'Team', label: 'Team', emoji: '🛵' },
  { name: 'Settings', label: 'Settings', emoji: '⚙️' },
];

const BAR_HEIGHT = 62;
const BUBBLE_SIZE = 54;
const BUBBLE_RISE = 26;

const TabItem = ({
  tab,
  index,
  activeIndex,
  onPress,
}: {
  tab: typeof TABS[0];
  index: number;
  activeIndex: number;
  onPress: (name: string, index: number) => void;
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
      }),
      Animated.spring(yAnim, {
        toValue: focused ? -BUBBLE_RISE : 0,
        useNativeDriver: true,
        damping: 10,
        stiffness: 260,
      }),
      Animated.spring(emojiScale, {
        toValue: focused ? 1.25 : 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 260,
      }),
    ]).start();
  }, [focused]);

  return (
    <Pressable style={styles.tabItem} onPress={() => onPress(tab.name, index)}>
      <Animated.View
        style={[
          styles.bubble,
          {
            transform: [{ translateY: yAnim }, { scale: scaleAnim }],
            backgroundColor: COLORS.primaryLight,
            borderColor: COLORS.primary,
          },
        ]}
      >
        <Animated.Text style={{ fontSize: 24, transform: [{ scale: emojiScale }] }}>
          {tab.emoji}
        </Animated.Text>
      </Animated.View>

      {!focused && (
        <View style={styles.inactiveWrap}>
          <Text style={styles.inactiveEmoji}>{tab.emoji}</Text>
          <Text style={styles.inactiveLabel}>{tab.label}</Text>
        </View>
      )}

      {focused && <Text style={styles.activeLabel}>{tab.label}</Text>}
    </Pressable>
  );
};

const Pill = ({ activeIndex }: { activeIndex: number }) => {
  const x = useRef(new Animated.Value(activeIndex * TAB_W + TAB_W / 2 - 20)).current;
  useEffect(() => {
    Animated.spring(x, {
      toValue: activeIndex * TAB_W + TAB_W / 2 - 20,
      useNativeDriver: true,
      damping: 14,
      stiffness: 200,
    }).start();
  }, [activeIndex]);
  return <Animated.View style={[styles.pill, { transform: [{ translateX: x }] }]} />;
};

export const OwnerTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const active = state.index;

  const go = (name: string, idx: number) => {
    if (state.index !== idx) navigation.navigate(name);
  };

  return (
    <View style={styles.outerWrapper}>
      <View
        style={[
          styles.bar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <Pill activeIndex={active} />
        <View style={styles.row}>
          {TABS.map((tab, i) => (
            <TabItem
              key={tab.name}
              tab={tab}
              index={i}
              activeIndex={active}
              onPress={go}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    overflow: 'visible',
    paddingTop: BUBBLE_RISE,
    marginTop: -BUBBLE_RISE,
  },
  bar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    marginBottom: -4,
  },
  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    top: 2,
    elevation: 8,
  },
  inactiveWrap: {
    alignItems: 'center',
    paddingTop: 4,
  },
  inactiveEmoji: { fontSize: 18 },
  inactiveLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
});
