import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useUnreadSignoffCount } from '@/lib/manager';

export default function ManagerLayout() {
  const { data: unread } = useUnreadSignoffCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#208AEF',
        headerStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen
        name="signoff"
        options={{
          title: 'Sign-off',
          tabBarBadge: unread && unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="rota" options={{ title: 'Rota' }} />
    </Tabs>
  );
}
