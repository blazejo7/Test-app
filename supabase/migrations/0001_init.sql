-- FleetFlow initial schema
-- Corrected data model from the spec review: adds fleet_id multi-tenancy,
-- auth<->profile mapping, RLS on every table, lock concurrency guarantees,
-- damage confirmation history, and severity->status / fluid / immutability rules.
--
-- Apply locally with:  npx supabase db reset

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.role as enum ('lead', 'manager');
create type public.van_status as enum ('clear', 'new_damage', 'grounded');
create type public.damage_zone as enum ('front', 'nearside', 'offside', 'rear', 'roof', 'other');
create type public.damage_type as enum ('dent', 'scrape', 'crack', 'broken_part', 'other');
create type public.damage_severity as enum ('cosmetic', 'monitor', 'repair_needed', 'groundable');
create type public.damage_status as enum ('new', 'known', 'resolved');
create type public.confirmation_outcome as enum ('same', 'worse');
create type public.inspection_result as enum ('clear', 'new_damage', 'grounded');
create type public.session_status as enum ('active', 'complete');
create type public.rota_status as enum ('available', 'assigned', 'absent');
create type public.notification_type as enum ('grounded_signoff', 'rota_published', 'session_complete');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.fleets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  fleet_id uuid not null references public.fleets (id),
  name text not null,
  email text not null,
  role public.role not null default 'lead',
  avatar_initials text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_fleet_idx on public.profiles (fleet_id);

