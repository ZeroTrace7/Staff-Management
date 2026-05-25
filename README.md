# Staff Management

Android-first attendance PWA for small teams. The v1 hard path is:

`Owner signup -> company bootstrap -> geofence setup -> admin-created employees -> employee selfie + GPS punch -> owner live review`

## Current Status

Implemented now:

- Owner account bootstrap with company creation
- Company geofence setup and editable work start time
- Admin-created employee accounts from the owner dashboard
- Employee sign-in with role-safe routing
- Mandatory selfie capture for punch in/out
- Mandatory GPS capture with geofence validation
- Attendance writes to Supabase with `is_geofence_valid` and `distance_from_office`
- Last known location updates
- Owner dashboard stats, staff roster, map, and realtime refresh
- Offline attendance queue with retry on reconnect

Still placeholder UI only:

- Leave management
- Payroll and salary settings
- Expense system
- Payslips
- Work tab/project tracking
- Holiday management

## Stack

- Vanilla HTML/CSS/JS
- Supabase Auth + Postgres + Storage + Realtime
- Browser Geolocation API
- Browser Camera API (`getUserMedia`)
- Leaflet + OpenStreetMap
- Service worker for app shell caching

## Project Structure

```text
Staff Management/
├── index.html
├── owner.html
├── employee.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── supabase-client.js
│   ├── auth.js
│   ├── app.js
│   ├── attendance.js
│   ├── admin-dashboard.js
│   ├── camera.js
│   ├── location.js
│   ├── offline-sync.js
│   └── utils.js
└── supabase/
    └── schema.sql
```

## Data Model

Active tables for v1:

- `companies`
- `users`
- `attendance_logs`
- `last_known_locations`

`location_pings` is not part of the current runtime path.

## Auth Model

- Owners sign up from `owner.html`
- Employees do not self-register
- Owners create employee credentials from the owner dashboard
- Employees only sign in from `employee.html`
- If a signed-in user lands on the wrong portal, the app redirects to the correct one

## Attendance Model

Employee punch flow:

1. Confirm punch action
2. Camera opens
3. Employee captures a fresh selfie
4. App reads GPS
5. App uploads selfie to Supabase Storage
6. App computes geofence distance
7. App inserts the attendance log

Each attendance record stores:

- `type`
- `selfie_url`
- `lat` / `lng`
- `accuracy_meters`
- `timestamp`
- `is_geofence_valid`
- `distance_from_office`
- `spoof_flags`
- `synced_offline`

## Owner Dashboard

The owner dashboard now reads live Supabase data for:

- total active heads
- employees
- admins
- present
- not marked / absent
- late arrivals
- outside-zone punches
- clocked-out staff
- last known locations

The map view uses Leaflet and renders:

- employee last known positions
- company geofence circle

Realtime refresh is driven by Supabase channel subscriptions on:

- `attendance_logs`
- `last_known_locations`
- `users`

## Offline Behavior

What works:

- attendance records queue locally when the network is down
- queued records sync when the browser comes back online

What does not exist in v1:

- true background sync from the service worker
- IndexedDB-backed queueing

The queue currently lives in `localStorage`, so sync is client-driven on reconnect.

## Setup

### 1. Supabase

1. Create a Supabase project
2. Run `supabase/schema.sql`
3. Create a public storage bucket named `selfies`
4. Enable Email/Password auth
5. Copy the project URL and anon key

### 2. Configure the client

Update [js/supabase-client.js](./js/supabase-client.js) with your real Supabase URL and anon key before deployment if you are pointing at a different project.

### 3. Auth recommendation

For the smoothest v1 bootstrap flow, disable mandatory email confirmation in Supabase Auth.

If email confirmation stays enabled, owner bootstrap completes after sign-in only when the pending signup is resumed in the same browser context that started it.

### 4. Run locally

Any static file server is fine. Example:

```powershell
python -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`

## Validation Checklist

- Owner can sign up and land on the dashboard
- Owner can set a geofence
- Owner can create an employee account
- Employee can sign in
- Employee must capture a selfie before punching
- Employee punch stores GPS and geofence distance
- Reload after punch-in restores the punch-out state
- Owner dashboard updates after employee attendance changes

## Known Constraints

- Employee auth creation uses the public client with an isolated non-persistent Supabase session
- Offline queue is `localStorage`-based, not IndexedDB-based
- Leave/payroll/settings screens are mostly placeholders beyond attendance configuration
