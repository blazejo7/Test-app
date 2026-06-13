import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function ManagerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#208AEF',
        headerStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="signoff" options={{ title: 'Sign-off' }} />
      <Tabs.Screen name="rota" options={{ title: 'Rota' }} />
    </Tabs>
  );
}
