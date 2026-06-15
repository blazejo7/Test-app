import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function LeadLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#208AEF',
        headerStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Tabs.Screen name="vans" options={{ title: 'Vans' }} />
      <Tabs.Screen name="inspect" options={{ title: 'Inspect' }} />
      <Tabs.Screen name="damage" options={{ title: 'Damage' }} />
      <Tabs.Screen name="rota" options={{ title: 'Rota' }} />
    </Tabs>
  );
}
