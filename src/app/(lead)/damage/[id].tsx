import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeverityBadge, StatusBadge } from '@/components/damage/badges';
import { PhotoGallery } from '@/components/damage/photo-gallery';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useDamageReport } from '@/lib/damage';

export default function DamageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useDamageReport(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <ThemedText type="small" style={styles.error}>
          Couldn&apos;t load this report.
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="link" themeColor="textSecondary">
            Back
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { report, history } = data;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ThemedText type="smallBold">
          {report.van?.reg ?? 'Van'} · {report.zone}
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="small" themeColor="textSecondary">
            Back
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.badges}>
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} />
        </View>

        <ThemedText type="default">{report.damage_type.replace('_', ' ')}</ThemedText>
        {report.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {report.description}
          </ThemedText>
        ) : null}

        <Field label="Reported" value={new Date(report.reported_at).toLocaleString()} />
        <Field
          label="Last confirmed"
          value={
            report.last_confirmed_at
              ? `${new Date(report.last_confirmed_at).toLocaleString()} (${report.times_confirmed}×)`
              : 'Never'
          }
        />

        <ThemedText type="smallBold" style={styles.section}>
          Photos
        </ThemedText>
        <PhotoGallery paths={report.photo_urls} />

        <ThemedText type="smallBold" style={styles.section}>
          Confirmation history
        </ThemedText>
        {history.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Not yet confirmed on an inspection.
          </ThemedText>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <ThemedText type="small">
                {h.outcome === 'worse' ? '⚠️ Got worse' : 'Still same'}
                {h.note ? ` — ${h.note}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {h.confirmer?.name ?? 'Lead'} · {new Date(h.confirmed_at).toLocaleDateString()}
              </ThemedText>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  error: { color: '#D92D20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  badges: { flexDirection: 'row', gap: Spacing.two },
  section: { marginTop: Spacing.two },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
  historyRow: {
    gap: 2,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
});
