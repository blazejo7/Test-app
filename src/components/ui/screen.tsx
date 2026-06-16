import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useThemeColors } from '@/lib/theme';

/** Full-screen container that paints the themed background and applies safe-area insets. */
export function Screen({
  children,
  edges = ['top', 'bottom'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}) {
  const c = useThemeColors();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={edges}>
      <View style={[styles.flex, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
