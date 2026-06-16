import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type {
  ConfirmationOutcome,
  DamageReport,
  DamageSeverity,
  DamageType,
  DamageZone,
  FluidLevels,
  Inspection,
  InspectionResult,
  Van,
} from '@/types/database';

export const ZONES: { value: DamageZone; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'nearside', label: 'Nearside' },
  { value: 'offside', label: 'Offside' },
  { value: 'rear', label: 'Rear' },
  { value: 'roof', label: 'Roof' },
  { value: 'other', label: 'Other' },
];

export const DAMAGE_TYPES: { value: DamageType; label: string }[] = [
  { value: 'dent', label: 'Dent' },
  { value: 'scrape', label: 'Scrape' },
  { value: 'crack', label: 'Crack' },
  { value: 'broken_part', label: 'Broken part' },
  { value: 'other', label: 'Other' },
];

export const SEVERITIES: { value: DamageSeverity; label: string }[] = [
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'repair_needed', label: 'Repair needed' },
  { value: 'groundable', label: 'Groundable' },
];

/** Zone walkaround outcome stored in inspections.zones_checked. */
export type ZoneStatus = 'clear' | 'damage';

export interface NewDamageInput {
  zone: DamageZone;
  damage_type: DamageType;
  severity: DamageSeverity;
  description: string;
  photo_urls: string[];
}

export interface ConfirmationInput {
  damage_report_id: string;
  outcome: ConfirmationOutcome;
  note: string | null;
}

export interface SubmitInspectionInput {
  inspectionId: string;
  zones: Record<string, ZoneStatus>;
  fluids: FluidLevels;
  newDamage: NewDamageInput[];
  confirmations: ConfirmationInput[];
}

/** Claim a van: ensures a session, takes the lock, returns a draft inspection id. */
export async function claimVan(vanId: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_van', { p_van_id: vanId });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Submit a completed inspection atomically. Returns the inspection result. */
export async function submitInspection(
  input: SubmitInspectionInput,
): Promise<InspectionResult> {
  const { data, error } = await supabase.rpc('submit_inspection', {
    p_inspection_id: input.inspectionId,
    p_zones: input.zones,
    p_fluids: input.fluids,
    p_new_damage: input.newDamage,
    p_confirmations: input.confirmations,
  });
  if (error) throw new Error(error.message);
  return data as InspectionResult;
}

/** Open (non-resolved) damage reports for a van — the "known damage" to confirm. */
export function useKnownDamage(vanId: string | undefined) {
  return useQuery({
    queryKey: ['known-damage', vanId],
    enabled: !!vanId,
    queryFn: async (): Promise<DamageReport[]> => {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('van_id', vanId!)
        .neq('status', 'resolved')
        .order('reported_at');
      if (error) throw new Error(error.message);
      return (data ?? []) as DamageReport[];
    },
  });
}

export interface InspectionWithVan extends Inspection {
  van: Pick<Van, 'reg' | 'make' | 'model'> | null;
}

/** The current lead's in-progress (not yet submitted) inspections. */
export function useInProgressInspections() {
  return useQuery({
    queryKey: ['inspections', 'in-progress'],
    queryFn: async (): Promise<InspectionWithVan[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*, van:vans(reg, make, model)')
        .is('completed_at', null)
        .order('started_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as InspectionWithVan[];
    },
  });
}

/** Fetch a single inspection (to resolve its van for the wizard header). */
export function useInspection(inspectionId: string) {
  return useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async (): Promise<InspectionWithVan> => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*, van:vans(reg, make, model)')
        .eq('id', inspectionId)
        .single();
      if (error) throw new Error(error.message);
      return data as InspectionWithVan;
    },
  });
}
