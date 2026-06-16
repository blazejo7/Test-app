import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

/** Soft, tinted pill label. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const c = useThemeColors();

  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.textSecondary },
    primary: { bg: c.primarySoft, fg: c.primary },
    success: { bg: c.primarySoft, fg: c.success },
    warning: { bg: c.primarySoft, fg: c.warning },
    danger: { bg: c.primarySoft, fg: c.danger },
  };
  const { bg, fg } = map[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="small" style={[styles.text, { color: fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
