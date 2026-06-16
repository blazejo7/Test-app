import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show banners/sound for notifications received while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register this device for push and store its Expo token. Best-effort: returns
 * null on web, simulators/emulators, denied permission, or when no EAS project
 * id is configured (real tokens only issue on a physical device in an EAS build).
 */
export async function registerForPush(userId: string, fleetId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  const status =
    existing.status === 'granted'
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, fleet_id: fleetId, token, platform: Platform.OS },
        { onConflict: 'token' },
      );
    return token;
  } catch (e) {
    console.warn('Push registration failed:', e);
    return null;
  }
}

/**
 * Send an Expo push to the given tokens via the Expo push service. Invalid or
 * non-Expo tokens are skipped. Failures are swallowed — push is best-effort on
 * top of the authoritative in-app notifications.
 */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const messages = tokens
    .filter((t) => t.startsWith('ExponentPushToken'))
    .map((to) => ({ to, title, body, data, sound: 'default' }));
  if (messages.length === 0) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('Push send failed:', e);
  }
}
