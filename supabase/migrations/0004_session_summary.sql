-- Daily session completion + auto-generated summary report.

-- Immutable snapshot of the end-of-day report, stored on the session.
alter table public.sessions add column summary jsonb;

-- ---------------------------------------------------------------------------
-- complete_session: finalise the day's official check. Aggregates the session's
-- completed inspections into a summary (mirrors buildSessionSummary in
-- src/lib/rules.ts), stores it, marks the session complete, and pushes a
-- session_complete notification to every manager. Cannot be re-run (the design
-- rule: a session can't be restarted, only appended to the next day).
-- ---------------------------------------------------------------------------
create or replace function public.complete_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet uuid := public.current_fleet_id();
  v_sess public.sessions;
  v_total int;
  v_done int;
  v_clear int;
  v_new int;
  v_grounded int;
  v_fluids_low int;
  v_regs text[];
  v_summary jsonb;
begin
  select * into v_sess from public.sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found';
  end if;
  if v_sess.fleet_id <> v_fleet then
    raise exception 'Not your fleet';
  end if;
  if v_sess.status = 'complete' then
    raise exception 'Session already complete';
  end if;

  v_total := v_sess.total_vans;

  select
    count(*) filter (where i.completed_at is not null),
    count(*) filter (where i.result = 'clear'),
    count(*) filter (where i.result = 'new_damage'),
    count(*) filter (where i.result = 'grounded'),
    count(*) filter (where i.completed_at is not null and (
      coalesce((i.fluid_levels ->> 'adblue')::numeric, 100) <= 10 or
      coalesce((i.fluid_levels ->> 'coolant')::numeric, 100) <= 10 or
      coalesce((i.fluid_levels ->> 'screenwash')::numeric, 100) <= 10))
  into v_done, v_clear, v_new, v_grounded, v_fluids_low
  from public.inspections i
  where i.session_id = p_session_id;

  select coalesce(array_agg(v.reg order by v.reg), '{}')
  into v_regs
  from public.inspections i
  join public.vans v on v.id = i.van_id
  where i.session_id = p_session_id and i.result = 'grounded';

  v_summary := jsonb_build_object(
    'total_vans', v_total,
    'vans_done', v_done,
    'vans_pending', greatest(0, v_total - v_done),
    'clear', v_clear,
    'new_damage', v_new,
    'grounded', v_grounded,
    'grounded_regs', to_jsonb(v_regs),
    'fluids_low', v_fluids_low
  );

  update public.sessions
  set status = 'complete', completed_at = now(), summary = v_summary
  where id = p_session_id;

  insert into public.notifications (fleet_id, recipient_id, type, payload)
  select v_fleet, p.id, 'session_complete',
         v_summary || jsonb_build_object('session_id', p_session_id, 'date', v_sess.date)
  from public.profiles p
  where p.fleet_id = v_fleet and p.role = 'manager';

  return v_summary;
end;
$$;

grant execute on function public.complete_session(uuid) to authenticated;
