import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColors } from '@/lib/theme';

/** Initials avatar in the soft brand tint. */
export function Avatar({ initials, size = 40 }: { initials: string | null; size?: number }) {
  const c = useThemeColors();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: c.primary }}>
        {(initials ?? '?').slice(0, 2).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
