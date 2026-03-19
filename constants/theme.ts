// ─── Color Palette ────────────────────────────────────────────────────────────
export const Colors = {
  // Backgrounds — deep dark navy
  bg:         '#070B12',
  bgCard:     '#0C1220',
  bgSurface:  '#111827',
  bgElevated: '#161F30',

  // Borders
  border:      '#1C2A3F',
  borderLight: '#243348',

  // Brand accent — electric cyan
  accent:     '#00D4FF',
  accentSoft: '#00A8CC',
  accentGlow: 'rgba(0,212,255,0.12)',
  accentRing: 'rgba(0,212,255,0.25)',

  // Status
  success:     '#00E676',
  successGlow: 'rgba(0,230,118,0.12)',
  warning:     '#FFB300',
  warningGlow: 'rgba(255,179,0,0.12)',
  danger:      '#FF3D57',
  dangerGlow:  'rgba(255,61,87,0.12)',

  // Sensor-specific
  heart:       '#FF4D8A',
  heartGlow:   'rgba(255,77,138,0.15)',
  temp:        '#FF8C00',
  tempGlow:    'rgba(255,140,0,0.12)',
  move:        '#00E676',
  gps:         '#00D4FF',

  // Text hierarchy
  textPrimary:   '#EBF4FF',
  textSecondary: '#6B8CAE',
  textMuted:     '#364E68',
  textLabel:     '#4A6882',

  // Chart
  chartGrid: '#1C2A3F',
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  }),
};