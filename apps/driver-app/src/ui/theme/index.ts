export const colors = {
  primary: '#16213E',
  secondary: '#0F3460',
  accent: '#E94560',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: {
    primary: '#1C1C1E',
    secondary: '#3C3C43',
    tertiary: '#8E8E93',
    inverse: '#FFFFFF',
  },
  border: '#E5E5EA',
  online: '#34C759',
  offline: '#8E8E93',
  busy: '#FF9500',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: 'normal' as const,
  },
};
