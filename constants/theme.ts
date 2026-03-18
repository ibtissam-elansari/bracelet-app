export const Colors = {
  // Core backgrounds
  bg: '#080C14',
  bgCard: '#0D1421',
  bgCardAlt: '#111827',
  bgSurface: '#151E2E',

  // Borders
  border: '#1E2D42',
  borderLight: '#243348',

  // Brand / Accent
  accent: '#00E5FF',        // electric cyan
  accentDim: '#00B8CC',
  accentGlow: 'rgba(0,229,255,0.15)',

  // Status colors
  success: '#00E676',
  successGlow: 'rgba(0,230,118,0.15)',
  warning: '#FFB300',
  warningGlow: 'rgba(255,179,0,0.15)',
  danger: '#FF1744',
  dangerGlow: 'rgba(255,23,68,0.15)',
  dangerDim: '#CC1035',

  // Heart rate
  heart: '#FF4081',
  heartGlow: 'rgba(255,64,129,0.2)',

  // Text
  textPrimary: '#E8F4FD',
  textSecondary: '#7B9BB8',
  textMuted: '#3E5470',
  textLabel: '#5A7A99',

  // Gradients (as arrays for LinearGradient)
  gradientAccent: ['#00E5FF', '#0070FF'],
  gradientHeart: ['#FF4081', '#F50057'],
  gradientTemp: ['#FFB300', '#FF6D00'],
  gradientMove: ['#00E676', '#00BFA5'],
  gradientDanger: ['#FF1744', '#D50000'],
};

export const Fonts = {
  // Use system fonts — in real app swap with expo-font (e.g. SpaceMono, Rajdhani)
  mono: 'Courier New',
  heading: 'System',
  body: 'System',
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadow = {
  accent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heart: {
    shadowColor: Colors.heart,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  danger: {
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};