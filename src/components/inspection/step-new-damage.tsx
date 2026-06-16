import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ChipSelect } from '@/components/inspection/chip-select';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { notify } from '@/lib/dialogs';
import {
  DAMAGE_TYPES,
  SEVERITIES,
  ZONES,
  type NewDamageInput,
  type ZoneStatus,
} from '@/lib/inspection';
import { captureDamagePhoto, type PhotoContext } from '@/lib/photos';
import type { DamageSeverity, DamageType, DamageZone } from '@/types/database';

function zoneLabel(zone: DamageZone): string {
  return ZONES.find((z) => z.value === zone)?.label ?? zone;
}

export function StepNewDamage({
  zones,
  items,
  onAdd,
  onRemove,
  photoContext,
}: {
  zones: Record<string, ZoneStatus>;
  items: NewDamageInput[];
  onAdd: (item: NewDamageInput) => void;
  onRemove: (index: number) => void;
  photoContext: PhotoContext;
}) {
  const [activeZone, setActiveZone] = useState<DamageZone | null>(null);
  const [showAllZones, setShowAllZones] = useState(false);
  const [type, setType] = useState<DamageType | null>(null);
  const [severity, setSeverity] = useState<DamageSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Zones the lead flagged as "damage" in the walkaround drive the prompts.
  const flaggedZones = ZONES.filter((z) => zones[z.value] === 'damage');
  const zonesToOffer = showAllZones ? ZONES : flaggedZones;

  function openForm(zone: DamageZone) {
    setActiveZone(zone);
    setType(null);
    setSeverity(null);
    setDescription('');
    setPhotos([]);
  }

  async function addPhoto() {
    try {
      setUploading(true);
      const path = await captureDamagePhoto(photoContext, 'library');
      if (path) setPhotos((p) => [...p, path]);
    } catch (e) {
      notify('Photo upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!activeZone || !type || !severity) return;
    onAdd({ zone: activeZone, damage_type: type, severity, description, photo_urls: photos });
    setActiveZone(null);
  }

  return (
    <View style={styles.container}>
      {flaggedZones.length === 0 && !showAllZones ? (
        <View style={styles.empty}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
            No damage flagged in the walkaround — nothing to log here.
          </ThemedText>
          <TouchableOpacity onPress={() => setShowAllZones(true)}>
            <ThemedText type="link" themeColor="textSecondary">
              Log damage in another area anyway
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Add the damage you found. Tap an area to log it — you can add several.
          </ThemedText>
          <View style={styles.bubbles}>
            {zonesToOffer.map((z) => {
              const count = items.filter((i) => i.zone === z.value).length;
              return (
                <TouchableOpacity
                  key={z.value}
                  style={[styles.bubble, activeZone === z.value && styles.bubbleActive]}
                  onPress={() => openForm(z.value)}
                >
                  <ThemedText
                    type="small"
                    style={activeZone === z.value ? styles.bubbleTextActive : undefined}
                  >
                    + Add {z.label.toLowerCase()} damage{count > 0 ? ` (${count})` : ''}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Logged items */}
      {items.length > 0 ? (
        <View style={styles.added}>
          {items.map((item, i) => (
            <View key={i} style={styles.addedRow}>
              <ThemedText type="small" style={styles.flex}>
                {zoneLabel(item.zone)} · {item.damage_type} · {item.severity}
                {item.photo_urls.length ? ` · ${item.photo_urls.length} photo(s)` : ''}
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

      {/* Add form for the selected area */}
      {activeZone ? (
        <View style={styles.form}>
          <ThemedText type="smallBold">New {zoneLabel(activeZone).toLowerCase()} damage</ThemedText>
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
            <TouchableOpacity style={styles.photoBtn} onPress={addPhoto} disabled={uploading}>
              <ThemedText type="small">{uploading ? 'Uploading…' : '+ Photo'}</ThemedText>
            </TouchableOpacity>
            {photos.length ? (
              <ThemedText type="small" themeColor="textSecondary">
                {photos.length} attached
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveZone(null)}>
              <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !(type && severity) && styles.saveBtnDisabled]}
              onPress={save}
              disabled={!(type && severity)}
            >
              <ThemedText type="smallBold" style={styles.saveText}>
                Add
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  bubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bubble: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  bubbleActive: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  bubbleTextActive: { color: '#fff' },
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
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.three, marginTop: Spacing.one },
  cancelBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  saveBtnDisabled: { backgroundColor: Colors.light.backgroundSelected },
  saveText: { color: '#fff' },
});
