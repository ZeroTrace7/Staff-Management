# Staff Management PWA — Project Status

> Last updated: 28 May 2026

---

## WHAT'S WORKING ✅

### Core Attendance System (100% functional)
- **Owner signup/signin** — Supabase Auth with email confirmation + auto-bootstrap
- **Owner dashboard** — Live stats, staff roster, search, realtime updates
- **Geofence config** — Set lat/lng/radius from dashboard or settings, "Use Current Location" GPS auto-fill
- **Add Employee** — Owner creates employee accounts via serverless API (`/api/create-employee`)
- **Employee signin** — Login with credentials given by owner
- **Selfie punch** — Front camera capture, JPEG compression, upload to Supabase Storage
- **GPS verification** — High-accuracy GPS with anti-spoofing (teleport, jitter, accuracy checks)
- **Geofence enforcement** — Client-side Haversine check + server-side RLS policy. Blocks punch if outside zone
- **Geofence rejection modal** — Shows distance from office when blocked
- **Punch state recovery** — Checks today's logs on reload, restores IN/OUT button correctly
- **Map view** — Leaflet + OpenStreetMap, employee markers, geofence circle overlay
- **Realtime** — Supabase channels on 3 tables for live dashboard updates
- **Signout** — Both roles, clears session, redirects to index
- **Company data caching** — Cached in localStorage for offline fallback
- **Offline sync improvements** — Permanent failures (geofence/RLS) discarded, transient errors retried

### Infrastructure (Working)
- **PWA** — Service worker (cache v12), manifest, installable on mobile
- **RLS** — 12 policies + 3 helper functions protecting all 4 tables + storage
- **Serverless API** — Vercel function for employee creation with service-role key
- **Deployment config** — `.env.example`, `vercel.json`, updated README

---

## WHAT'S NOT WORKING ❌

### 1. Offline Punch (Partially broken)
- **Problem:** If phone is fully offline, selfie upload fails first → queue is never reached
- **What works:** If insert to DB fails (network drop mid-request), record gets queued
- **What doesn't:** GPS + selfie both need internet. True offline needs IndexedDB for blob storage
- **Files:** `attendance.js:87`, `offline-sync.js` (localStorage only, no blob support)

### 2. Selfies Are Public
- **Problem:** `selfies` bucket is `public = true`. Anyone with the URL can view any selfie
- **Fix needed:** Make bucket private, use signed URLs for dashboard viewing
- **Files:** `schema.sql:93`, `camera.js:101`

### 3. Settings Toggles Don't Save
- **Problem:** All toggles (Leave System, Face Attendance, Expense, Salary, etc.) only toggle CSS class — nothing saved to database
- **What it looks like:** Toggle turns green/grey but resets on page reload
- **Files:** `owner.html:310-370`, `employee.html:440-490`
- **Exception:** Geo Fencing now shows "Always Active" badge (not a toggle) ✅

### 4. Placeholder Screens (UI exists, no backend)
| Screen | Location | What's missing |
|--------|----------|----------------|
| Leave Requests | `employee.html:314-387` | Submit just closes modal, no DB table |
| "You" Tab Analytics | `employee.html:257-312` | Hardcoded "May '26" data, not real logs |
| Permissions Screen | `employee.html:54-135` | Exists but no code path shows it |
| Reports | `owner.html` settings | Chevron `›` but no target view |
| Personal Details | Both settings | Chevron `›` but no target view |
| Company Details | Owner settings | Chevron `›` but no target view |
| Holidays | Both settings | Chevron `›` but no target view |
| Pay Slips | Employee settings | Chevron `›` but no target view |
| View Logs | Employee settings | Chevron `›` but no target view |

### 5. Dead Navigation Buttons
- **Work tab** — Both owner and employee bottom nav, no onclick handler
- **Leaves tab** — Owner bottom nav, no onclick handler
- **"Need Help?" button** — All 3 pages, no handler

### 6. Owner Bootstrap Not Transactional
- Inserts company first, then user profile. If user insert fails → orphan company remains
- **Files:** `auth.js:150-166`

### 7. No Automated Tests
- No test files, no test scripts, no test dependencies

---

## CHANGES MADE THIS SESSION

### Phase 1 Fixes (committed)
| Change | File |
|--------|------|
| Service worker cache bumped v11 → v12 | `service-worker.js` |
| Removed dead back arrow on landing page | `index.html` |
| Geo Fencing toggle → "Always Active" badge | `owner.html`, `employee.html` |
| Geofence enforcement: client check before selfie upload | `attendance.js` |
| Geofence rejection modal added | `employee.html` |
| Modal handler + error detection | `app.js` |
| Fresh company data fetch on every punch | `attendance.js` |
| Server-side RLS error → geofence message | `attendance.js` |

### Plan Item 1: Deployment Wiring (uncommitted)
| Change | File |
|--------|------|
| Created env template with all 3 required vars | `.env.example` (new) |
| Created Vercel routing config | `vercel.json` (new) |
| Rewrote deployment docs with env vars table + Vercel CLI instructions | `README.md` |
| Added `.vercel/` to gitignore | `.gitignore` |

### Plan Item 1.3: Offline Sync Improvements (uncommitted)
| Change | File |
|--------|------|
| Company data cached in localStorage for offline fallback | `attendance.js` |
| Smart sync: permanent failures discarded, transient retried | `offline-sync.js` |
| User gets "rejected — outside office zone" banner for geofence fails | `offline-sync.js` |

---

## WHAT'S LEFT TO DO

### Priority 1 — Should fix
1. **Private selfie storage** — Make bucket private + signed URLs
2. **Wire "You" tab** to real attendance data
3. **Wire CSV export** button (function exists in `utils.js`, never called)
4. **Add employee attendance log viewer**

### Priority 2 — Nice to have
5. **Leave request system** — DB table + insert + admin review
6. **Personal/Company details** views
7. **Reports page** for owner
8. **Profile avatar upload**

### Priority 3 — Production hardening
9. **Full IndexedDB offline punch** with blob storage
10. **Transactional owner bootstrap** (RPC function)
11. **Automated tests** (unit + E2E)
12. **PWA icons** — Currently both sizes are the same file

---

## File Map

```
Staff Management/
├── index.html              # Role selection (landing page)
├── owner.html              # Owner: signup, dashboard, map, settings
├── employee.html           # Employee: signin, punch, camera, settings
├── manifest.json           # PWA config
├── service-worker.js       # Offline cache (v12)
├── vercel.json             # API routing for Vercel
├── .env.example            # Required environment variables
├── css/style.css           # All styles
├── js/
│   ├── supabase-client.js  # Supabase init
│   ├── auth.js             # Auth + bootstrap + employee provisioning
│   ├── app.js              # Routing, UI, punch flow, modals
│   ├── attendance.js       # Punch logic, geofence check, record building
│   ├── camera.js           # Camera capture + selfie upload
│   ├── location.js         # GPS + Haversine + anti-spoofing
│   ├── admin-dashboard.js  # Owner stats, roster, map, realtime
│   ├── offline-sync.js     # localStorage queue + auto-sync
│   └── utils.js            # Date formatting, CSV export, helpers
├── api/
│   └── create-employee.js  # Serverless: employee account creation
└── supabase/
    └── schema.sql          # Tables, RLS, functions, storage
```
