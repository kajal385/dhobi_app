import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { COLORS, SIZES, SPACING, FONTS } from '../theme';

interface AppCardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  onPress,
  style,
  children,
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;
  
  return (
    <CardContainer 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {title && value !== undefined ? (
        <View style={styles.statContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
          </View>
          <Text style={styles.value}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      ) : (
        children
      )}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.md,
  },
  statContainer: {
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
