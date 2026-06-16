import { StyleSheet, TextInput, View } from 'react-native';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { evaluateFluidLevels, FLUID_LOW_THRESHOLD, type FluidKey } from '@/lib/rules';
import type { FluidLevels } from '@/types/database';

const FLUIDS: { key: FluidKey; label: string }[] = [
  { key: 'adblue', label: 'AdBlue' },
  { key: 'coolant', label: 'Coolant' },
  { key: 'screenwash', label: 'Screenwash' },
];

function clampPercent(text: string): number {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function StepFluids({
  fluids,
  onChange,
}: {
  fluids: FluidLevels;
  onChange: (key: FluidKey, value: number) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const evaluation = evaluateFluidLevels(fluids);

  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        Enter each fluid level (%). Anything at or below {FLUID_LOW_THRESHOLD}% is flagged.
      </ThemedText>
      {FLUIDS.map((f) => {
        const low = evaluation.low.includes(f.key);
        return (
          <View key={f.key} style={styles.row}>
            <View style={styles.labelWrap}>
              <ThemedText type="smallBold">{f.label}</ThemedText>
              {low ? (
                <ThemedText type="small" style={styles.lowText}>
                  Low
                </ThemedText>
              ) : null}
            </View>
            <TextInput
              keyboardType="number-pad"
              value={String(fluids[f.key])}
              onChangeText={(t) => onChange(f.key, clampPercent(t))}
              style={[styles.input, low && styles.inputLow]}
              maxLength={3}
            />
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { gap: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  lowText: { color: '#D92D20' },
  input: {
    borderWidth: 1,
    borderColor: c.backgroundSelected,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 64,
    textAlign: 'center',
    color: c.text,
  },
  inputLow: { borderColor: '#D92D20' },
});
