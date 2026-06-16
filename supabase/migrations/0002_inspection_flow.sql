-- Inspection flow RPCs: atomic claim + submit.
-- Both run as SECURITY DEFINER (bypassing RLS) but enforce ownership via
-- auth.uid() internally, so a lead can only act on their own fleet / inspection.

-- ---------------------------------------------------------------------------
-- claim_van: ensure today's session exists, take/refresh the van lock, and
-- return a draft inspection id (reusing an in-progress one if present).
-- Fails if another lead holds an unexpired lock on the van.
-- ---------------------------------------------------------------------------
create or replace function public.claim_van(p_van_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fleet uuid := public.current_fleet_id();
  v_session uuid;
  v_inspection uuid;
  v_lock public.van_locks;
begin
  if v_uid is null or v_fleet is null then
    raise exception 'Not authenticated';
  end if;

  -- Van must belong to the caller's fleet and not be deleted.
  if not exists (
    select 1 from public.vans
    where id = p_van_id and fleet_id = v_fleet and deleted_at is null
  ) then
    raise exception 'Van not found in your fleet';
  end if;

  -- One official session per day; create it if this is the first claim today.
  insert into public.sessions (fleet_id, date, started_by, total_vans)
  values (
    v_fleet,
    current_date,
    v_uid,
    (select count(*) from public.vans where fleet_id = v_fleet and deleted_at is null)
  )
  on conflict (fleet_id, date) do nothing;
  select id into v_session
  from public.sessions where fleet_id = v_fleet and date = current_date;

  -- Lock check: reject only if someone else holds an unexpired lock.
  select * into v_lock from public.van_locks where van_id = p_van_id;
  if found and v_lock.expires_at > now() and v_lock.locked_by <> v_uid then
    raise exception 'Van is already claimed by another lead';
  end if;

  insert into public.van_locks (van_id, fleet_id, locked_by, locked_at, expires_at)
  values (p_van_id, v_fleet, v_uid, now(), now() + interval '15 minutes')
  on conflict (van_id) do update
    set locked_by = excluded.locked_by,
        fleet_id = excluded.fleet_id,
        locked_at = excluded.locked_at,
        expires_at = excluded.expires_at;

  -- Reuse an in-progress inspection for this van/session/lead, else create one.
  select id into v_inspection
  from public.inspections
  where van_id = p_van_id and session_id = v_session
    and lead_id = v_uid and completed_at is null
  limit 1;

  if v_inspection is null then
    insert into public.inspections (fleet_id, van_id, lead_id, session_id)
    values (v_fleet, p_van_id, v_uid, v_session)
    returning id into v_inspection;
  end if;

  return v_inspection;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_inspection: write new damage + known-damage confirmations, finalise
-- the inspection (zones, fluids, result, completed_at), and release the lock.
-- All in one transaction. Returns the inspection result.
--
-- p_new_damage:    jsonb array of {zone, damage_type, severity, description, photo_urls[]}
-- p_confirmations: jsonb array of {damage_report_id, outcome, note}
-- ---------------------------------------------------------------------------
create or replace function public.submit_inspection(
  p_inspection_id uuid,
  p_zones jsonb,
  p_fluids jsonb,
  p_new_damage jsonb default '[]',
  p_confirmations jsonb default '[]'
)
returns public.inspection_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_insp public.inspections;
  v_elem jsonb;
  v_result public.inspection_result;
begin
  select * into v_insp from public.inspections where id = p_inspection_id;
  if not found then
    raise exception 'Inspection not found';
  end if;
  if v_insp.lead_id <> v_uid then
    raise exception 'Not your inspection';
  end if;
  if v_insp.completed_at is not null then
    raise exception 'Inspection already submitted';
  end if;

  -- New damage reports (the damage_reports_status_sync trigger recomputes the
  -- van status from these).
  for v_elem in select * from jsonb_array_elements(coalesce(p_new_damage, '[]'))
  loop
    insert into public.damage_reports (
      fleet_id, van_id, zone, description, damage_type, severity, status,
      photo_urls, reported_by
    )
    values (
      v_insp.fleet_id,
      v_insp.van_id,
      (v_elem ->> 'zone')::public.damage_zone,
      v_elem ->> 'description',
      (v_elem ->> 'damage_type')::public.damage_type,
      (v_elem ->> 'severity')::public.damage_severity,
      'new',
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(v_elem -> 'photo_urls')),
        '{}'
      ),
      v_uid
    );
  end loop;

  -- Known-damage confirmations (trigger maintains the confirmation cache).
  for v_elem in select * from jsonb_array_elements(coalesce(p_confirmations, '[]'))
  loop
    insert into public.damage_confirmations (
      fleet_id, damage_report_id, inspection_id, outcome, note, confirmed_by
    )
    values (
      v_insp.fleet_id,
      (v_elem ->> 'damage_report_id')::uuid,
      p_inspection_id,
      (v_elem ->> 'outcome')::public.confirmation_outcome,
      v_elem ->> 'note',
      v_uid
    );
  end loop;

  -- Result mirrors the van's recomputed status (same labels).
  select status::text::public.inspection_result into v_result
  from public.vans where id = v_insp.van_id;

  update public.inspections
  set zones_checked = p_zones,
      fluid_levels = p_fluids,
      result = v_result,
      completed_at = now()
  where id = p_inspection_id;

  delete from public.van_locks where van_id = v_insp.van_id and locked_by = v_uid;

  return v_result;
end;
$$;

grant execute on function public.claim_van(uuid) to authenticated;
grant execute on function public.submit_inspection(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
