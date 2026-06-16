/**
 * Design tokens. Colors are provided per scheme (light/dark) and consumed
 * through the theme context in src/lib/theme.tsx — use `useThemeColors()` in
 * components rather than referencing a fixed scheme.
 */

import '@/global.css';

import { Platform } from 'react-native';

export interface ThemeColors {
  /** App background. */
  background: string;
  /** Card / raised surface. */
  surface: string;
  /** Subtle inner surface (inputs, chips). */
  surfaceAlt: string;
  /** Hairline borders. */
  border: string;
  text: string;
  textSecondary: string;
  /** Brand accent. */
  primary: string;
  /** Soft brand tint (selected chip backgrounds, etc.). */
  primarySoft: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
  /** Legacy aliases (kept so existing styles keep resolving). */
  backgroundElement: string;
  backgroundSelected: string;
}

const light: ThemeColors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  primary: '#2563EB',
  primarySoft: '#E5EDFB',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E2E8F0',
};

const dark: ThemeColors = {
  background: '#0B1220',
  surface: '#151D2E',
  surfaceAlt: '#1E283B',
  border: '#2A3650',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  primarySoft: '#1B2A4A',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#F87171',
  backgroundElement: '#151D2E',
  backgroundSelected: '#2A3650',
};

export const Palettes = { light, dark } as const;

/** Back-compat default export; prefer useThemeColors(). */
export const Colors = Palettes;

export type ThemeColor = keyof ThemeColors;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
