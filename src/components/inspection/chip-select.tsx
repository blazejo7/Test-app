import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

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
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
            style={[
              styles.chip,
              {
                backgroundColor: active ? c.primary : c.surfaceAlt,
                borderColor: active ? c.primary : c.border,
              },
            ]}
          >
            <ThemedText type="small" style={{ color: active ? c.onPrimary : c.text }}>
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
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
