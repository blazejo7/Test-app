-- Rota: lead availability, manager assignment + publish, lead confirm receipt.
-- Plus device push-token storage for Expo push notifications.

alter table public.rota add column published_at timestamptz;

-- ---------------------------------------------------------------------------
-- Expo push tokens (one row per device). Managers can read their fleet's tokens
-- to send a rota push; users manage their own.
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fleet_id uuid not null references public.fleets (id),
  token text not null unique,
  platform text,
  created_at timestamptz not null default now()
);
create index push_tokens_fleet_idx on public.push_tokens (fleet_id);

alter table public.push_tokens enable row level security;

create policy push_tokens_select on public.push_tokens
  for select using (
    user_id = auth.uid()
    or (public.current_app_role() = 'manager' and fleet_id = public.current_fleet_id())
  );
create policy push_tokens_write on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- set_availability: a lead marks themselves available / absent for a day in the
-- planning window (today .. +2). Re-marking clears any prior publish/confirm.
-- ---------------------------------------------------------------------------
create or replace function public.set_availability(p_date date, p_status public.rota_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fleet uuid := public.current_fleet_id();
begin
  if p_status not in ('available', 'absent') then
    raise exception 'A lead can only set available or absent';
  end if;
  if p_date < current_date or p_date > current_date + 2 then
    raise exception 'Availability can only be set for the next 2 days';
  end if;

  insert into public.rota (fleet_id, date, lead_id, status, confirmed, published_at)
  values (v_fleet, p_date, v_uid, p_status, false, null)
  on conflict (lead_id, date) do update
    set status = excluded.status, confirmed = false, published_at = null;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_assignment: manager assigns / unassigns a lead for a day.
-- ---------------------------------------------------------------------------
create or replace function public.set_assignment(
  p_lead_id uuid,
  p_date date,
  p_assigned boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet uuid := public.current_fleet_id();
begin
  if public.current_app_role() <> 'manager' then
    raise exception 'Only managers can assign the rota';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_lead_id and fleet_id = v_fleet and role = 'lead'
  ) then
    raise exception 'Lead not found in your fleet';
  end if;

  insert into public.rota (fleet_id, date, lead_id, status, confirmed, published_at)
  values (
    v_fleet, p_date, p_lead_id,
    (case when p_assigned then 'assigned' else 'available' end)::public.rota_status,
    false, null
  )
  on conflict (lead_id, date) do update
    set status = (case when p_assigned then 'assigned' else 'available' end)::public.rota_status,
        confirmed = false,
        published_at = null;
end;
$$;

-- ---------------------------------------------------------------------------
-- publish_rota: manager publishes a day's assignments, notifying each assigned
-- lead (in-app + a push is sent client-side). Returns the number notified.
-- ---------------------------------------------------------------------------
create or replace function public.publish_rota(p_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet uuid := public.current_fleet_id();
  v_count integer;
begin
  if public.current_app_role() <> 'manager' then
    raise exception 'Only managers can publish the rota';
  end if;

  update public.rota
  set published_at = now(), confirmed = false
  where fleet_id = v_fleet and date = p_date and status = 'assigned';

  insert into public.notifications (fleet_id, recipient_id, type, payload)
  select v_fleet, r.lead_id, 'rota_published', jsonb_build_object('date', p_date)
  from public.rota r
  where r.fleet_id = v_fleet and r.date = p_date and r.status = 'assigned'
    and r.published_at is not null;

  select count(*) into v_count
  from public.rota
  where fleet_id = v_fleet and date = p_date and status = 'assigned' and published_at is not null;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_rota: an assigned lead confirms receipt of a published assignment.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_rota(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated integer;
begin
  update public.rota
  set confirmed = true
  where lead_id = v_uid and date = p_date and status = 'assigned' and published_at is not null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'No published assignment to confirm for that day';
  end if;
end;
$$;

grant execute on function public.set_availability(date, public.rota_status) to authenticated;
grant execute on function public.set_assignment(uuid, date, boolean) to authenticated;
grant execute on function public.publish_rota(date) to authenticated;
grant execute on function public.confirm_rota(date) to authenticated;

-- Live rota updates for both lead and manager views.
alter publication supabase_realtime add table public.rota;
