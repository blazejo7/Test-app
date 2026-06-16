import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useUnreadSignoffCount } from '@/lib/manager';
import { useThemeColors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function ManagerLayout() {
  const c = useThemeColors();
  const { data: unread } = useUnreadSignoffCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: (p) => <TabIcon name="speedometer-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="signoff"
        options={{
          title: 'Sign-off',
          tabBarIcon: (p) => <TabIcon name="checkmark-done-outline" {...p} />,
          tabBarBadge: unread && unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="rota"
        options={{ title: 'Rota', tabBarIcon: (p) => <TabIcon name="calendar-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: (p) => <TabIcon name="settings-outline" {...p} /> }}
      />
    </Tabs>
  );
}
