# FleetFlow

Daily vehicle inspection, damage tracking, and lead rota for delivery fleets
(Amazon DSP-style). React Native (Expo) + Supabase.

This repository is the **scaffold + corrected spec**: a running skeleton (auth,
role-based navigation, live van registry) on top of the full database schema,
RLS, and domain rules. The remaining features are built on this foundation —
see [`docs/SPEC.md`](docs/SPEC.md) for the reviewed spec and roadmap.

## Stack

- **Expo + Expo Router** (file-based navigation), TypeScript (strict)
- **Supabase** — Postgres + Auth + Realtime + Storage, with **Row Level Security on every table**
- **TanStack Query** for caching + realtime subscriptions
- StyleSheet-based theming (`ThemedText` / `ThemedView` + `Colors`/`Spacing`)

## Project layout

```
src/
  app/                 # Expo Router routes
    _layout.tsx        #   providers (QueryClient, Auth) + role-based auth gate
    (auth)/login.tsx   #   email/password sign-in
    (lead)/            #   lead tabs: Vans (live) · Inspect · Damage
    (manager)/         #   manager tabs: Dashboard · Sign-off · Rota
  lib/
    supabase.ts        # typed client (reads EXPO_PUBLIC_* env)
    auth.tsx           # session + profile context; role drives navigation
    vans.ts            # useVans(): vans + locks, realtime-subscribed
    rules.ts           # pure domain rules (mirrored in SQL triggers)
    rules.test.ts      # unit tests for the rules
  types/database.ts    # DB types (regenerate with `npm run gen:types`)
supabase/
  migrations/0001_init.sql  # schema + enums + triggers + RLS + storage + grants
  seed.sql                  # one fleet, manager + 2 leads, 5 vans, sample damage
```

## Getting started

```bash
npm install
cp .env.example .env          # then fill in the values printed below

npx supabase start            # local Postgres + Auth + Storage (needs Docker)
# copy the API URL + anon key it prints into .env

npx expo start                # run the app
```

**Testing on a physical phone?** See
[`docs/RUNNING-ON-PHONE.md`](docs/RUNNING-ON-PHONE.md) — a hosted-Supabase + Expo Go
walkthrough (your phone can't reach a `127.0.0.1` Supabase).

### Demo logins (from `supabase/seed.sql`, password `password123`)

| Email | Role | Lands on |
| --- | --- | --- |
| `manager@fleetflow.test` | manager | Manager dashboard |
| `lead.sam@fleetflow.test` | lead | Van registry |
| `lead.jo@fleetflow.test` | lead | Van registry |

## Scripts

| Command | Description |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests (domain rules) |
| `npm run lint` | ESLint (eslint-config-expo) |
| `npm run db:reset` | Re-apply migration + seed to local Supabase |
| `npm run gen:types` | Regenerate `src/types/database.ts` from the local DB |

## What's built vs. on the roadmap

**Built:** auth + role navigation, live van registry, **real-time locking**
(held/claimed states + live countdown, claim/resume/release), the **full
inspection flow** (claim → known-damage confirm → walkaround → new damage +
photos → fluids → review → submit, backed by atomic `claim_van` /
`submit_inspection` RPCs), the **damage log** (filterable list + report detail
with photo gallery and confirmation history), the **manager dashboard**
(live session progress, recent activity, grounded-van sign-off queue with
notifications), the **daily session summary** (one-tap completion → aggregated
report snapshot + manager notification), and the **rota** (leads mark
availability → manager assigns + publishes with Expo push → leads confirm
receipt), full DB schema with RLS, domain rules + tests.

All 8 features from the spec are built. Design rationale and the corrected data
model are in [`docs/SPEC.md`](docs/SPEC.md).

> Two pieces need a physical device and can't be exercised headlessly: damage
> photo capture/upload and Expo push delivery. Both are wired up; their
> server-side halves (storage bucket + RLS, push-token storage + send) are
> verified. In-app notifications are the authoritative channel for v1.
