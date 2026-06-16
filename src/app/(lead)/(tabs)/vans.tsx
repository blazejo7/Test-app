import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/dialogs';
import { claimVan } from '@/lib/inspection';
import { isLockExpired, minutesRemaining } from '@/lib/rules';
import { releaseVan, useNow, useVans, type VanWithLock } from '@/lib/vans';
import type { VanStatus } from '@/types/database';

const STATUS_META: Record<VanStatus, { label: string; color: string }> = {
  clear: { label: 'Clear', color: '#12B76A' },
  new_damage: { label: 'New damage', color: '#F79009' },
  grounded: { label: 'Grounded', color: '#D92D20' },
};

function StatusPill({ status }: { status: VanStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.pill, { backgroundColor: meta.color }]}>
      <ThemedText type="small" style={styles.pillText}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

function VanRow({
  van,
  currentUserId,
  now,
  onClaim,
  onRelease,
  busy,
}: {
  van: VanWithLock;
  currentUserId: string | undefined;
  now: Date;
  onClaim: (vanId: string) => void;
  onRelease: (vanId: string) => void;
  busy: boolean;
}) {
  const activeLock = van.lock && !isLockExpired(van.lock, now) ? van.lock : null;
  const heldByMe = activeLock?.locked_by === currentUserId;
  const lockedByOther = !!activeLock && !heldByMe;
  const minsLeft = activeLock ? minutesRemaining(activeLock.expires_at, now) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold">{van.reg}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {van.make} {van.model}
        </ThemedText>
        {heldByMe ? (
          <ThemedText type="small" style={styles.heldText}>
            Held by you · {minsLeft}m left
          </ThemedText>
        ) : lockedByOther ? (
          <ThemedText type="small" style={styles.lockedText}>
            Claimed by another lead · {minsLeft}m left
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        <StatusPill status={van.status} />
        {busy ? (
          <ActivityIndicator size="small" />
        ) : heldByMe ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.claimBtn} onPress={() => onClaim(van.id)}>
              <ThemedText type="small" style={styles.claimText}>
                Resume
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.releaseBtn} onPress={() => onRelease(van.id)}>
              <ThemedText type="small" style={styles.releaseText}>
                Release
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.claimBtn, lockedByOther && styles.claimBtnDisabled]}
            disabled={lockedByOther}
            onPress={() => onClaim(van.id)}
          >
            <ThemedText type="small" style={styles.claimText}>
              {lockedByOther ? 'Locked' : 'Claim'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function Vans() {
  const { profile, signOut } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useVans();
  const queryClient = useQueryClient();
  const now = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleClaim(vanId: string) {
    setBusyId(vanId);
    try {
      const inspectionId = await claimVan(vanId);
      await queryClient.invalidateQueries({ queryKey: ['vans'] });
      await queryClient.invalidateQueries({ queryKey: ['inspections'] });
      router.push({ pathname: '/inspection/[id]', params: { id: inspectionId } });
    } catch (e) {
      notify('Could not claim van', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRelease(vanId: string) {
    setBusyId(vanId);
    try {
      await releaseVan(vanId);
      await queryClient.invalidateQueries({ queryKey: ['vans'] });
    } catch (e) {
      notify('Could not release van', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <ThemedText type="default">Van registry</ThemedText>
          {profile ? (
            <ThemedText type="small" themeColor="textSecondary">
              {profile.name}
            </ThemedText>
          ) : null}
        </View>
        <TouchableOpacity onPress={signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <ThemedText type="small" style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load vans'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VanRow
              van={item}
              currentUserId={profile?.id}
              now={now}
              onClaim={handleClaim}
              onRelease={handleRelease}
              busy={busyId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText type="small" themeColor="textSecondary">
                No vans in this fleet yet.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  rowMain: { gap: 2, flexShrink: 1 },
  rowRight: { alignItems: 'flex-end', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  heldText: { color: '#12B76A' },
  lockedText: { color: '#F79009' },
  pill: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  pillText: { color: '#fff', fontSize: 12 },
  claimBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  claimBtnDisabled: { backgroundColor: Colors.light.backgroundSelected },
  claimText: { color: '#fff' },
  releaseBtn: {
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  releaseText: { color: '#D92D20' },
  error: { color: '#D92D20' },
});
