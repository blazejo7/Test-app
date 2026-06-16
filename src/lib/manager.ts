import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { SummaryInspection } from '@/lib/rules';
import type {
  DamageReport,
  Inspection,
  InspectionResult,
  Session,
  SessionSummary,
  Van,
} from '@/types/database';

/** Today's official session for the fleet (RLS-scoped), or null if not started. */
export function useTodaySession() {
  return useQuery({
    queryKey: ['session', 'today'],
    queryFn: async (): Promise<Session | null> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Session | null;
    },
  });
}

export interface ActivityRow extends Inspection {
  van: Pick<Van, 'reg'> | null;
  lead: { name: string } | null;
  result: InspectionResult | null;
}

/** Recently completed inspections with van + lead, newest first. */
export function useRecentActivity(limit = 15) {
  return useQuery({
    queryKey: ['activity', 'recent', limit],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*, van:vans(reg), lead:profiles(name)')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as ActivityRow[];
    },
  });
}

export interface GroundedVan extends Pick<Van, 'id' | 'reg' | 'make' | 'model' | 'status'> {
  groundable: Pick<DamageReport, 'id' | 'zone' | 'description' | 'severity'>[];
}

/** Grounded vans awaiting manager sign-off, with their open groundable damage. */
export function useSignoffQueue() {
  return useQuery({
    queryKey: ['signoff', 'queue'],
    queryFn: async (): Promise<GroundedVan[]> => {
      const { data, error } = await supabase
        .from('vans')
        .select('id, reg, make, model, status, damage:damage_reports(id, zone, description, severity, status)')
        .eq('status', 'grounded')
        .order('reg');
      if (error) throw new Error(error.message);

      type Row = Pick<Van, 'id' | 'reg' | 'make' | 'model' | 'status'> & {
        damage: (Pick<DamageReport, 'id' | 'zone' | 'description' | 'severity'> & {
          status: DamageReport['status'];
        })[];
      };

      return ((data ?? []) as Row[]).map((v) => ({
        id: v.id,
        reg: v.reg,
        make: v.make,
        model: v.model,
        status: v.status,
        groundable: v.damage.filter((d) => d.severity === 'groundable' && d.status !== 'resolved'),
      }));
    },
  });
}

/** Count of this manager's unread grounded-van sign-off notifications. */
export function useUnreadSignoffCount() {
  return useQuery({
    queryKey: ['signoff', 'unread'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'grounded_signoff')
        .is('read_at', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}

export interface SessionInspection extends SummaryInspection {
  id: string;
}

/** All inspections in a session (for the live summary preview). */
export function useSessionInspections(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-inspections', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionInspection[]> => {
      const { data, error } = await supabase
        .from('inspections')
        .select('id, completed_at, result, fluid_levels, van:vans(reg)')
        .eq('session_id', sessionId!);
      if (error) throw new Error(error.message);
      // PostgREST returns `van` as a single object for this to-one embed; the
      // untyped client mis-infers it as an array, so cast through unknown.
      return (data ?? []) as unknown as SessionInspection[];
    },
  });
}

/** Finalise the day's session; returns the stored summary snapshot. */
export async function completeSession(sessionId: string): Promise<SessionSummary> {
  const { data, error } = await supabase.rpc('complete_session', { p_session_id: sessionId });
  if (error) throw new Error(error.message);
  return data as SessionSummary;
}

/** Manager signs off a grounded van. Returns the van's new status. */
export async function releaseGroundedVan(vanId: string): Promise<string> {
  const { data, error } = await supabase.rpc('release_grounded_van', { p_van_id: vanId });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Keep the manager views live: invalidate the dashboard / queue queries when
 * inspections, vans, sessions, or sign-off notifications change.
 */
export function useManagerRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['session-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['signoff'] });
    };
    const channel = supabase
      .channel('manager_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vans' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
