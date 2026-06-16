import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import type { DamageSeverity, DamageStatus } from '@/types/database';

function severityColor(c: ThemeColors, s: DamageSeverity): string {
  if (s === 'groundable') return c.danger;
  if (s === 'repair_needed' || s === 'monitor') return c.warning;
  return c.textSecondary; // cosmetic
}

function statusColor(c: ThemeColors, s: DamageStatus): string {
  if (s === 'resolved') return c.success;
  if (s === 'new') return c.primary;
  return c.textSecondary; // known
}

export function SeverityBadge({ severity }: { severity: DamageSeverity }) {
  const c = useThemeColors();
  return (
    <View style={[styles.badge, { backgroundColor: severityColor(c, severity) }]}>
      <ThemedText type="small" style={styles.text}>
        {severity.replace('_', ' ')}
      </ThemedText>
    </View>
  );
}

export function StatusBadge({ status }: { status: DamageStatus }) {
  const c = useThemeColors();
  return (
    <View style={[styles.badge, { backgroundColor: statusColor(c, status) }]}>
      <ThemedText type="small" style={styles.text}>
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
