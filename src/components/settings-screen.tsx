import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/ui/app-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Logo } from '@/components/brand/logo';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { confirmAsync } from '@/lib/dialogs';
import { useThemeColors, useThemeMode, type ThemeMode } from '@/lib/theme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { mode, setMode } = useThemeMode();
  const c = useThemeColors();

  async function onSignOut() {
    const ok = await confirmAsync('Sign out?', 'You will need to log in again.', 'Sign out', true);
    if (ok) await signOut();
  }

  return (
    <Screen>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.profile}>
          <Avatar initials={profile?.avatar_initials ?? null} size={52} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{profile?.name ?? '—'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {profile?.email ?? ''}
            </ThemedText>
          </View>
          {profile?.role ? <Badge label={profile.role} tone="primary" /> : null}
        </Card>

        <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
          APPEARANCE
        </ThemedText>
        <Card padded={false}>
          <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
            {MODES.map((m) => {
              const active = mode === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setMode(m.value)}
                  style={[styles.segItem, active && { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? c.primary : c.textSecondary }}
                  >
                    {m.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button label="Sign out" variant="danger" onPress={onSignOut} style={styles.signout} />

        <View style={styles.footer}>
          <Logo size={26} />
          <ThemedText type="small" themeColor="textSecondary">
            v1.0.0
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  section: { marginTop: Spacing.two, marginLeft: Spacing.one, letterSpacing: 1 },
  segment: { flexDirection: 'row', padding: Spacing.half, borderRadius: Radius.lg },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  signout: { marginTop: Spacing.two },
  footer: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
});
