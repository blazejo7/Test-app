import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/dialogs';
import { confirmRota, setAvailability, useMyRota, useRotaRealtime } from '@/lib/rota';
import { rotaWindow } from '@/lib/rules';
import type { Rota } from '@/types/database';

const AVAILABILITY = [
  { value: 'available' as const, label: 'Available' },
  { value: 'absent' as const, label: 'Absent' },
];

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function DayCard({
  date,
  row,
  onSet,
  onConfirm,
  busy,
}: {
  date: string;
  row: Rota | undefined;
  onSet: (date: string, status: 'available' | 'absent') => void;
  onConfirm: (date: string) => void;
  busy: boolean;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const assignedPublished = row?.status === 'assigned' && row.published_at;

  return (
    <View style={styles.card}>
      <ThemedText type="smallBold">{formatDay(date)}</ThemedText>

      {assignedPublished ? (
        <View style={styles.assigned}>
          <ThemedText type="small" style={styles.assignedText}>
            ✅ Assigned to work
          </ThemedText>
          {row!.confirmed ? (
            <ThemedText type="small" themeColor="textSecondary">
              Confirmed — thanks
            </ThemedText>
          ) : (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(date)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText type="small" style={styles.confirmText}>
                  Confirm receipt
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Mark your availability
          </ThemedText>
          <ChipSelect
            options={AVAILABILITY}
            selected={row?.status === 'available' || row?.status === 'absent' ? row.status : null}
            onSelect={(status) => onSet(date, status)}
          />
          {row?.status === 'assigned' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Assigned — waiting for the manager to publish.
            </ThemedText>
          ) : null}
        </>
      )}
    </View>
  );
}

export default function LeadRota() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { profile } = useAuth();
  useRotaRealtime();
  const dates = useMemo(() => rotaWindow(), []);
  const { data, isLoading } = useMyRota(profile?.id, dates);
  const queryClient = useQueryClient();
  const [busyDate, setBusyDate] = useState<string | null>(null);

  async function run(date: string, fn: () => Promise<void>) {
    setBusyDate(date);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ['rota'] });
    } catch (e) {
      notify('Rota update failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyDate(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="default">My rota</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Set your availability for the next 2 days.
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {dates.map((date) => (
            <DayCard
              key={date}
              date={date}
              row={data?.[date]}
              busy={busyDate === date}
              onSet={(d, status) => run(d, () => setAvailability(d, status))}
              onConfirm={(d) => run(d, () => confirmRota(d))}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  list: { padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: {
    gap: Spacing.two,
    backgroundColor: c.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  assigned: { gap: Spacing.two },
  assignedText: { color: '#12B76A' },
  confirmBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmText: { color: '#fff' },
});
