import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { Van, VanLock } from '@/types/database';

export interface VanWithLock extends Van {
  lock: VanLock | null;
}

async function fetchVansWithLocks(): Promise<VanWithLock[]> {
  // RLS scopes both queries to the caller's fleet automatically.
  const [vansRes, locksRes] = await Promise.all([
    supabase.from('vans').select('*').is('deleted_at', null).order('reg'),
    supabase.from('van_locks').select('*'),
  ]);

  if (vansRes.error) throw new Error(vansRes.error.message);
  if (locksRes.error) throw new Error(locksRes.error.message);

  const locksByVan = new Map<string, VanLock>();
  for (const lock of (locksRes.data ?? []) as VanLock[]) {
    locksByVan.set(lock.van_id, lock);
  }

  return ((vansRes.data ?? []) as Van[]).map((van) => ({
    ...van,
    lock: locksByVan.get(van.id) ?? null,
  }));
}

const VANS_KEY = ['vans'] as const;

/**
 * Vans for the current fleet joined with any active lock. Subscribes to realtime
 * changes on van_locks so claim/release shows up live without polling.
 */
export function useVans() {
  const query = useQuery({ queryKey: VANS_KEY, queryFn: fetchVansWithLocks });

  useEffect(() => {
    const channel = supabase
      .channel('van_locks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'van_locks' },
        () => query.refetch(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vans' },
        () => query.refetch(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // query.refetch is stable for the query instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}
