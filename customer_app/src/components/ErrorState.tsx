import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { Button } from './Button';
import { COLORS, DARK_COLORS, SPACING } from '../constants/theme';

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorProps> = ({
  message = 'Something went wrong. Please check your connection.',
  onRetry,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.error }]}>Oops!</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Button style={styles.button} variant="primary" title="Try Again" onPress={onRetry} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: SPACING.xxl,
  },
});
