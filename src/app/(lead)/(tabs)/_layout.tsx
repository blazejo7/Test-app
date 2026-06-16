import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useThemeColors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function LeadLayout() {
  const c = useThemeColors();
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
        name="vans"
        options={{ title: 'Vans', tabBarIcon: (p) => <TabIcon name="bus-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="inspect"
        options={{ title: 'Inspect', tabBarIcon: (p) => <TabIcon name="clipboard-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="damage"
        options={{ title: 'Damage', tabBarIcon: (p) => <TabIcon name="warning-outline" {...p} /> }}
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
