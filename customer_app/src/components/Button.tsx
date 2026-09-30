import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;

  const getButtonStyles = (): (ViewStyle | undefined)[] => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: SIZES.radius_md,
      paddingHorizontal: SPACING.lg,
    };

    let variantStyle: ViewStyle = {};
    if (variant === 'primary') {
      variantStyle = {
        backgroundColor: disabled ? colors.border : colors.primary,
      };
    } else if (variant === 'secondary') {
      variantStyle = {
        backgroundColor: disabled ? colors.border : colors.accent,
      };
    } else if (variant === 'outline') {
      variantStyle = {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.primary,
      };
    } else if (variant === 'text') {
      variantStyle = {
        backgroundColor: 'transparent',
        paddingHorizontal: SPACING.sm,
      };
    }

    let sizeStyle: ViewStyle = {};
    if (size === 'sm') {
      sizeStyle = { height: 36 };
    } else if (size === 'md') {
      sizeStyle = { height: 48 };
    } else if (size === 'lg') {
      sizeStyle = { height: 56 };
    }

    return [baseStyle, variantStyle, sizeStyle, style];
  };

  const getTextStyle = (): (TextStyle | undefined)[] => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      fontSize: size === 'sm' ? 14 : 16,
    };

    let variantTextStyle: TextStyle = {};
    if (variant === 'primary' || variant === 'secondary') {
      variantTextStyle = { color: colors.white };
    } else if (variant === 'outline') {
      variantTextStyle = { color: disabled ? colors.textLight : colors.primary };
    } else if (variant === 'text') {
      variantTextStyle = { color: disabled ? colors.textLight : colors.primary };
    }

    return [baseTextStyle, variantTextStyle, textStyle];
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyles()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? colors.primary : colors.white}
        />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
