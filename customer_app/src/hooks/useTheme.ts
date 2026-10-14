import { useTheme } from '../context/ThemeContext';

export { useTheme, ThemeProvider } from '../context/ThemeContext';
export type { ThemeMode, ThemeContextType } from '../context/ThemeContext';

/**
 * Convenience hook that returns either 'dark' or 'light' matching the active in-app theme.
 */
export const useAppColorScheme = (): 'light' | 'dark' => {
  const { isDark } = useTheme();
  return isDark ? 'dark' : 'light';
};

export const useAppTheme = useTheme;
export default useTheme;
