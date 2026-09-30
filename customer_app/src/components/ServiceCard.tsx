import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';

interface ServiceCardProps {
  icon: string;
  title: string;
  subtitle: string;
  bgColor: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  icon,
  title,
  subtitle,
  bgColor,
  onPress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: isDark ? colors.card : bgColor, borderColor: colors.border }]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radius_lg,
    padding: SPACING.lg,
    alignItems: 'center',
    width: '47%',
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  icon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
});
