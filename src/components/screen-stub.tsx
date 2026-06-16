import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

/**
 * Placeholder for screens that are on the roadmap but not built in the scaffold.
 * `phase` references the build order in README.md / the project spec.
 */
export function ScreenStub({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.desc}>
          {description}
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText type="small" style={styles.badgeText}>
            {phase}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  desc: { textAlign: 'center' },
  badge: {
    backgroundColor: c.backgroundElement,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  badgeText: { color: c.textSecondary },
});
