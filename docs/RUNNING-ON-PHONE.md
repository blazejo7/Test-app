# Running FleetFlow on your phone

This guide gets the app onto a physical phone using **Expo Go** with a **hosted
Supabase** backend, reachable over an Expo tunnel from any network.

> Why hosted? The app talks to Supabase over the network. A Supabase running on
> `127.0.0.1` (including any cloud dev container) is not reachable from your phone,
> so we point the app at a hosted project instead.

## What works in Expo Go

- ✅ Auth, van registry, inspections, damage log, manager dashboard, sign-off,
  daily summary, rota — the full app.
- ✅ Damage photo capture/upload (camera + library).
- ⚠️ **Push notifications won't fire in Expo Go** — this is an Expo Go limitation,
  not a bug. The app stays fully functional and uses the in-app notifications
  (sign-off queue, rota published, session complete). Real push needs an EAS dev
  build, which is a later step.

## Prerequisites (on your computer)

- Node 20+ and Git
- The **Expo Go** app on your phone (App Store / Google Play)
- A free account at [supabase.com](https://supabase.com)

## 1. Get the code

```bash
git clone https://github.com/blazejo7/test-app.git
cd test-app
git checkout claude/fleetflow-spec-review-4sczwd
npm install
```

## 2. Create a hosted Supabase project

Create a new project at [supabase.com](https://supabase.com/dashboard) and note its
**project ref** (the `xxxxxxxx` in `https://xxxxxxxx.supabase.co`).

## 3. Push the schema + demo data to it

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db reset --linked
```

`db reset --linked` applies all migrations (`0001`–`0005`) **and** runs the seed,
so the demo logins and sample vans exist. It wipes the linked project first and
asks for confirmation — that's expected on a fresh project.

## 4. Point the app at the project

In the Supabase dashboard: **Settings → API**, copy the **Project URL** and the
**anon public** key. Create a `.env` file in the repo root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

(`.env` is gitignored. The anon key is safe in the client — Row Level Security
protects the data.)

## 5. Start Expo and connect your phone

```bash
npx expo start --tunnel
```

Then:

- **iOS** — open the Camera app and point it at the QR code in the terminal.
- **Android** — open Expo Go and tap "Scan QR code".

The phone does **not** need to be on the same Wi-Fi as your computer.

## 6. Log in

| Email | Role | Lands on |
| --- | --- | --- |
| `manager@fleetflow.test` | manager | Manager dashboard |
| `lead.sam@fleetflow.test` | lead | Van registry |
| `lead.jo@fleetflow.test` | lead | Van registry |

Password for all three: `password123`.

**Tip:** to see real-time locking and the live dashboard, log in as a lead on your
phone and as the manager elsewhere — e.g. run `npm run web` on your computer, or
use a second device.

## Native dev build (real push notifications, and no Expo Go SDK limit)

Expo Go only runs the SDK it ships with, and push notifications don't fire inside
Expo Go. A **development build** is a small custom version of the app that embeds
the exact SDK and native modules — it removes the Expo Go SDK constraint **and**
enables real Expo push tokens. It's built in the cloud with EAS (`eas.json` is
already in the repo), so you don't need Xcode/Android Studio.

```bash
npm install -g eas-cli
eas login                 # free Expo account
eas init                  # creates the project + writes extra.eas.projectId into app.json
eas build --profile development --platform ios   # or: --platform android
```

- **Android:** install the resulting `.apk` straight onto your phone — done.
- **iOS:** installing on a physical iPhone requires the device be registered to an
  Apple Developer account (a paid requirement from Apple, not the app). `eas device:create`
  walks you through it. Android is the easier route to try push quickly.

Once installed, the app registers an Expo push token on login (stored in
`push_tokens`), and publishing the rota sends a real push to assigned leads.

## Troubleshooting

- **Red "Missing Supabase config" screen** — `.env` wasn't picked up. Stop Expo and
  restart with a clean cache: `npx expo start -c --tunnel`. `EXPO_PUBLIC_*` vars are
  baked in at bundle time, so any `.env` change needs a restart.
- **Network error on login** — `EXPO_PUBLIC_SUPABASE_URL` is wrong. It must be the
  hosted `https://<ref>.supabase.co` Project URL.
- **Tunnel asks to install `@expo/ngrok`** — accept it.
- **`supabase link` / `db reset` auth issues** — make sure `npx supabase login`
  completed and you used the correct `--project-ref`.
