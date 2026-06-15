import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile, Rota, RotaStatus } from '@/types/database';

/** Keep rota views live: invalidate on any rota change in the fleet. */
export function useRotaRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('rota_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rota' }, () => {
        queryClient.invalidateQueries({ queryKey: ['rota'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** The current lead's rota rows for the given window dates, keyed by date. */
export function useMyRota(leadId: string | undefined, dates: string[]) {
  return useQuery({
    queryKey: ['rota', 'mine', leadId, dates],
    enabled: !!leadId,
    queryFn: async (): Promise<Record<string, Rota>> => {
      const { data, error } = await supabase
        .from('rota')
        .select('*')
        .eq('lead_id', leadId!)
        .in('date', dates);
      if (error) throw new Error(error.message);
      const byDate: Record<string, Rota> = {};
      for (const row of (data ?? []) as Rota[]) byDate[row.date] = row;
      return byDate;
    },
  });
}

export interface RotaGrid {
  leads: Pick<Profile, 'id' | 'name' | 'avatar_initials'>[];
  /** rota[leadId][date] -> row */
  rota: Record<string, Record<string, Rota>>;
}

/** Manager view: every lead in the fleet and their rota status per window date. */
export function useRotaGrid(dates: string[]) {
  return useQuery({
    queryKey: ['rota', 'grid', dates],
    queryFn: async (): Promise<RotaGrid> => {
      const [leadsRes, rotaRes] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_initials').eq('role', 'lead').order('name'),
        supabase.from('rota').select('*').in('date', dates),
      ]);
      if (leadsRes.error) throw new Error(leadsRes.error.message);
      if (rotaRes.error) throw new Error(rotaRes.error.message);

      const rota: Record<string, Record<string, Rota>> = {};
      for (const row of (rotaRes.data ?? []) as Rota[]) {
        (rota[row.lead_id] ??= {})[row.date] = row;
      }
      return {
        leads: (leadsRes.data ?? []) as RotaGrid['leads'],
        rota,
      };
    },
  });
}

export async function setAvailability(date: string, status: RotaStatus): Promise<void> {
  const { error } = await supabase.rpc('set_availability', { p_date: date, p_status: status });
  if (error) throw new Error(error.message);
}

export async function setAssignment(
  leadId: string,
  date: string,
  assigned: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_assignment', {
    p_lead_id: leadId,
    p_date: date,
    p_assigned: assigned,
  });
  if (error) throw new Error(error.message);
}

/** Publish a day's assignments. Returns how many leads were notified. */
export async function publishRota(date: string): Promise<number> {
  const { data, error } = await supabase.rpc('publish_rota', { p_date: date });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function confirmRota(date: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_rota', { p_date: date });
  if (error) throw new Error(error.message);
}

/** Expo push tokens for the leads assigned on a date (manager-readable via RLS). */
export async function tokensForAssignedLeads(date: string): Promise<string[]> {
  const { data: assigned, error: aErr } = await supabase
    .from('rota')
    .select('lead_id')
    .eq('date', date)
    .eq('status', 'assigned');
  if (aErr) throw new Error(aErr.message);
  const leadIds = (assigned ?? []).map((r) => (r as { lead_id: string }).lead_id);
  if (leadIds.length === 0) return [];

  const { data: tokens, error: tErr } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', leadIds);
  if (tErr) throw new Error(tErr.message);
  return (tokens ?? []).map((t) => (t as { token: string }).token);
}
