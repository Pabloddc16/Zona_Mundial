/**
 * Design tokens ported from the Mundial26 reference design system.
 * Rule: green = brand, ink = action, gold = celebration, red = urgency.
 */

export const COLORS = {
  green: '#006341',
  ink: '#0B1F15',
  gold: '#FFD100',
  goldDark: '#806100',
  red: '#CE1126',
  cream: '#FAF6EE',
  paper: '#FFFFFF',

  text: '#0B1F15',
  textMuted: 'rgba(0,0,0,0.65)',
  textFaint: 'rgba(0,0,0,0.45)',

  surface: '#FFFFFF',
  surface2: 'rgba(0,0,0,0.05)',
  surface3: 'rgba(0,0,0,0.08)',
  border: 'rgba(0,0,0,0.08)',
  borderSoft: 'rgba(0,0,0,0.05)',
  borderStrong: 'rgba(0,0,0,0.15)',
} as const

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 9999 } as const

export const FONT = {
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
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
    black: '900' as const,
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
