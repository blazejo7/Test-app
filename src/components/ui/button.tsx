import { ActivityIndicator, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'success';
type Size = 'md' | 'sm';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const c = useThemeColors();

  const bg =
    variant === 'primary'
      ? c.primary
      : variant === 'danger'
        ? c.danger
        : variant === 'success'
          ? c.success
          : c.surfaceAlt;
  const fg = variant === 'secondary' ? c.text : c.onPrimary;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? c.border : bg },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <ThemedText type="smallBold" style={{ color: fg }}>
          {label}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  sm: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  disabled: { opacity: 0.5 },
});
