import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const BUCKET = 'damage-photos';

function uuid(): string {
  // Good enough for storage object names.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface PhotoContext {
  fleetId: string;
  vanId: string;
  inspectionId: string;
}

/**
 * Let the user pick or capture an image and upload it to the (private)
 * damage-photos bucket. Returns the stored object path, which goes into
 * damage_reports.photo_urls. Returns null if the user cancels.
 *
 * Path convention (enforced by storage RLS): fleet/{fleet}/van/{van}/{inspection}/{uuid}.jpg
 */
export async function captureDamagePhoto(
  ctx: PhotoContext,
  source: 'camera' | 'library' = 'library',
): Promise<string | null> {
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.6,
        });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const arrayBuffer = await fetch(asset.uri).then((r) => r.arrayBuffer());
  const path = `fleet/${ctx.fleetId}/van/${ctx.vanId}/${ctx.inspectionId}/${uuid()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) throw new Error(error.message);

  return path;
}

/** Resolve a signed URL for a stored (private) photo path, for display. */
export async function signedPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
