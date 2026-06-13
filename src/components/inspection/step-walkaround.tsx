import { StyleSheet, View } from 'react-native';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ZONES, type ZoneStatus } from '@/lib/inspection';
import type { DamageZone } from '@/types/database';

const ZONE_STATUS_OPTIONS = [
  { value: 'clear' as const, label: 'Clear' },
  { value: 'damage' as const, label: 'Damage found' },
];

export function StepWalkaround({
  zones,
  onSet,
}: {
  zones: Record<string, ZoneStatus>;
  onSet: (zone: DamageZone, status: ZoneStatus) => void;
}) {
  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        Walk around the van and mark each zone.
      </ThemedText>
      {ZONES.map((z) => (
        <View key={z.value} style={styles.row}>
          <ThemedText type="smallBold">{z.label}</ThemedText>
          <ChipSelect
            options={ZONE_STATUS_OPTIONS}
            selected={zones[z.value] ?? null}
            onSelect={(status) => onSet(z.value, status)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  row: {
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
});
