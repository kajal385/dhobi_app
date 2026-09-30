import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../theme';

interface AppBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: string[];
}

export const AppBackground: React.FC<AppBackgroundProps> = ({
  children,
  style,
  colors = ['#E4DEFF', '#FDFBFE', '#FFE5D5'], // Lavender -> Off-White -> Soft Peach
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
