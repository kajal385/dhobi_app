import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Appearance, ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';
import { Theme as NavigationTheme, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { COLORS, DARK_COLORS } from '../constants/theme';
import { storage } from '../api/client';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof COLORS;
  navigationTheme: NavigationTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'dhobi_app_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDark: false,
  colors: COLORS,
  navigationTheme: DefaultTheme,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = storage.getString(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved as ThemeMode;
      }
    } catch {}
    return 'light';
  });

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return isDark ? DARK_COLORS : COLORS;
  }, [isDark]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    if (isDark) {
      return {
        ...DarkTheme,
        dark: true,
        colors: {
          ...DarkTheme.colors,
          primary: DARK_COLORS.primary,
          background: DARK_COLORS.background,
          card: DARK_COLORS.card,
          text: DARK_COLORS.text,
          border: DARK_COLORS.border,
          notification: DARK_COLORS.accent,
        },
      };
    }
    return {
      ...DefaultTheme,
      dark: false,
      colors: {
        ...DefaultTheme.colors,
        primary: COLORS.primary,
        background: COLORS.background,
        card: COLORS.card,
        text: COLORS.text,
        border: COLORS.border,
        notification: COLORS.accent,
      },
    };
  }, [isDark]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      storage.set(THEME_STORAGE_KEY, mode);
    } catch {}
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      navigationTheme,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, navigationTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
