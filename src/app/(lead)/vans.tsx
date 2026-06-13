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
import { isVanClaimable } from '@/lib/rules';
import { useVans, type VanWithLock } from '@/lib/vans';
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

function VanRow({ van }: { van: VanWithLock }) {
  const claimable = isVanClaimable(van.lock);
  const locked = !claimable && van.lock;

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold">{van.reg}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {van.make} {van.model}
        </ThemedText>
        {locked ? (
          <ThemedText type="small" style={styles.lockedText}>
            Claimed — locked until {new Date(van.lock!.expires_at).toLocaleTimeString()}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <StatusPill status={van.status} />
        <TouchableOpacity
          style={[styles.claimBtn, !claimable && styles.claimBtnDisabled]}
          disabled={!claimable}
        >
          <ThemedText type="small" style={styles.claimText}>
            {claimable ? 'Claim' : 'Locked'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Vans() {
  const { profile, signOut } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useVans();

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
          renderItem={({ item }) => <VanRow van={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
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
  error: { color: '#D92D20' },
});
