import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { signedPhotoUrl } from '@/lib/photos';

/**
 * Resolves signed URLs for stored (private) photo paths and shows them as a
 * horizontal strip. Photos are immutable once an inspection is submitted.
 */
export function PhotoGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all(paths.map((p) => signedPhotoUrl(p))).then((resolved) => {
      if (active) setUrls(resolved.filter((u): u is string => !!u));
    });
    return () => {
      active = false;
    };
  }, [paths]);

  if (paths.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No photos.
      </ThemedText>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {urls.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.thumb} contentFit="cover" />
      ))}
      {urls.length < paths.length ? (
        <View style={[styles.thumb, styles.placeholder]}>
          <ThemedText type="small" themeColor="textSecondary">
            …
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  thumb: { width: 120, height: 120, borderRadius: 10, backgroundColor: Colors.light.backgroundElement },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
