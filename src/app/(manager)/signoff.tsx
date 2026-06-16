import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeverityBadge } from '@/components/damage/badges';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { confirmAsync, notify } from '@/lib/dialogs';
import {
  releaseGroundedVan,
  useManagerRealtime,
  useSignoffQueue,
  type GroundedVan,
} from '@/lib/manager';

function QueueCard({
  van,
  onApprove,
  busy,
}: {
  van: GroundedVan;
  onApprove: (van: GroundedVan) => void;
  busy: boolean;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View>
          <ThemedText type="smallBold">{van.reg}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {van.make} {van.model}
          </ThemedText>
        </View>
        <ThemedText type="small" style={styles.groundedTag}>
          Grounded
        </ThemedText>
      </View>

      {van.groundable.map((d) => (
        <View key={d.id} style={styles.damageRow}>
          <View style={styles.flex}>
            <ThemedText type="small">
              {d.zone}
              {d.description ? ` — ${d.description}` : ''}
            </ThemedText>
          </View>
          <SeverityBadge severity={d.severity} />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.approveBtn, busy && styles.approveBtnDisabled]}
        onPress={() => onApprove(van)}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="smallBold" style={styles.approveText}>
            Approve release
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function SignOff() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  useManagerRealtime();
  const { data, isLoading, isError, error } = useSignoffQueue();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onApprove(van: GroundedVan) {
    const ok = await confirmAsync(
      'Release grounded van?',
      `${van.reg} will be cleared to go out once its groundable damage is signed off.`,
      'Approve',
      true,
    );
    if (!ok) return;
    setBusyId(van.id);
    try {
      await releaseGroundedVan(van.id);
      await queryClient.invalidateQueries({ queryKey: ['signoff'] });
      await queryClient.invalidateQueries({ queryKey: ['vans'] });
    } catch (e) {
      notify('Release failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="default">Sign-off queue</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Grounded vans awaiting release.
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <ThemedText type="small" style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load queue'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QueueCard van={item} onApprove={onApprove} busy={busyId === item.id} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing to sign off. All vans cleared to go out. ✅
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
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: {
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  groundedTag: { color: '#D92D20' },
  damageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  approveBtn: {
    backgroundColor: '#12B76A',
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  approveBtnDisabled: { opacity: 0.6 },
  approveText: { color: '#fff' },
  error: { color: '#D92D20' },
});
