import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  useManagerRealtime,
  useRecentActivity,
  useSignoffQueue,
  useTodaySession,
  type ActivityRow,
} from '@/lib/manager';
import type { InspectionResult } from '@/types/database';

const RESULT_COLOR: Record<InspectionResult, string> = {
  clear: '#12B76A',
  new_damage: '#F79009',
  grounded: '#D92D20',
};

function ProgressCard() {
  const { data: session, isLoading } = useTodaySession();
  const { data: queue } = useSignoffQueue();

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.card}>
        <ThemedText type="smallBold">No session yet today</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The daily check starts when a lead claims the first van.
        </ThemedText>
      </View>
    );
  }

  const pct = session.total_vans ? Math.round((session.vans_done / session.total_vans) * 100) : 0;
  const grounded = queue?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <ThemedText type="smallBold">Today&apos;s fleet check</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {session.status === 'complete' ? 'Complete' : 'In progress'}
        </ThemedText>
      </View>
      <ThemedText type="title">
        {session.vans_done}
        <ThemedText type="default" themeColor="textSecondary">
          {' '}
          / {session.total_vans} vans
        </ThemedText>
      </ThemedText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {grounded > 0 ? (
        <ThemedText type="small" style={styles.grounded}>
          {grounded} van{grounded > 1 ? 's' : ''} grounded — awaiting sign-off
        </ThemedText>
      ) : null}
    </View>
  );
}

function ActivityItem({ item }: { item: ActivityRow }) {
  const color = item.result ? RESULT_COLOR[item.result] : Colors.light.textSecondary;
  return (
    <View style={styles.activityRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <ThemedText type="small">
          <ThemedText type="smallBold">{item.van?.reg ?? 'Van'}</ThemedText>
          {' · '}
          {item.result ? item.result.replace('_', ' ') : 'in progress'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.lead?.name ?? 'Lead'}
          {item.completed_at ? ` · ${new Date(item.completed_at).toLocaleTimeString()}` : ''}
        </ThemedText>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  useManagerRealtime();
  const { data: activity, isLoading } = useRecentActivity();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <ThemedText type="default">Dashboard</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile?.name ?? 'Manager'}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityItem item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ProgressCard />
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Recent activity
            </ThemedText>
            {isLoading ? <ActivityIndicator style={styles.loader} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No completed inspections yet.
            </ThemedText>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  headerBlock: { gap: Spacing.three, marginBottom: Spacing.two },
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundSelected,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#208AEF' },
  grounded: { color: '#D92D20' },
  sectionTitle: { marginTop: Spacing.two },
  loader: { alignSelf: 'flex-start' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
});
