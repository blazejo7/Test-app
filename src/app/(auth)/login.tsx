import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const c = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.brand}>
          <Logo size={56} />
          <ThemedText type="small" themeColor="textSecondary">
            Daily fleet inspections
          </ThemedText>
        </View>

        <Card style={styles.form}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Email
          </ThemedText>
          <TextInput
            placeholder="you@fleet.test"
            placeholderTextColor={c.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
          />
          <ThemedText type="smallBold" themeColor="textSecondary">
            Password
          </ThemedText>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={c.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
          />

          {error ? (
            <ThemedText type="small" style={{ color: c.danger }}>
              {error}
            </ThemedText>
          ) : null}

          <Button label="Sign in" onPress={onSubmit} loading={submitting} style={styles.button} />
        </Card>

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Demo logins are in supabase/seed.sql
        </ThemedText>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'center', gap: Spacing.five },
  brand: { alignItems: 'center', gap: Spacing.two },
  form: { gap: Spacing.two },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.one,
  },
  button: { marginTop: Spacing.three },
  hint: { textAlign: 'center' },
});
