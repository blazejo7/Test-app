import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { DAMAGE_TYPES, SEVERITIES, ZONES, type NewDamageInput } from '@/lib/inspection';
import { captureDamagePhoto, type PhotoContext } from '@/lib/photos';
import type { DamageSeverity, DamageType, DamageZone } from '@/types/database';

export function StepNewDamage({
  items,
  onAdd,
  onRemove,
  photoContext,
}: {
  items: NewDamageInput[];
  onAdd: (item: NewDamageInput) => void;
  onRemove: (index: number) => void;
  photoContext: PhotoContext;
}) {
  const [zone, setZone] = useState<DamageZone | null>(null);
  const [type, setType] = useState<DamageType | null>(null);
  const [severity, setSeverity] = useState<DamageSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const canAdd = zone && type && severity;

  async function addPhoto() {
    try {
      setUploading(true);
      const path = await captureDamagePhoto(photoContext, 'library');
      if (path) setPhotos((p) => [...p, path]);
    } catch (e) {
      Alert.alert('Photo upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  }

  function add() {
    if (!zone || !type || !severity) return;
    onAdd({ zone, damage_type: type, severity, description, photo_urls: photos });
    setZone(null);
    setType(null);
    setSeverity(null);
    setDescription('');
    setPhotos([]);
  }

  return (
    <View style={styles.container}>
      {items.length > 0 ? (
        <View style={styles.added}>
          {items.map((item, i) => (
            <View key={i} style={styles.addedRow}>
              <ThemedText type="small" style={styles.flex}>
                {item.zone} · {item.damage_type} · {item.severity}
                {item.photo_urls.length ? `  · ${item.photo_urls.length} photo(s)` : ''}
              </ThemedText>
              <TouchableOpacity onPress={() => onRemove(i)}>
                <ThemedText type="small" style={styles.remove}>
                  Remove
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.form}>
        <ThemedText type="smallBold">Add new damage</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Zone</ThemedText>
        <ChipSelect options={ZONES} selected={zone} onSelect={setZone} />
        <ThemedText type="small" themeColor="textSecondary">Type</ThemedText>
        <ChipSelect options={DAMAGE_TYPES} selected={type} onSelect={setType} />
        <ThemedText type="small" themeColor="textSecondary">Severity</ThemedText>
        <ChipSelect options={SEVERITIES} selected={severity} onSelect={setSeverity} />
        <TextInput
          placeholder="Description (optional)"
          placeholderTextColor={Colors.light.textSecondary}
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />

        <View style={styles.photoRow}>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={addPhoto}
            disabled={uploading}
          >
            <ThemedText type="small">
              {uploading ? 'Uploading…' : '+ Photo'}
            </ThemedText>
          </TouchableOpacity>
          {photos.length ? (
            <ThemedText type="small" themeColor="textSecondary">
              {photos.length} attached
            </ThemedText>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
          onPress={add}
          disabled={!canAdd}
        >
          <ThemedText type="smallBold" style={styles.addText}>
            Add to inspection
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  flex: { flex: 1 },
  added: { gap: Spacing.two },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: Spacing.three,
  },
  remove: { color: '#D92D20' },
  form: {
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    color: Colors.light.text,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  photoBtn: {
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  addBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  addBtnDisabled: { backgroundColor: Colors.light.backgroundSelected },
  addText: { color: '#fff' },
});
