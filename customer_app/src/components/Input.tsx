import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  useColorScheme,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';

interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  iconLeft,
  iconRight,
  ...props
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? colors.card : colors.white,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
        <RNTextInput
          placeholderTextColor={colors.textLight}
          style={[
            styles.input,
            {
              color: colors.text,
            },
            inputStyle,
          ]}
          {...props}
        />
        {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
      </View>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SIZES.radius_md,
    height: 52,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    padding: 0,
  },
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
});
