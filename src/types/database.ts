/**
 * Hand-authored types mirroring supabase/migrations/0001_init.sql.
 *
 * In a live project these are generated with:
 *   npx supabase gen types typescript --local > src/types/database.ts
 * They are committed by hand here so the scaffold type-checks without a
 * running database. Keep this file in sync with the migration until the
 * generated workflow is wired up.
 */

export type Role = 'lead' | 'manager';

export type VanStatus = 'clear' | 'new_damage' | 'grounded';

export type DamageZone = 'front' | 'nearside' | 'offside' | 'rear' | 'roof' | 'other';

export type DamageType = 'dent' | 'scrape' | 'crack' | 'broken_part' | 'other';

export type DamageSeverity = 'cosmetic' | 'monitor' | 'repair_needed' | 'groundable';

export type DamageStatus = 'new' | 'known' | 'resolved';

export type ConfirmationOutcome = 'same' | 'worse';

export type InspectionResult = 'clear' | 'new_damage' | 'grounded';

export type SessionStatus = 'active' | 'complete';

export type RotaStatus = 'available' | 'assigned' | 'absent';

export type NotificationType = 'grounded_signoff' | 'rota_published' | 'session_complete';

export interface Fleet {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string; // references auth.users.id
  fleet_id: string;
  name: string;
  email: string;
  role: Role;
  avatar_initials: string | null;
  created_at: string;
  updated_at: string;
}

export interface Van {
  id: string;
  fleet_id: string;
  reg: string;
  make: string;
  model: string;
  status: VanStatus;
  added_date: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DamageReport {
  id: string;
  fleet_id: string;
  van_id: string;
  zone: DamageZone;
  description: string | null;
  damage_type: DamageType;
  severity: DamageSeverity;
  status: DamageStatus;
  photo_urls: string[];
  reported_by: string;
  reported_at: string;
  last_confirmed_at: string | null;
  times_confirmed: number;
  created_at: string;
  updated_at: string;
}

export interface DamageConfirmation {
  id: string;
  fleet_id: string;
  damage_report_id: string;
  inspection_id: string;
  outcome: ConfirmationOutcome;
  note: string | null;
  confirmed_by: string;
  confirmed_at: string;
}

export interface FluidLevels {
  adblue: number;
  coolant: number;
  screenwash: number;
}

export interface Inspection {
  id: string;
  fleet_id: string;
  van_id: string;
  lead_id: string;
  session_id: string;
  started_at: string;
  completed_at: string | null;
  zones_checked: Record<DamageZone, string> | null;
  fluid_levels: FluidLevels | null;
  result: InspectionResult | null;
  created_at: string;
  updated_at: string;
}

/** Aggregated end-of-day report, computed and stored by complete_session(). */
export interface SessionSummary {
  total_vans: number;
  vans_done: number;
  vans_pending: number;
  clear: number;
  new_damage: number;
  grounded: number;
  grounded_regs: string[];
  fluids_low: number;
}

export interface Session {
  id: string;
  fleet_id: string;
  date: string;
  started_by: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  total_vans: number;
  vans_done: number;
  summary: SessionSummary | null;
  created_at: string;
  updated_at: string;
}

export interface VanLock {
  van_id: string;
  fleet_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

export interface Rota {
  id: string;
  fleet_id: string;
  date: string;
  lead_id: string;
  status: RotaStatus;
  confirmed: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  fleet_id: string;
  token: string;
  platform: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  fleet_id: string;
  recipient_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