create table public.vans (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  reg text not null,
  make text not null,
  model text not null,
  status public.van_status not null default 'clear',
  added_date date not null default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fleet_id, reg)
);
create index vans_fleet_idx on public.vans (fleet_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  date date not null default current_date,
  started_by uuid not null references public.profiles (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.session_status not null default 'active',
  total_vans integer not null default 0,
  vans_done integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One official fleet check per day; next day is a new row.
  unique (fleet_id, date)
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  van_id uuid not null references public.vans (id),
  lead_id uuid not null references public.profiles (id),
  session_id uuid not null references public.sessions (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  zones_checked jsonb,
  fluid_levels jsonb,
  result public.inspection_result,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inspections_session_idx on public.inspections (session_id);
create index inspections_van_idx on public.inspections (van_id);

create table public.damage_reports (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  van_id uuid not null references public.vans (id),
  zone public.damage_zone not null,
  description text,
  damage_type public.damage_type not null,
  severity public.damage_severity not null,
  status public.damage_status not null default 'new',
  photo_urls text[] not null default '{}',
  reported_by uuid not null references public.profiles (id),
  reported_at timestamptz not null default now(),
  last_confirmed_at timestamptz,
  times_confirmed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index damage_reports_van_idx on public.damage_reports (van_id);

create table public.damage_confirmations (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  damage_report_id uuid not null references public.damage_reports (id) on delete cascade,
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  outcome public.confirmation_outcome not null,
  note text,
  confirmed_by uuid not null references public.profiles (id),
  confirmed_at timestamptz not null default now()
);
create index damage_confirmations_report_idx on public.damage_confirmations (damage_report_id);

-- van_id is the PRIMARY KEY: at most one lock per van, so two simultaneous
-- claims can never both succeed.
create table public.van_locks (
  van_id uuid primary key references public.vans (id) on delete cascade,
  fleet_id uuid not null references public.fleets (id),
  locked_by uuid not null references public.profiles (id),
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create table public.rota (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  date date not null,
  lead_id uuid not null references public.profiles (id),
  status public.rota_status not null default 'available',
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, date)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id),
  recipient_id uuid not null references public.profiles (id),
  type public.notification_type not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id);

-- updated_at triggers
create trigger fleets_updated before update on public.fleets
  for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger vans_updated before update on public.vans
  for each row execute function public.set_updated_at();
create trigger sessions_updated before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger inspections_updated before update on public.inspections
  for each row execute function public.set_updated_at();
create trigger damage_reports_updated before update on public.damage_reports
  for each row execute function public.set_updated_at();
create trigger rota_updated before update on public.rota
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Domain rules (mirror src/lib/rules.ts)
-- ---------------------------------------------------------------------------

-- Create a profile row when an auth user signs up. fleet/role/name come from
-- the signup metadata; falls back to the first fleet + 'lead'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fleet uuid;
begin
  v_fleet := nullif(new.raw_user_meta_data ->> 'fleet_id', '')::uuid;
  if v_fleet is null then
    select id into v_fleet from public.fleets order by created_at limit 1;
  end if;

  insert into public.profiles (id, fleet_id, name, email, role, avatar_initials)
  values (
    new.id,
    v_fleet,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.role, 'lead'),
    new.raw_user_meta_data ->> 'avatar_initials'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recompute a van's status from its open (non-resolved) damage reports.
-- Mirrors deriveVanStatus() in src/lib/rules.ts.
create or replace function public.recompute_van_status(p_van_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status public.van_status;
begin
  select case
           when bool_or(severity = 'groundable') then 'grounded'::public.van_status
           when count(*) > 0 then 'new_damage'::public.van_status
           else 'clear'::public.van_status
         end
    into v_status
  from public.damage_reports
  where van_id = p_van_id and status <> 'resolved';

  update public.vans set status = coalesce(v_status, 'clear') where id = p_van_id;
end;
$$;

create or replace function public.on_damage_report_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_van_status(old.van_id);
    return old;
  end if;
  perform public.recompute_van_status(new.van_id);
  if (tg_op = 'UPDATE' and new.van_id <> old.van_id) then
    perform public.recompute_van_status(old.van_id);
  end if;
  return new;
end;
$$;
create trigger damage_reports_status_sync
  after insert or update or delete on public.damage_reports
  for each row execute function public.on_damage_report_change();

-- Maintain damage_reports confirmation cache from damage_confirmations.
create or replace function public.on_damage_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.damage_reports
  set times_confirmed = times_confirmed + 1,
      last_confirmed_at = new.confirmed_at,
      status = case when status = 'new' then 'known' else status end
  where id = new.damage_report_id;
  return new;
end;
$$;
create trigger damage_confirmations_cache
  after insert on public.damage_confirmations
  for each row execute function public.on_damage_confirmation();

-- Keep sessions.vans_done in sync with completed inspections.
create or replace function public.refresh_session_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_session uuid := coalesce(new.session_id, old.session_id);
begin
  update public.sessions s
  set vans_done = (
    select count(*) from public.inspections i
    where i.session_id = v_session and i.completed_at is not null
  )
  where s.id = v_session;
  return coalesce(new, old);
end;
$$;
create trigger inspections_session_progress
  after insert or update or delete on public.inspections
  for each row execute function public.refresh_session_progress();

-- Submitted inspections are read-only. The submit itself (completed_at: null ->
-- timestamp) is allowed; any later update is rejected.
create or replace function public.prevent_completed_inspection_update()
returns trigger language plpgsql as $$
begin
  if (old.completed_at is not null) then
    raise exception 'Submitted inspections are read-only';
  end if;
  return new;
end;
$$;
create trigger inspections_immutable
  before update on public.inspections
  for each row execute function public.prevent_completed_inspection_update();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- Defined after the tables they read. SECURITY DEFINER so policies can look up
-- the caller's fleet/role without recursing into the profiles policies.
-- ---------------------------------------------------------------------------
create or replace function public.current_fleet_id()
returns uuid language sql stable security definer set search_path = public as $$
  select fleet_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_app_role()
returns public.role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.fleets enable row level security;
alter table public.profiles enable row level security;
alter table public.vans enable row level security;
alter table public.sessions enable row level security;
alter table public.inspections enable row level security;
alter table public.damage_reports enable row level security;
alter table public.damage_confirmations enable row level security;
alter table public.van_locks enable row level security;
alter table public.rota enable row level security;
alter table public.notifications enable row level security;

-- fleets: members can read their own fleet.
create policy fleets_select on public.fleets
  for select using (id = public.current_fleet_id());

-- profiles: read fleet mates; update own row.
create policy profiles_select on public.profiles
  for select using (fleet_id = public.current_fleet_id());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- vans: read within fleet; managers manage the registry.
create policy vans_select on public.vans
  for select using (fleet_id = public.current_fleet_id());
create policy vans_manage on public.vans
  for all using (fleet_id = public.current_fleet_id() and public.current_app_role() = 'manager')
  with check (fleet_id = public.current_fleet_id() and public.current_app_role() = 'manager');

-- sessions: any fleet member reads; any lead/manager can start & append.
create policy sessions_select on public.sessions
  for select using (fleet_id = public.current_fleet_id());
create policy sessions_write on public.sessions
  for all using (fleet_id = public.current_fleet_id())
  with check (fleet_id = public.current_fleet_id());

-- inspections: read within fleet; a lead writes their own.
create policy inspections_select on public.inspections
  for select using (fleet_id = public.current_fleet_id());
create policy inspections_insert on public.inspections
  for insert with check (fleet_id = public.current_fleet_id() and lead_id = auth.uid());
create policy inspections_update on public.inspections
  for update using (fleet_id = public.current_fleet_id() and lead_id = auth.uid())
  with check (fleet_id = public.current_fleet_id() and lead_id = auth.uid());

-- damage reports: read within fleet; fleet members create; reporter or manager edits.
create policy damage_reports_select on public.damage_reports
  for select using (fleet_id = public.current_fleet_id());
create policy damage_reports_insert on public.damage_reports
  for insert with check (fleet_id = public.current_fleet_id());
create policy damage_reports_update on public.damage_reports
  for update using (
    fleet_id = public.current_fleet_id()
    and (reported_by = auth.uid() or public.current_app_role() = 'manager')
  )
  with check (fleet_id = public.current_fleet_id());

-- damage confirmations: read within fleet; the confirming lead inserts.
create policy damage_confirmations_select on public.damage_confirmations
  for select using (fleet_id = public.current_fleet_id());
create policy damage_confirmations_insert on public.damage_confirmations
  for insert with check (fleet_id = public.current_fleet_id() and confirmed_by = auth.uid());

-- van locks: read within fleet; claim a free van; release/extend your own lock.
create policy van_locks_select on public.van_locks
  for select using (fleet_id = public.current_fleet_id());
create policy van_locks_insert on public.van_locks
  for insert with check (fleet_id = public.current_fleet_id() and locked_by = auth.uid());
create policy van_locks_update_own on public.van_locks
  for update using (fleet_id = public.current_fleet_id() and locked_by = auth.uid())
  with check (fleet_id = public.current_fleet_id() and locked_by = auth.uid());
create policy van_locks_delete on public.van_locks
  for delete using (
    fleet_id = public.current_fleet_id()
    and (locked_by = auth.uid() or public.current_app_role() = 'manager')
  );

-- rota: read within fleet; leads manage their own availability; managers manage all.
create policy rota_select on public.rota
  for select using (fleet_id = public.current_fleet_id());
create policy rota_self on public.rota
  for all using (fleet_id = public.current_fleet_id() and lead_id = auth.uid())
  with check (fleet_id = public.current_fleet_id() and lead_id = auth.uid());
create policy rota_manager on public.rota
  for all using (fleet_id = public.current_fleet_id() and public.current_app_role() = 'manager')
  with check (fleet_id = public.current_fleet_id() and public.current_app_role() = 'manager');

-- notifications: recipients read/ack their own; fleet members can create.
create policy notifications_select on public.notifications
  for select using (recipient_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_insert on public.notifications
  for insert with check (fleet_id = public.current_fleet_id());

-- ---------------------------------------------------------------------------
-- Storage: immutable damage photos, scoped by fleet
-- Path convention: fleet/{fleet_id}/van/{van_id}/{inspection_id}/{uuid}.jpg
-- No update/delete policies => objects are immutable once written.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('damage-photos', 'damage-photos', false)
on conflict (id) do nothing;

create policy "damage photos readable by fleet" on storage.objects
  for select using (
    bucket_id = 'damage-photos'
    and split_part(name, '/', 2)::uuid = public.current_fleet_id()
  );

create policy "damage photos insertable by fleet" on storage.objects
  for insert with check (
    bucket_id = 'damage-photos'
    and split_part(name, '/', 2)::uuid = public.current_fleet_id()
  );

-- ---------------------------------------------------------------------------
-- Role grants. RLS filters *rows*; roles still need table-level privileges.
-- Row visibility is governed entirely by the policies above.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast lock + van changes to subscribed clients
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.van_locks;
alter publication supabase_realtime add table public.vans;
