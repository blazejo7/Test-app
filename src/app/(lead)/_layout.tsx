import { Stack } from 'expo-router';

export default function LeadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="inspection/[id]"
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen name="damage/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
