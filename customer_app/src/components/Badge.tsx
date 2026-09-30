import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info', style }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  const getThemeStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)',
          text: colors.success,
        };
      case 'warning':
        return {
          bg: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.1)',
          text: colors.accent,
        };
      case 'error':
        return {
          bg: isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(239, 68, 68, 0.1)',
          text: colors.error,
        };
      case 'info':
      default:
        return {
          bg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)',
          text: colors.primary,
        };
    }
  };

  const currentTheme = getThemeStyles();

  return (
    <View style={[styles.badge, { backgroundColor: currentTheme.bg }, style]}>
      <Text style={[styles.text, { color: currentTheme.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radius_sm,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
