import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm dialog. react-native's Alert.alert with buttons is a
 * no-op on react-native-web, which silently breaks any action wired to a button
 * callback. On web we fall back to window.confirm; on native we use Alert.
 */
export async function confirmAsync(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return true;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Cross-platform one-button notice (web uses window.alert). */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
