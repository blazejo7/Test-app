-- FleetFlow demo seed. Loaded automatically by `npx supabase db reset`.
--
-- Demo logins (password for all three: password123):
--   manager@fleetflow.test  -> manager
--   lead.sam@fleetflow.test -> lead
--   lead.jo@fleetflow.test  -> lead
--
-- Users are inserted straight into auth.users so the seed is self-contained;
-- the handle_new_user() trigger creates the matching public.profiles rows from
-- the raw_user_meta_data below.

-- Fixed UUIDs so rows can reference each other.
-- Fleet
insert into public.fleets (id, name)
values ('00000000-0000-0000-0000-0000000000f1', 'North Depot Fleet');

-- Auth users (+ identities for email/password login)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated',
    'manager@fleetflow.test', crypt('password123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"name":"Morgan Manager","role":"manager","fleet_id":"00000000-0000-0000-0000-0000000000f1","avatar_initials":"MM"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-00000000a002', 'authenticated', 'authenticated',
    'lead.sam@fleetflow.test', crypt('password123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"name":"Sam Lead","role":"lead","fleet_id":"00000000-0000-0000-0000-0000000000f1","avatar_initials":"SL"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-00000000a003', 'authenticated', 'authenticated',
    'lead.jo@fleetflow.test', crypt('password123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    '{"name":"Jo Lead","role":"lead","fleet_id":"00000000-0000-0000-0000-0000000000f1","avatar_initials":"JL"}',
    now(), now(), '', '', '', ''
  );

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  created_at, updated_at, last_sign_in_at
)
values
  (
    gen_random_uuid(), '00000000-0000-0000-0000-00000000a001',
    '{"sub":"00000000-0000-0000-0000-00000000a001","email":"manager@fleetflow.test"}',
    'email', '00000000-0000-0000-0000-00000000a001', now(), now(), now()
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-00000000a002',
    '{"sub":"00000000-0000-0000-0000-00000000a002","email":"lead.sam@fleetflow.test"}',
    'email', '00000000-0000-0000-0000-00000000a002', now(), now(), now()
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-00000000a003',
    '{"sub":"00000000-0000-0000-0000-00000000a003","email":"lead.jo@fleetflow.test"}',
    'email', '00000000-0000-0000-0000-00000000a003', now(), now(), now()
  );

-- Vans
insert into public.vans (id, fleet_id, reg, make, model, status) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1', 'AB12 CDE', 'Mercedes', 'Sprinter', 'clear'),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f1', 'AB13 FGH', 'Ford', 'Transit', 'new_damage'),
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-0000000000f1', 'AB14 IJK', 'Vauxhall', 'Vivaro', 'grounded'),
  ('00000000-0000-0000-0000-00000000b004', '00000000-0000-0000-0000-0000000000f1', 'AB15 LMN', 'Mercedes', 'Sprinter', 'clear'),
  ('00000000-0000-0000-0000-00000000b005', '00000000-0000-0000-0000-0000000000f1', 'AB16 OPQ', 'Ford', 'Transit Custom', 'clear');

-- Sample known damage. The damage_reports_status_sync trigger will recompute
-- van.status from these, so the explicit statuses above converge to the same
-- result (b002 -> new_damage, b003 -> grounded).
insert into public.damage_reports
  (fleet_id, van_id, zone, description, damage_type, severity, status, reported_by, times_confirmed, last_confirmed_at)
values
  (
    '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000b002',
    'nearside', 'Scrape along sliding door', 'scrape', 'monitor', 'known',
    '00000000-0000-0000-0000-00000000a002', 2, now()
  ),
  (
    '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000b003',
    'front', 'Cracked windscreen — MOT fail', 'crack', 'groundable', 'known',
    '00000000-0000-0000-0000-00000000a003', 1, now()
  );
