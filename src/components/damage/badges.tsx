import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DamageSeverity, DamageStatus } from '@/types/database';

const SEVERITY_COLOR: Record<DamageSeverity, string> = {
  cosmetic: '#98A2B3',
  monitor: '#F79009',
  repair_needed: '#DC6803',
  groundable: '#D92D20',
};

const STATUS_COLOR: Record<DamageStatus, string> = {
  new: '#208AEF',
  known: '#98A2B3',
  resolved: '#12B76A',
};

export function SeverityBadge({ severity }: { severity: DamageSeverity }) {
  return (
    <View style={[styles.badge, { backgroundColor: SEVERITY_COLOR[severity] }]}>
      <ThemedText type="small" style={styles.text}>
        {severity.replace('_', ' ')}
      </ThemedText>
    </View>
  );
}

export function StatusBadge({ status }: { status: DamageStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] }]}>
      <ThemedText type="small" style={styles.text}>
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  text: { color: '#fff', fontSize: 12 },
});
