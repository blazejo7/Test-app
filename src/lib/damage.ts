import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { DamageConfirmation, DamageReport, DamageStatus, Van } from '@/types/database';

export type DamageFilter = 'all' | DamageStatus;

export const DAMAGE_FILTERS: { value: DamageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'known', label: 'Known' },
  { value: 'resolved', label: 'Resolved' },
];

export interface DamageReportWithVan extends DamageReport {
  van: Pick<Van, 'reg' | 'make' | 'model'> | null;
}

export interface DamageConfirmationWithUser extends DamageConfirmation {
  confirmer: { name: string } | null;
}

/** Fleet damage reports (RLS-scoped), newest first, optionally by status. */
export function useDamageReports(filter: DamageFilter) {
  return useQuery({
    queryKey: ['damage-reports', filter],
    queryFn: async (): Promise<DamageReportWithVan[]> => {
      let query = supabase
        .from('damage_reports')
        .select('*, van:vans(reg, make, model)')
        .order('reported_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as DamageReportWithVan[];
    },
  });
}

/** A single damage report plus its confirmation history. */
export function useDamageReport(id: string) {
  return useQuery({
    queryKey: ['damage-report', id],
    queryFn: async () => {
      const [reportRes, historyRes] = await Promise.all([
        supabase
          .from('damage_reports')
          .select('*, van:vans(reg, make, model)')
          .eq('id', id)
          .single(),
        supabase
          .from('damage_confirmations')
          .select('*, confirmer:profiles(name)')
          .eq('damage_report_id', id)
          .order('confirmed_at', { ascending: false }),
      ]);
      if (reportRes.error) throw new Error(reportRes.error.message);
      if (historyRes.error) throw new Error(historyRes.error.message);
      return {
        report: reportRes.data as DamageReportWithVan,
        history: (historyRes.data ?? []) as DamageConfirmationWithUser[],
      };
    },
  });
}
