export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  income: string;
  incomeBg: string;
  expense: string;
  expenseBg: string;
  savings: string;
  savingsBg: string;
  planning: string;
  planningBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  success: string;
  white: string;
  black: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  shadow: string;
}

export const lightTheme: ThemeColors = {
  primary: '#0D5C3A', // Deep Emerald Green
  primaryLight: '#E8F5E9',
  primaryDark: '#073B24',
  secondary: '#0A192F', // Dark Navy
  background: '#F8FAFC', // Clean Off-White
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  income: '#10B981', // Green
  incomeBg: '#ECFDF5',
  expense: '#EF4444', // Red
  expenseBg: '#FEF2F2',
  savings: '#3B82F6', // Blue
  savingsBg: '#EFF6FF',
  planning: '#8B5CF6', // Purple
  planningBg: '#F5F3FF',
  warning: '#F59E0B', // Orange
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  success: '#16A34A',
  white: '#FFFFFF',
  black: '#000000',
  tint: '#0D5C3A',
  tabIconDefault: '#94A3B8',
  tabIconSelected: '#0D5C3A',
  shadow: 'rgba(0, 0, 0, 0.06)',
};

export const darkTheme: ThemeColors = {
  primary: '#10B981', // Bright Emerald
  primaryLight: '#064E3B',
  primaryDark: '#047857',
  secondary: '#1E293B',
  background: '#0B0F17',
  card: '#161E2E',
  cardSecondary: '#1F293D',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1E293B',
  borderSubtle: '#172033',
  income: '#34D399',
  incomeBg: '#064E3B',
  expense: '#F87171',
  expenseBg: '#7F1D1D',
  savings: '#60A5FA',
  savingsBg: '#1E3A8A',
  planning: '#A78BFA',
  planningBg: '#4C1D95',
  warning: '#FBBF24',
  warningBg: '#78350F',
  danger: '#EF4444',
  success: '#22C55E',
  white: '#FFFFFF',
  black: '#000000',
  tint: '#34D399',
  tabIconDefault: '#64748B',
  tabIconSelected: '#34D399',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
