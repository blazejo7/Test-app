# FleetFlow — Reviewed Spec & Roadmap

This is the original spec with a critical review applied: what was cut/deferred,
what was added, and the order things get built. The data-model changes here are
implemented in [`../supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

## Overview

FleetFlow is a mobile app for delivery fleet (Amazon DSP-style) daily vehicle
inspections, damage tracking, and lead rota management, for fleet leads and managers.

**Stack:** React Native (Expo Router) · Supabase (Postgres + Auth + Realtime +
Storage) · TanStack Query. Push notifications (Expo) arrive with the rota phase.

## Roles

- **Lead** — claims vans, performs inspections, logs damage/fluids, marks availability.
- **Manager** — views dashboard, signs off grounded vans, manages rota, views reports.

---

## Review summary

### Deferred (still on the roadmap, just sequenced last)

- **Rota** — a separate domain from the inspection core; built last.
- **Push notifications** — replaced for v1 by an in-app `notifications` table;
  real Expo push lands with the rota phase.
- **15-min lock auto-expiry job** — no cron/edge sweeper. `expires_at` is stored
  and a lock is treated as **expired on read** (`isLockExpired` / SQL predicate).

### Added (gaps in the original spec)

1. **`fleet_id` on every table** — multi-tenancy key so RLS is writeable and a
   second fleet is not a migration. Defaults to one seeded fleet.
2. **Row Level Security on every table** + role grants — leads/managers only see
   and mutate their own fleet's rows. Verified: anonymous reads return nothing.
3. **`profiles` keyed to `auth.users`** — populated by a signup trigger
   (`handle_new_user`); `role` here drives both RLS and navigation.
4. **Storage bucket + policies** — private `damage-photos` bucket, path
   `fleet/{fleet_id}/van/{van_id}/{inspection_id}/{uuid}.jpg`. No update/delete
   policy, so photos are **immutable** once written.
5. **`van_locks.van_id` is the PRIMARY KEY** — the DB, not realtime, guarantees a
   single claimer per van.
6. **`unique (fleet_id, date)` on `sessions`** — one official check per day; the
   "append to next day" rule falls out for free.
7. **`damage_confirmations` table** — "still same / got worse" is recorded per
   inspection (audit trail); `times_confirmed` / `last_confirmed_at` become a
   trigger-maintained cache.
8. **Severity → van status automation** — a `groundable` open report sets the van
   to `grounded`; the rule lives in a trigger (`recompute_van_status`) mirrored by
   `deriveVanStatus` in `src/lib/rules.ts`.
9. **Fluid thresholds** — `evaluateFluidLevels` flags any fluid ≤ 10%.
10. **Inspection immutability** — a trigger blocks updates once `completed_at` is set.
11. **Standard columns** — `created_at` / `updated_at` (trigger-set) everywhere;
    `deleted_at` soft-delete on `vans`.

---

## Data Model (as implemented)

Every table carries `fleet_id`, `created_at`, `updated_at`. RLS is enabled on all.

- **fleets** — id, name.
- **profiles** — id → `auth.users`, fleet_id, name, email, role (`lead|manager`), avatar_initials.
- **vans** — reg, make, model, status (`clear|new_damage|grounded`), added_date, deleted_at. `unique(fleet_id, reg)`.
- **damage_reports** — van_id, zone, description, damage_type, severity, status, photo_urls[], reported_by, reported_at, last_confirmed_at, times_confirmed.
- **damage_confirmations** — damage_report_id, inspection_id, outcome (`same|worse`), note, confirmed_by, confirmed_at.
- **inspections** — van_id, lead_id, session_id, started_at, completed_at, zones_checked (jsonb), fluid_levels (jsonb), result.
- **sessions** — date, started_by, started/completed_at, status, total_vans, vans_done. `unique(fleet_id, date)`.
- **van_locks** — **van_id PK**, locked_by, locked_at, expires_at (default +15 min).
- **rota** — date, lead_id, status (`available|assigned|absent`), confirmed. `unique(lead_id, date)`.
- **notifications** — recipient_id, type (`grounded_signoff|rota_published|session_complete`), payload (jsonb), read_at.

---

## Build order (roadmap)

1. **Auth & roles** — ✅ scaffold: login + role-based navigation.
2. **Van registry** — ✅ scaffold: live list with lock state.
3. **Inspection flow** — ✅ built. Claim (`claim_van` RPC: session + atomic lock)
   → confirm known damage (`damage_confirmations`) → zone walkaround → log new
   damage + photos → fluids (thresholds) → review → submit (`submit_inspection`
   RPC: writes damage/confirmations, sets result + `completed_at`, releases lock,
   all in one transaction).
4. **Real-time locking** — ✅ built. Van list subscribes to `van_locks` realtime;
   shows held-by-you vs claimed-by-another with a live minutes-left countdown;
   explicit Release (RLS-guarded to owner/manager) and Resume.
5. **Damage log** — ✅ built. Filterable list (all/new/known/resolved), per-report
   detail with photo gallery (signed URLs) and confirmation history.
6. **Manager dashboard** — live session progress, lead activity, grounded sign-off
   queue (writes `notifications`).
7. **Daily session + summary report** — auto-generated end-of-session summary
   (clear/damage/grounded/fluids), delivered in-app for v1.
8. **Rota** — availability (next 2 days) → assign → publish → confirm receipt;
   introduce Expo push notifications here.

---

## Design notes (unchanged from the original spec)

- Known damage is shown and confirmed ("still same" / "got worse") before a zone
  is marked complete — prevents re-flagging old damage as new.
- Photos auto-tagged with van reg, zone, timestamp, user — immutable after submission.
- Submitted inspections are locked / read-only (enforced by trigger).
- Grounded vans block "clear to go out" until a manager approves release.
- Session = one official fleet check per day; can't be restarted, only appended to next day.

## Out of scope (v1)

- Offline support (online-only for now; optimistic UI later).
- Full driver rota (leads only).
- Payments / subscriptions.
- Multi-depot (single fleet — but `fleet_id` is already in the schema).
