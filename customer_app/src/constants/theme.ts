// ─────────────────────────────────────────────────────────────
//  DhobiPro Design Tokens  – sourced from Figma node 78-219
//  Exact hex codes from Figma Colors panel:
//    #D7D9FC  #F3DDF0  #FDE0D3  #FDDFC2  + linear gradient
// ─────────────────────────────────────────────────────────────

export const COLORS = {
  // Brand purple (derived from #D7D9FC, darkened for contrast)
  primary: '#5B52E8',
  primaryLight: '#D7D9FC',   // Figma: lavender
  primaryDark: '#3D35C5',

  // Warm accent – CTA buttons, highlights
  accent: '#E8643A',
  accentLight: '#FDE0D3',    // Figma: peach

  // Pastel palette (exact from Figma)
  lavender: '#D7D9FC',       // Figma
  pink: '#F3DDF0',           // Figma
  peach: '#FDE0D3',          // Figma
  cream: '#FDDFC2',          // Figma

  // Gradient stops (splash / cards)
  gradientStart: '#FDE0D3',  // Figma: peach
  gradientEnd: '#FDDFC2',    // Figma: cream

  // Surface & Inputs
  background: '#FFFAF8',     // Warm white
  card: '#FFFFFF',
  cardAlt: '#F9F7FF',        // Faint lavender card
  surface: '#FFFFFF',
  inputBg: '#F8FAFC',

  // Text
  text: '#1A1830',
  textSecondary: '#6B6889',
  textLight: '#A09EBF',

  // Border
  border: '#EDE8FF',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(26, 24, 48, 0.45)',
};

export const DARK_COLORS = {
  // Brand purple preserved
  primary: '#7B74FF',
  primaryLight: '#26234D',
  primaryDark: '#5B52E8',

  // Accent preserved
  accent: '#F97342',
  accentLight: '#3A231C',

  lavender: '#202024',
  pink: '#2B202F',
  peach: '#30231D',
  cream: '#29241B',

  gradientStart: '#161619',
  gradientEnd: '#202024',

  // Professional Dark Theme Surfaces (exact prompt specs)
  background: '#0B0B0D',     // Main background
  card: '#161619',           // Card background
  cardAlt: '#202024',        // Secondary background
  surface: '#161619',
  inputBg: '#19191D',        // Input background

  // High contrast text
  text: '#FFFFFF',           // Primary text
  textSecondary: '#B8B8C2',  // Secondary text
  textLight: '#8A8A99',

  // Border
  border: '#303036',         // Border

  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const SIZES = {
  radius_xs: 6,
  radius_sm: 8,
  radius_md: 12,
  radius_lg: 16,
  radius_xl: 24,
  radius_full: 999,
};

export const FONTS = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};
