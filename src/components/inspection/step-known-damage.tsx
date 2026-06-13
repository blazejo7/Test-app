import { StyleSheet, TextInput, View } from 'react-native';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
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
                placeholderTextColor={Colors.light.textSecondary}
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

const styles = StyleSheet.create({
  empty: { paddingVertical: Spacing.five, alignItems: 'center' },
  list: { gap: Spacing.three },
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  note: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    color: Colors.light.text,
  },
});
