/**
 * Design tokens — editorial sport-magazine aesthetic.
 * Mirrors the public landing page palette so brand stays consistent.
 *
 * Rule: green = brand, ink = action, gold = celebration, red = urgency.
 */
import { Platform } from 'react-native'

export const COLORS = {
  green: '#006341',
  greenDark: '#003D24',
  ink: '#0B1F15',
  gold: '#FFD100',
  goldDark: '#806100',
  red: '#CE1126',
  cream: '#FAF6EE',
  paper: '#FFFFFF',

  text: '#0B1F15',
  textMuted: 'rgba(11,31,21,0.65)',
  textFaint: 'rgba(11,31,21,0.45)',
  textInverse: '#FAF6EE',

  surface: '#FFFFFF',
  surface2: 'rgba(11,31,21,0.05)',
  surface3: 'rgba(11,31,21,0.08)',
  border: 'rgba(11,31,21,0.10)',
  borderSoft: 'rgba(11,31,21,0.05)',
  borderStrong: 'rgba(11,31,21,0.18)',

  // Highlight surfaces (washi-tape inspired)
  highlightGold: 'rgba(255,209,0,0.18)',
  highlightGreen: 'rgba(0,99,65,0.12)',
  highlightRed: 'rgba(206,17,38,0.12)',
} as const

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 9999 } as const

/**
 * Type system. Until @expo-google-fonts/fraunces is installed, we use the
 * platform's strongest serif (system + bold weights) for display copy and
 * the default sans for body. Heavy weights + tight tracking give the
 * editorial feel without a custom font bundle.
 */
export const FONT_FAMILY = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }) as string,
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'Menlo',
  }) as string,
}

export const FONT = {
  family: FONT_FAMILY,
  size: {
    label: 10,
    bodyS: 11,
    bodyM: 13,
    bodyL: 15,
    displayS: 15,
    displayM: 18,
    displayL: 22,
    displayXL: 28,
    displayXXL: 34,
    displayXXXL: 44,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 3,
  },
}

export const SHADOW = {
  sm: {
    shadowColor: '#0B1F15',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1F15',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
}

export const APP_MAX_WIDTH = 460
