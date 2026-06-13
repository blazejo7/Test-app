import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function ChipSelect<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <ThemedText
              type="small"
              style={active ? styles.chipTextActive : undefined}
            >
              {opt.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  chipActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipTextActive: { color: '#fff' },
});
