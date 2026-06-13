import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  StepKnownDamage,
  type ConfirmationDraft,
} from '@/components/inspection/step-known-damage';
import { StepNewDamage } from '@/components/inspection/step-new-damage';
import { StepFluids } from '@/components/inspection/step-fluids';
import { StepReview } from '@/components/inspection/step-review';
import { StepWalkaround } from '@/components/inspection/step-walkaround';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  submitInspection,
  useInspection,
  useKnownDamage,
  ZONES,
  type NewDamageInput,
  type ZoneStatus,
} from '@/lib/inspection';
import type { DamageZone, FluidLevels } from '@/types/database';

const STEPS = ['Known damage', 'Walkaround', 'New damage', 'Fluids', 'Review'];

export default function InspectionWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const inspectionQuery = useInspection(id);
  const vanId = inspectionQuery.data?.van_id;
  const knownDamageQuery = useKnownDamage(vanId);

  const [step, setStep] = useState(0);
  const [confirmations, setConfirmations] = useState<Record<string, ConfirmationDraft>>({});
  const [zones, setZones] = useState<Record<string, ZoneStatus>>({});
  const [newDamage, setNewDamage] = useState<NewDamageInput[]>([]);
  const [fluids, setFluids] = useState<FluidLevels>({ adblue: 100, coolant: 100, screenwash: 100 });
  const [submitting, setSubmitting] = useState(false);

  const knownDamage = knownDamageQuery.data ?? [];
  const loading = inspectionQuery.isLoading || knownDamageQuery.isLoading;

  function canProceed(): boolean {
    if (step === 0) return knownDamage.every((d) => confirmations[d.id]?.outcome);
    if (step === 1) return ZONES.every((z) => zones[z.value]);
    return true;
  }

  async function onSubmit() {
    if (!vanId) return;
    setSubmitting(true);
    try {
      const confirmationList = Object.entries(confirmations).map(([damage_report_id, draft]) => ({
        damage_report_id,
        outcome: draft.outcome,
        note: draft.note.trim() || null,
      }));
      const result = await submitInspection({
        inspectionId: id,
        zones,
        fluids,
        newDamage,
        confirmations: confirmationList,
      });
      await queryClient.invalidateQueries({ queryKey: ['vans'] });
      await queryClient.invalidateQueries({ queryKey: ['inspections'] });
      Alert.alert('Inspection submitted', `Result: ${result.replace('_', ' ')}`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (inspectionQuery.isError || !inspectionQuery.data) {
    return (
      <SafeAreaView style={styles.center}>
        <ThemedText type="small" style={styles.error}>
          Couldn&apos;t load this inspection.
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="link" themeColor="textSecondary">
            Close
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const van = inspectionQuery.data.van;
  const isLast = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <ThemedText type="smallBold">{van?.reg ?? 'Inspection'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="small" themeColor="textSecondary">
            Close
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.progressBar, i <= step && styles.progressBarActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {step === 0 && (
          <StepKnownDamage
            knownDamage={knownDamage}
            confirmations={confirmations}
            onChange={(damageId, draft) =>
              setConfirmations((c) => ({ ...c, [damageId]: draft }))
            }
          />
        )}
        {step === 1 && (
          <StepWalkaround
            zones={zones}
            onSet={(zone: DamageZone, status) => setZones((z) => ({ ...z, [zone]: status }))}
          />
        )}
        {step === 2 && profile && vanId && (
          <StepNewDamage
            items={newDamage}
            onAdd={(item) => setNewDamage((d) => [...d, item])}
            onRemove={(index) => setNewDamage((d) => d.filter((_, i) => i !== index))}
            photoContext={{ fleetId: profile.fleet_id, vanId, inspectionId: id }}
          />
        )}
        {step === 3 && (
          <StepFluids
            fluids={fluids}
            onChange={(key, value) => setFluids((f) => ({ ...f, [key]: value }))}
          />
        )}
        {step === 4 && (
          <StepReview
            zones={zones}
            newDamage={newDamage}
            confirmationCount={Object.keys(confirmations).length}
            fluids={fluids}
            knownDamage={knownDamage}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => setStep((s) => s - 1)}
          >
            <ThemedText type="smallBold">Back</ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={styles.btnSpacer} />
        )}

        {isLast ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, submitting && styles.btnDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.btnPrimaryText}>
                Submit
              </ThemedText>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, !canProceed() && styles.btnDisabled]}
            onPress={() => canProceed() && setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            <ThemedText type="smallBold" style={styles.btnPrimaryText}>
              Next
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  error: { color: '#D92D20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.backgroundSelected,
  },
  progressBarActive: { backgroundColor: '#208AEF' },
  body: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSpacer: { flex: 1 },
  btnSecondary: { backgroundColor: Colors.light.backgroundElement },
  btnPrimary: { backgroundColor: '#208AEF' },
  btnPrimaryText: { color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
