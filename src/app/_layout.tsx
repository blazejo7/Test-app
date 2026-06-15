import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';
import { registerForPush } from '@/lib/push';

const queryClient = new QueryClient();

/** Register this device for rota push once a profile is available (best-effort). */
function usePushRegistration() {
  const { profile } = useAuth();
  useEffect(() => {
    if (profile) registerForPush(profile.id, profile.fleet_id);
  }, [profile]);
}

/**
 * Redirects based on auth + role:
 *  - signed out          -> /login
 *  - signed in as lead   -> /vans
 *  - signed in as manager-> /dashboard
 */
function useAuthGate() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const group = segments[0]; // '(auth)' | '(lead)' | '(manager)' | undefined
    const inAuthGroup = group === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/login');
      return;
    }

    const role = profile?.role;
    if (role === 'manager' && group !== '(manager)') {
      router.replace('/dashboard');
    } else if (role === 'lead' && group !== '(lead)') {
      router.replace('/vans');
    } else if (!role && !inAuthGroup) {
      // Signed in but no profile row yet — bounce to login.
      router.replace('/login');
    }
  }, [loading, session, profile, segments, router]);

  return loading;
}

function RootNavigator() {
  const loading = useAuthGate();
  usePushRegistration();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(lead)" />
      <Stack.Screen name="(manager)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
