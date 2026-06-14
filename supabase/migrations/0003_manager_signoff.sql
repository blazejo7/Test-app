-- Manager dashboard + grounded-van sign-off.

-- Audit trail for sign-off (who released a grounded van and when).
alter table public.damage_reports
  add column resolved_at timestamptz,
  add column resolved_by uuid references public.profiles (id);

-- ---------------------------------------------------------------------------
-- When an inspection grounds a van, queue a sign-off notification for every
-- manager in the fleet (in-app stand-in for push in v1).
-- ---------------------------------------------------------------------------
create or replace function public.on_inspection_grounded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.completed_at is null
     and new.completed_at is not null
     and new.result = 'grounded' then
    insert into public.notifications (fleet_id, recipient_id, type, payload)
    select new.fleet_id, p.id, 'grounded_signoff',
           jsonb_build_object('van_id', new.van_id, 'inspection_id', new.id)
    from public.profiles p
    where p.fleet_id = new.fleet_id and p.role = 'manager';
  end if;
  return new;
end;
$$;
create trigger inspections_grounded_notify
  after update on public.inspections
  for each row execute function public.on_inspection_grounded();

-- ---------------------------------------------------------------------------
-- release_grounded_van: manager signs off a grounded van. Resolves its open
-- groundable damage (the status trigger then un-grounds the van) and clears the
-- related sign-off notifications. Manager-only.
-- ---------------------------------------------------------------------------
create or replace function public.release_grounded_van(p_van_id uuid)
returns public.van_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fleet uuid := public.current_fleet_id();
  v_status public.van_status;
begin
  if public.current_app_role() <> 'manager' then
    raise exception 'Only managers can release grounded vans';
  end if;
  if not exists (
    select 1 from public.vans
    where id = p_van_id and fleet_id = v_fleet and deleted_at is null
  ) then
    raise exception 'Van not found in your fleet';
  end if;

  update public.damage_reports
  set status = 'resolved', resolved_at = now(), resolved_by = v_uid
  where van_id = p_van_id and severity = 'groundable' and status <> 'resolved';

  update public.notifications
  set read_at = now()
  where type = 'grounded_signoff'
    and fleet_id = v_fleet
    and read_at is null
    and (payload ->> 'van_id')::uuid = p_van_id;

  select status into v_status from public.vans where id = p_van_id;
  return v_status;
end;
$$;

grant execute on function public.release_grounded_van(uuid) to authenticated;

-- Live dashboard: stream inspection + session changes to subscribed managers.
alter publication supabase_realtime add table public.inspections;
alter publication supabase_realtime add table public.sessions;
