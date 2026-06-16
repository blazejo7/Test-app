import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '@/components/inspection/chip-select';
import { SeverityBadge, StatusBadge } from '@/components/damage/badges';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { DAMAGE_FILTERS, useDamageReports, type DamageFilter } from '@/lib/damage';

export default function Damage() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [filter, setFilter] = useState<DamageFilter>('all');
  const { data, isLoading, isError, error } = useDamageReports(filter);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="heading">Damage log</ThemedText>
        <ChipSelect options={DAMAGE_FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <ThemedText type="small" style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load damage'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/damage/[id]', params: { id: item.id } })
              }
            >
              <View style={styles.rowMain}>
                <ThemedText type="smallBold">
                  {item.van?.reg ?? 'Van'} · {item.zone}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.damage_type}
                  {item.description ? ` — ${item.description}` : ''}
                </ThemedText>
                <View style={styles.meta}>
                  {item.photo_urls.length ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.photo_urls.length} photo(s)
                    </ThemedText>
                  ) : null}
                  {item.times_confirmed > 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      confirmed {item.times_confirmed}×
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <View style={styles.badges}>
                <SeverityBadge severity={item.severity} />
                <StatusBadge status={item.status} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText type="small" themeColor="textSecondary">
                No damage reports{filter === 'all' ? '' : ` marked "${filter}"`}.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  rowMain: { gap: 2, flexShrink: 1 },
  meta: { flexDirection: 'row', gap: Spacing.three, marginTop: 2 },
  badges: { alignItems: 'flex-end', gap: Spacing.two },
  error: { color: c.danger },
});
