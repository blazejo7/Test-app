import { StyleSheet, TextInput, View } from 'react-native';
import { useMemo } from 'react';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import type { ConfirmationOutcome, DamageReport } from '@/types/database';

export interface ConfirmationDraft {
  outcome: ConfirmationOutcome;
  note: string;
}

const OUTCOME_OPTIONS = [
  { value: 'same' as const, label: 'Still same' },
  { value: 'worse' as const, label: 'Got worse' },
];

export function StepKnownDamage({
  knownDamage,
  confirmations,
  onChange,
}: {
  knownDamage: DamageReport[];
  confirmations: Record<string, ConfirmationDraft>;
  onChange: (id: string, draft: ConfirmationDraft) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (knownDamage.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="default" themeColor="textSecondary">
          No known damage on record. Continue to the walkaround.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        Confirm each known issue before continuing — this stops old damage being
        re-flagged as new.
      </ThemedText>
      {knownDamage.map((d) => {
        const draft = confirmations[d.id];
        return (
          <View key={d.id} style={styles.card}>
            <ThemedText type="smallBold">
              {d.zone} · {d.damage_type} · {d.severity}
            </ThemedText>
            {d.description ? (
              <ThemedText type="small" themeColor="textSecondary">
                {d.description}
              </ThemedText>
            ) : null}
            <ChipSelect
              options={OUTCOME_OPTIONS}
              selected={draft?.outcome ?? null}
              onSelect={(outcome) => onChange(d.id, { outcome, note: draft?.note ?? '' })}
            />
            {draft?.outcome === 'worse' ? (
              <TextInput
                placeholder="What changed? (optional)"
                placeholderTextColor={c.textSecondary}
                value={draft.note}
                onChangeText={(note) => onChange(d.id, { outcome: 'worse', note })}
                style={styles.note}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  empty: { paddingVertical: Spacing.five, alignItems: 'center' },
  list: { gap: Spacing.three },
  card: {
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  note: {
    borderWidth: 1,
    borderColor: c.backgroundSelected,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    color: c.text,
  },
});
