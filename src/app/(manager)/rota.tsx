import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { notify } from '@/lib/dialogs';
import {
  publishRota,
  setAssignment,
  tokensForAssignedLeads,
  useRotaGrid,
  useRotaRealtime,
  type RotaGrid,
} from '@/lib/rota';
import { sendExpoPush } from '@/lib/push';
import { rotaWindow } from '@/lib/rules';
import type { RotaStatus } from '@/types/database';

const STATUS_META: Record<RotaStatus | 'unset', { label: string; color: string }> = {
  available: { label: 'Available', color: '#12B76A' },
  assigned: { label: 'Assigned', color: '#208AEF' },
  absent: { label: 'Absent', color: '#98A2B3' },
  unset: { label: 'No response', color: '#98A2B3' },
};

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function DaySection({
  date,
  grid,
  onAssign,
  onPublish,
  busyKey,
}: {
  date: string;
  grid: RotaGrid;
  onAssign: (leadId: string, date: string, assigned: boolean) => void;
  onPublish: (date: string) => void;
  busyKey: string | null;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const rows = grid.leads.map((lead) => ({ lead, row: grid.rota[lead.id]?.[date] }));
  const assignedCount = rows.filter((r) => r.row?.status === 'assigned').length;
  const confirmedCount = rows.filter((r) => r.row?.status === 'assigned' && r.row.confirmed).length;
  const published = rows.some((r) => r.row?.status === 'assigned' && r.row.published_at);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View>
          <ThemedText type="smallBold">{formatDay(date)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {assignedCount} assigned
            {published ? ` · ${confirmedCount}/${assignedCount} confirmed` : ''}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.publishBtn, (assignedCount === 0 || busyKey === `pub:${date}`) && styles.disabled]}
          disabled={assignedCount === 0 || busyKey === `pub:${date}`}
          onPress={() => onPublish(date)}
        >
          {busyKey === `pub:${date}` ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText type="small" style={styles.publishText}>
              {published ? 'Re-publish' : 'Publish'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>

      {rows.map(({ lead, row }) => {
        const status = (row?.status ?? 'unset') as RotaStatus | 'unset';
        const meta = STATUS_META[status];
        const assigned = status === 'assigned';
        const key = `${lead.id}:${date}`;
        return (
          <View key={lead.id} style={styles.leadRow}>
            <View style={styles.flex}>
              <ThemedText type="small">{lead.name}</ThemedText>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: meta.color }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {meta.label}
                  {assigned && row?.confirmed ? ' · confirmed' : ''}
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.assignBtn, assigned && styles.assignBtnActive, busyKey === key && styles.disabled]}
              disabled={busyKey === key}
              onPress={() => onAssign(lead.id, date, !assigned)}
            >
              <ThemedText type="small" style={assigned ? styles.assignTextActive : undefined}>
                {assigned ? 'Unassign' : 'Assign'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

export default function ManagerRota() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  useRotaRealtime();
  const dates = useMemo(() => rotaWindow(), []);
  const { data: grid, isLoading } = useRotaGrid(dates);
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function onAssign(leadId: string, date: string, assigned: boolean) {
    setBusyKey(`${leadId}:${date}`);
    try {
      await setAssignment(leadId, date, assigned);
      await queryClient.invalidateQueries({ queryKey: ['rota'] });
    } catch (e) {
      notify('Assignment failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyKey(null);
    }
  }

  async function onPublish(date: string) {
    setBusyKey(`pub:${date}`);
    try {
      const notified = await publishRota(date);
      // Best-effort push on top of the in-app notification.
      const tokens = await tokensForAssignedLeads(date);
      await sendExpoPush(tokens, 'Rota published', `Your shift for ${formatDay(date)} is confirmed.`, {
        date,
      });
      await queryClient.invalidateQueries({ queryKey: ['rota'] });
      notify('Rota published', `${notified} lead${notified === 1 ? '' : 's'} notified.`);
    } catch (e) {
      notify('Publish failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="default">Rota</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Assign leads and publish the next 2 days.
        </ThemedText>
      </View>

      {isLoading || !grid ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {dates.map((date) => (
            <DaySection
              key={date}
              date={date}
              grid={grid}
              onAssign={onAssign}
              onPublish={onPublish}
              busyKey={busyKey}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  list: { padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  section: {
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  publishBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  publishText: { color: '#fff' },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.background,
    borderRadius: 10,
    padding: Spacing.three,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  assignBtn: {
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: c.backgroundSelected,
  },
  assignBtnActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  assignTextActive: { color: '#fff' },
  disabled: { opacity: 0.5 },
});
