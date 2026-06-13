import { ActivityIndicator, View } from 'react-native';

/**
 * Entry route. The auth gate in _layout.tsx immediately redirects to /login,
 * /vans, or /dashboard depending on session + role, so this just shows a
 * spinner during that first frame.
 */
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
