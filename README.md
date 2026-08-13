# Sahadhyāna · सहध्यान

> Sit together, wherever you are.

Sahadhyāna is a shared-meditation sanctuary: one person creates a room, shares a link, and everyone in it hears the same meditation at the same moment — synchronized across phones, cities and time zones. No accounts, no feeds, no likes. Open → breathe → sit → leave peacefully.

## What it is

- **Meditation rooms** — create a room, get a 6-character code and a shareable link. Friends join by link or code. No sign-up: a gentle display name lives on each device.
- **Synchronized audio** — a server-authoritative session row (track, play/pause, position, server timestamp) keeps every listener within a breath of each other. Latecomers and reconnects snap to the live position; small drift is corrected by nudging playback rate, not by audible seeks.
- **Host controls** — the room creator starts, pauses, resumes, seeks and changes tracks. If the host leaves, the room peacefully passes hosting to another meditator.
- **Track providers** — direct audio links (mp3/m4a/ogg/aac…), YouTube (via the official IFrame Player embed — never downloaded or extracted), and OshoWorld discourse pages where they publicly expose audio. A provider abstraction keeps sources modular.
- **Library, playlists, Discourse Series** — save tracks, build flexible playlists, and walk sequential journeys (a *Discourse Series* remembers where you stopped: "Continue from Track 13").
- **Practice** — history, streaks, total time, people you've sat with, a gentle calendar heatmap. Reflection, never competition.
- **Reminders** — peaceful local notifications ("Your space is waiting."), only where the browser allows them.
- **PWA** — installable, offline app shell, service-worker caching. (Realtime rooms need a connection — the app says so honestly.)

## Technology

| Layer | Choice |
| --- | --- |
| UI | React 18, TypeScript, Tailwind CSS, framer-motion |
| Routing / state | react-router-dom (hash), zustand |
| Backend | Supabase — Postgres, Realtime (presence + postgres_changes), RLS |
| Audio | native `<audio>` + official YouTube IFrame Player API |
| PWA | vite-plugin-pwa (Workbox) |
| Build | Vite 6 |

## Local development

```bash
npm install
npm run generate:icons    # builds PWA PNG icons from the vector lotus (needs sharp)
npm run generate:sounds   # builds the UI sounds as MP3s (needs ffmpeg on PATH)
cp .env.example .env      # fill in your Supabase values
npm run dev
```

The generated PNG icons and MP3 sounds are gitignored build artifacts — the two
`generate:*` scripts recreate them losslessly from `public/icons/icon.svg` and a
synthesizer definition, so the repository stays pure, reviewable source.

## Environment variables

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → publishable (or legacy anon) key |

Only publishable keys are used in the frontend. Never expose a service-role key.

## Supabase setup

The V1 schema is idempotent and lives in `supabase/migrations/0001_v1_schema.sql`. Apply it to a project with the SQL editor or the Supabase MCP `apply_migration` tool. It creates:

- `tracks`, `playlists`, `playlist_tracks` — personal library
- `series`, `series_tracks`, `series_progress` — Discourse Series
- `rooms`, `room_participants`, `sessions` — the shared, realtime heart (one live session row per room)
- `meditation_records` — practice history

`rooms`, `room_participants` and `sessions` are added to the `supabase_realtime` publication. V1 policies are deliberately permissive (friends & family, room-code-as-capability); owner columns are anonymous client UUIDs, ready to be adopted by `auth.users` in V2.

## How synchronization works

1. The host's client is the timing authority. Presence broadcasts carry local clocks; peers estimate the host offset from arrival times and keep a rolling median.
2. Every playback change writes one row: `{ state, position_sec, updated_at_server }`.
3. Each client computes the expected position as `position_sec + (estimatedHostNow − updated_at_server)` and re-aligns: a soft playback-rate nudge under ~2 s of drift, a single seek beyond it.
4. Late join and reconnect read the same row — the database is the shared metronome, not a flurry of messages.

## PWA

`vite-plugin-pwa` generates the service worker at build time (app shell precached, Supabase traffic is `NetworkOnly`, media is `NetworkFirst`). Install from the browser's "Add to Home Screen" or the Settings page prompt where supported.

## Deployment (Vercel)

1. Import the repository in Vercel.
2. Add the two environment variables above.
3. Build command `npm run build`, output `dist`. SPA + hash routing needs no rewrites; the PWA assets resolve from `dist`.

## Known limitations

- **YouTube sync is best-effort** by design: the official player API quantizes playback rates and applies its own buffering, so participants may sit a second or two apart. The drift loop keeps everyone converging; the app discloses this rather than circumventing it.
- **Browser autoplay rules** require one tap before any sound; the app unlocks audio on the first gesture.
- **Reminders** fire while the app is installed/running or was recently open (no push server in V1).
- **OshoWorld** playback works only where the page publicly exposes a CDN audio file; otherwise the app explains and suggests a direct MP3 link.
- V1 has no accounts: identity is a device-local UUID, and history is keyed to it.

## Project shape

```
src/
  app/            router, shell, nav
  components/     ui primitives + the illustration language (SVG zen motifs)
  features/       identity, home, rooms, library, practice, pwa
  lib/
    providers/    track source adapters (direct / youtube / oshoworld)
    sync/         clock sync, drift evaluation, playback controllers, room orchestrator
    supabase/     client + row↔domain mappers
    sounds/       gentle synthesized UI sounds
```

## Philosophy

Sahadhyāna is not about maximizing screen time. Every decision — the fading controls, the silent participant pebbles, the single lotus at completion — points the same way: *stop looking at the screen, together.*
