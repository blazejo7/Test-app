import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

/**
 * FleetFlow logo: a rounded-square mark with a white delivery-route motif
 * (a flowing path between two stops), optionally followed by the wordmark.
 */
export function LogoMark({ size = 44 }: { size?: number }) {
  const c = useThemeColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={0} y={0} width={48} height={48} rx={13} fill={c.primary} />
      <Path
        d="M13 33 C13 24, 35 24, 35 15"
        stroke={c.onPrimary}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={13} cy={33} r={5} fill={c.onPrimary} />
      <Circle cx={35} cy={15} r={5} fill={c.onPrimary} />
    </Svg>
  );
}

export function Logo({ size = 44, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      {showWordmark ? (
        <ThemedText style={[styles.word, { fontSize: size * 0.5 }]}>
          Fleet<ThemedText style={[styles.word, { fontSize: size * 0.5, color: c.primary }]}>Flow</ThemedText>
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  word: { fontWeight: '800', letterSpacing: -0.5 },
});
