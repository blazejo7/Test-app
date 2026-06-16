import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { useThemeColors } from '@/lib/theme';

/**
 * Entry route. The auth gate in _layout.tsx immediately redirects to /login,
 * /vans, or /dashboard depending on session + role, so this just shows a
 * spinner during that first frame.
 */
export default function Index() {
  const c = useThemeColors();
  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={c.primary} />
    </Screen>
  );
}
