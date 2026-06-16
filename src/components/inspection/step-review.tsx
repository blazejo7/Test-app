import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { ZONES, type NewDamageInput, type ZoneStatus } from '@/lib/inspection';
import { deriveVanStatus, evaluateFluidLevels } from '@/lib/rules';
import type { DamageReport, FluidLevels, InspectionResult } from '@/types/database';

const RESULT_META: Record<InspectionResult, { label: string; color: string }> = {
  clear: { label: 'Clear', color: '#12B76A' },
  new_damage: { label: 'New damage', color: '#F79009' },
  grounded: { label: 'Grounded', color: '#D92D20' },
};

/** Predict the inspection result client-side (the server is authoritative). */
export function predictResult(
  knownDamage: DamageReport[],
  newDamage: NewDamageInput[],
): InspectionResult {
  const severities = [
    ...knownDamage.map((d) => d.severity),
    ...newDamage.map((d) => d.severity),
  ];
  return deriveVanStatus(severities);
}

export function StepReview({
  zones,
  newDamage,
  confirmationCount,
  fluids,
  knownDamage,
}: {
  zones: Record<string, ZoneStatus>;
  newDamage: NewDamageInput[];
  confirmationCount: number;
  fluids: FluidLevels;
  knownDamage: DamageReport[];
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const result = predictResult(knownDamage, newDamage);
  const meta = RESULT_META[result];
  const lowFluids = evaluateFluidLevels(fluids).low;
  const zonesChecked = ZONES.filter((z) => zones[z.value]).length;

  return (
    <View style={styles.list}>
      <View style={[styles.resultBanner, { backgroundColor: meta.color }]}>
        <ThemedText type="smallBold" style={styles.resultText}>
          Predicted result: {meta.label}
        </ThemedText>
      </View>

      <Row label="Zones checked" value={`${zonesChecked} / ${ZONES.length}`} />
      <Row label="Known damage confirmed" value={`${confirmationCount} / ${knownDamage.length}`} />
      <Row label="New damage logged" value={String(newDamage.length)} />
      <Row
        label="Fluids"
        value={lowFluids.length ? `${lowFluids.length} low` : 'All OK'}
        warn={lowFluids.length > 0}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Submitting locks this inspection (read-only) and releases the van.
      </ThemedText>
    </View>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={warn ? styles.warn : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { gap: Spacing.two },
  resultBanner: {
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  resultText: { color: '#fff' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: c.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
  warn: { color: '#D92D20' },
  note: { marginTop: Spacing.three, textAlign: 'center' },
});
