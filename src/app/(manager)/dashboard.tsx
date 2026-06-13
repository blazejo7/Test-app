import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenStub } from '@/components/screen-stub';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {profile?.name ?? 'Manager'}
        </ThemedText>
        <TouchableOpacity onPress={signOut}>
          <ThemedText type="small" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </TouchableOpacity>
      </View>
      <ScreenStub
        title="Dashboard"
        description="Live session progress, lead activity, and the grounded-van sign-off queue."
        phase="Roadmap · Feature 6"
      />
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
});
