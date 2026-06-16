import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionSummaryCard } from '@/components/manager/session-summary-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/dialogs';
import {
  completeSession,
  useManagerRealtime,
  useRecentActivity,
  useSessionInspections,
  useSignoffQueue,
  useTodaySession,
  type ActivityRow,
} from '@/lib/manager';
import { buildSessionSummary } from '@/lib/rules';
import { resultColor } from '@/lib/status-colors';


function SessionPanel() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { data: session, isLoading } = useTodaySession();
  const { data: inspections } = useSessionInspections(session?.id);
  const { data: queue } = useSignoffQueue();
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);

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
  const complete = session.status === 'complete';
  const summary = complete && session.summary
    ? session.summary
    : buildSessionSummary(inspections ?? [], session.total_vans);

  async function onComplete() {
    const ok = await confirmAsync(
      "Complete today's check?",
      'This finalises the daily report and notifies managers. A session cannot be reopened.',
      'Complete',
    );
    if (!ok) return;
    setCompleting(true);
    try {
      await completeSession(session!.id);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    } catch (e) {
      notify('Could not complete', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <ThemedText type="smallBold">Today&apos;s fleet check</ThemedText>
          <ThemedText type="small" themeColor={complete ? undefined : 'textSecondary'}>
            {complete ? '✅ Complete' : 'In progress'}
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

      <ThemedText type="smallBold">
        {complete ? 'Daily summary' : 'Summary so far'}
      </ThemedText>
      <SessionSummaryCard summary={summary} />

      {complete ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.completedAt}>
          Completed {session.completed_at ? new Date(session.completed_at).toLocaleString() : ''}
        </ThemedText>
      ) : (
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
          onPress={onComplete}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="smallBold" style={styles.completeText}>
              Complete today&apos;s check
            </ThemedText>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActivityItem({ item }: { item: ActivityRow }) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const color = item.result ? resultColor(c, item.result) : c.textSecondary;
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
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { profile, signOut } = useAuth();
  useManagerRealtime();
  const { data: activity, isLoading } = useRecentActivity();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <ThemedText type="heading">Dashboard</ThemedText>
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
            <SessionPanel />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
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
  panel: { gap: Spacing.two },
  card: {
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.four,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.backgroundSelected,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  grounded: { color: c.danger },
  completeBtn: {
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeText: { color: '#fff' },
  completedAt: { textAlign: 'center' },
  sectionTitle: { marginTop: Spacing.two },
  loader: { alignSelf: 'flex-start' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: c.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
});
