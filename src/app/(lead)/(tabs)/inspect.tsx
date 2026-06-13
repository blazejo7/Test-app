import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useInProgressInspections } from '@/lib/inspection';

export default function Inspect() {
  const { data, isLoading } = useInProgressInspections();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="default">In-progress inspections</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Claim a van from the Vans tab to start a new one.
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
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
                router.push({ pathname: '/inspection/[id]', params: { id: item.id } })
              }
            >
              <View>
                <ThemedText type="smallBold">{item.van?.reg ?? 'Van'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Started {new Date(item.started_at).toLocaleTimeString()}
                </ThemedText>
              </View>
              <ThemedText type="small" style={styles.resume}>
                Resume →
              </ThemedText>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing in progress.
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
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  resume: { color: '#208AEF' },
});
