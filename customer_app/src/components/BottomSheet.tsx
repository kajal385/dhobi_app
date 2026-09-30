import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  title?: string;
  children: React.ReactNode;
  height?: number;
}

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ title, children, height = SCREEN_HEIGHT * 0.5 }, ref) => {
    const isDark = useColorScheme() === 'dark';
    const colors = isDark ? DARK_COLORS : COLORS;

    const [visible, setVisible] = React.useState(false);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const open = () => {
      setVisible(true);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    };

    const close = () => {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    };

    useImperativeHandle(ref, () => ({
      open,
      close,
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.5) {
            close();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
        <View style={styles.overlay}>
          <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={close} />
          <Animated.View
            style={[
              styles.sheet,
              {
                height,
                backgroundColor: colors.card,
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.dragHandler}>
              <View style={[styles.dragBar, { backgroundColor: colors.border }]} />
            </View>
            {title && (
              <View style={styles.header}>
                <Text style={[styles.headerText, { color: colors.text }]}>{title}</Text>
              </View>
            )}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: SIZES.radius_xl,
    borderTopRightRadius: SIZES.radius_xl,
    overflow: 'hidden',
  },
  dragHandler: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
});
