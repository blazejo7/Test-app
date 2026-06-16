import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import type { SessionSummary } from '@/types/database';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" style={color ? { color } : undefined}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

/** Renders an end-of-day summary — used both as a live preview and the stored snapshot. */
export function SessionSummaryCard({ summary }: { summary: SessionSummary }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.statRow}>
        <Stat label="Clear" value={summary.clear} color={c.success} />
        <Stat label="New damage" value={summary.new_damage} color={c.warning} />
        <Stat label="Grounded" value={summary.grounded} color={c.danger} />
      </View>

      <View style={styles.metaRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {summary.vans_done}/{summary.total_vans} done · {summary.vans_pending} pending
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {summary.fluids_low} with low fluids
        </ThemedText>
      </View>

      {summary.grounded_regs.length > 0 ? (
        <ThemedText type="small" style={styles.grounded}>
          Grounded: {summary.grounded_regs.join(', ')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    gap: Spacing.three,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grounded: { color: c.danger },
});
