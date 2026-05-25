# 📋 Staff Management — GPS + Selfie Attendance PWA

> A zero-cost, installable Progressive Web App for small businesses to track employee attendance with selfie verification, GPS geofencing, and a real-time admin dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![Cost](https://img.shields.io/badge/Monthly%20Cost-₹0-brightgreen)](#cost-breakdown)
[![Platform](https://img.shields.io/badge/Platform-Android%20(primary)%20%7C%20iOS%20(basic)-orange)](#compatibility)

---

## 🎯 What Is This?

Staff Management is a **Progressive Web App** that lets small teams (5–50 employees) mark attendance from their phones — verified with a **live selfie** and **GPS location**. Admins get a real-time dashboard showing who's present, where they clocked in from, and whether they were inside the office geofence.

**No Play Store. No APK. No monthly fees.** Share a URL → employees install it like an app.

---

## ✨ Features (v1)

| Feature | Description |
|---|---|
| 📸 **Selfie Clock-In** | Front camera capture at clock-in, stored in Supabase Storage |
| 📍 **GPS Mandatory** | Clock-in is **BLOCKED** if GPS/location is turned off — no exceptions |
| 📡 **Last Known Location** | Every app open logs employee location; admin sees "last seen at [place] at [time]" |
| 🛡️ **Anti-Spoofing** | Detects fake GPS apps via jitter analysis, teleportation detection, consistency checks |
| 🔐 **Email Auth** | Email + password login for both employees and admins (₹0 cost) |
| 📊 **Admin Dashboard** | Today's stats — Present / Absent / Late / Not Marked |
| 🗺️ **Map View** | Leaflet.js pins showing where each employee clocked in + last known location |
| 📱 **Installable PWA** | Add to Home Screen on Android (auto-prompt), basic iOS support |
| 📴 **Offline Support** | Works without internet, syncs when connectivity returns |
| 📅 **Attendance History** | Employee calendar view of personal attendance records |
| 📤 **CSV Export** | Admin can export monthly reports |

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Vanilla HTML + CSS + JS | No build tools, works everywhere |
| **PWA** | Web App Manifest + Service Worker | Installs like a native Android app |
| **Backend/DB** | Supabase (PostgreSQL) | Free Auth + DB + Storage + Realtime |
| **Camera** | Browser `getUserMedia` API | Native selfie capture, zero libraries |
| **GPS** | Browser Geolocation API | Built-in, free, all phones |
| **Maps** | Leaflet.js + OpenStreetMap | 100% free, no API key |
| **File Storage** | Supabase Storage | Selfie photos (1 GB free) |
| **Auth** | Supabase Auth (Email/Password) | Free, secure, JWT-based |
| **Hosting** | Vercel | Free forever at this scale |
| **Live Updates** | Supabase Realtime | Dashboard auto-refreshes |

---

## 💰 Cost Breakdown

| Service | Free Tier Limit | Our Usage | Cost |
|---|---|---|---|
| Supabase DB | 500 MB | ~10 MB/year for 10 staff | ₹0 |
| Supabase Auth | 50,000 MAU | 10–50 users | ₹0 |
| Supabase Storage | 1 GB | ~500 selfies/month ≈ 150 MB/year | ₹0 |
| Supabase Realtime | 200 concurrent | 1–10 concurrent | ₹0 |
| Vercel Hosting | 100 GB bandwidth | ~1 GB/month | ₹0 |
| Leaflet/OSM | Low-traffic use | Admin-only map view | ₹0 |
| **TOTAL** | — | — | **₹0/month** |

> **Note:** Using email/password auth keeps this genuinely ₹0. Phone OTP (v2+) would add ~₹15-66/month via an Indian SMS provider.

---

## 📐 Database Schema

### `companies`
```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT        NOT NULL
admin_ids       UUID[]
geofence_lat    FLOAT       NOT NULL
geofence_lng    FLOAT       NOT NULL
geofence_radius INT         NOT NULL DEFAULT 100  -- meters
work_start_time TIME        DEFAULT '09:00'       -- for late marking
created_at      TIMESTAMPTZ DEFAULT now()
```

### `users`
```sql
id              UUID        PRIMARY KEY  -- matches Supabase Auth UID
company_id      UUID        REFERENCES companies(id)
name            TEXT        NOT NULL
phone           TEXT
email           TEXT        NOT NULL UNIQUE
role            TEXT        CHECK (role IN ('admin', 'employee'))
avatar_url      TEXT
is_active       BOOLEAN     DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()

-- Indexes
INDEX idx_users_company_id ON users(company_id)
INDEX idx_users_email ON users(email)
```

### `attendance_logs`
```sql
id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id             UUID        REFERENCES users(id)
company_id          UUID        REFERENCES companies(id)
type                TEXT        CHECK (type IN ('clock_in', 'clock_out'))
selfie_url          TEXT
lat                 FLOAT
lng                 FLOAT
accuracy_meters     FLOAT       -- GPS accuracy reading
timestamp           TIMESTAMPTZ NOT NULL
is_geofence_valid   BOOLEAN
distance_from_office FLOAT      -- meters, for admin review
notes               TEXT
synced_offline      BOOLEAN     DEFAULT false
spoof_flags         JSONB       -- {jitter: bool, teleport: bool, consistency: bool}
created_at          TIMESTAMPTZ DEFAULT now()

-- Indexes
INDEX idx_attendance_user_id ON attendance_logs(user_id)
INDEX idx_attendance_company_id ON attendance_logs(company_id)
INDEX idx_attendance_timestamp ON attendance_logs(timestamp)
```

### `last_known_locations` (v1 — Passive Tracking)
```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID        REFERENCES users(id) UNIQUE  -- one row per employee
company_id      UUID        REFERENCES companies(id)
lat             FLOAT       NOT NULL
lng             FLOAT       NOT NULL
accuracy_meters FLOAT
updated_at      TIMESTAMPTZ DEFAULT now()  -- "last seen at" timestamp

-- Indexes
INDEX idx_last_location_user ON last_known_locations(user_id)
INDEX idx_last_location_company ON last_known_locations(company_id)
```

### `location_pings` (v2 — Live Tracking History)
```sql
id              UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID        REFERENCES users(id)
company_id      UUID        REFERENCES companies(id)
lat             FLOAT
lng             FLOAT
accuracy_meters FLOAT
recorded_at     TIMESTAMPTZ DEFAULT now()

-- Indexes
INDEX idx_pings_user_id ON location_pings(user_id)
INDEX idx_pings_recorded_at ON location_pings(recorded_at)
```

### Row Level Security (RLS)

```sql
-- Employees can only read/write their own records
-- Admins get full read access to all records in their company
-- auth.uid() wrapped in SELECT for RLS performance optimization

-- Example policy (attendance_logs):
CREATE POLICY "employees_own_records" ON attendance_logs
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "admins_company_access" ON attendance_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
```

---

## 📍 Location Tracking Strategy

Since knowing where employees are is critical, we use a 3-layer system:

### Layer 1 — GPS Mandatory for Clock-In (v1)

| Technique | What it does |
|---|---|
| **`enableHighAccuracy: true`** | Forces GPS hardware (not cell tower fallback) |
| **Multi-sample averaging** | Takes 3 GPS readings, averages lat/lng, uses best accuracy |
| **Accuracy threshold** | Rejects any reading with accuracy > 150m (too unreliable) |
| **GPS = Required** | If location services are OFF → clock-in is **BLOCKED** with a clear prompt |
| **Haversine formula** | Calculates exact distance in meters between employee and office |
| **Store raw accuracy** | Admin can see exactly how accurate each reading was |
| **Distance logging** | Every clock-in stores `distance_from_office` in meters |

### Layer 2 — Last Known Location Logging (v1)

| Technique | What it does |
|---|---|
| **App-open location ping** | Every time employee opens the app, location is silently captured |
| **`last_known_location` table** | Stores latest lat/lng + timestamp per employee |
| **Admin map view** | Owner can see "Last seen at [location] at [time]" for every employee |
| **Battery-friendly** | Only captures on app open/foreground, no background drain |
| **Graceful fallback** | If GPS denied at app-open, skips silently (only mandatory at clock-in) |

### Layer 3 — Anti-Spoofing Detection (v1)

| Technique | What it does |
|---|---|
| **GPS jitter analysis** | Real GPS has noise (±5-15m); faked GPS returns identical coordinates — detectable |
| **Teleportation detection** | Flags if employee "moves" impossibly fast between two readings (e.g., 50km in 2 min) |
| **Consistency scoring** | If employee clocks in from same exact lat/lng every day (to 6 decimal places) → suspicious |
| **Accuracy anomaly** | Mock GPS apps often report `accuracy: 0` or `accuracy: 1` — unnaturally perfect |
| **Admin flag** | Suspicious readings get a ⚠️ badge in admin dashboard for manual review |

### v2 — Strict Enforcement (Future)

| Feature | What it adds |
|---|---|
| **Geofence enforcement** | Clock-in rejected if outside office radius (not just flagged) |
| **Selfie + GPS combo** | Both selfie AND location required together as tamper-proof pair |
| **Geofence radius config** | Admin sets office radius (50-100m) from settings |

---

## 📱 Platform Compatibility

| Feature | Android Chrome | iOS Safari | Desktop Chrome |
|---|---|---|---|
| **PWA Install** | ✅ Auto-prompt | ⚠️ Manual (Share → Add) | ✅ Manual |
| **Camera** | ✅ Reliable | ⚠️ Works, may re-ask permissions | ✅ |
| **GPS** | ✅ Full support | ⚠️ Occasional standalone bugs | ✅ |
| **Offline Cache** | ✅ Persistent | ⚠️ 7-day eviction risk | ✅ |
| **Background Sync** | ✅ Full | ❌ Not supported | ✅ |
| **Overall** | 🟢 Primary target | 🟡 Basic support | 🟢 Admin use |

> **Strategy:** Android Chrome is the primary target. iOS gets basic functionality with manual fallbacks (manual sync button, install guide). Full iOS optimization planned for later phases.

---

## 📁 Project Structure

```
Staff Management/
├── index.html                  # Entry point + login screen
├── employee.html               # Employee PWA screen (clock-in, history, profile)
├── admin.html                  # Admin dashboard
├── manifest.json               # PWA manifest (app name, icons, theme)
├── service-worker.js           # Offline caching + background sync
├── css/
│   ├── main.css                # Global design system + CSS variables
│   ├── auth.css                # Login page styles
│   ├── employee.css            # Employee screen styles
│   └── admin.css               # Admin dashboard styles
├── js/
│   ├── supabase-client.js      # Supabase client initialization
│   ├── app.js                  # App init, routing, auth state
│   ├── auth.js                 # Email/password login, session management
│   ├── camera.js               # getUserMedia, selfie capture, compression, upload
│   ├── location.js             # Multi-sample GPS, Haversine geofence, anti-spoof
│   ├── attendance.js           # Clock in/out logic, attendance history
│   ├── admin-dashboard.js      # Dashboard stats, staff list, map view
│   ├── offline-sync.js         # localStorage queue + Background Sync + fallback
│   └── utils.js                # Date formatting, helpers
├── assets/
│   ├── icons/                  # PWA icons (192x192, 512x512)
│   └── images/                 # UI assets
├── supabase/
│   └── schema.sql              # Full database schema + RLS policies
├── .github/
│   └── workflows/
│       └── keepalive.yml       # Cron job to prevent Supabase pausing
└── README.md
```

---

## 🚀 Setup & Deployment

### Prerequisites
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account
- A [GitHub](https://github.com) account

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Enable Row Level Security on all tables
4. Create a Storage bucket named `selfies` (set to public)
5. Enable Email Auth in Authentication settings
6. Copy your **Project URL** and **anon key**

### 2. Configure the App
Open `js/supabase-client.js` and replace the placeholder values:
```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Deploy to Vercel
1. Push the project to a GitHub repository
2. Connect the repo to [Vercel](https://vercel.com)
3. Deploy — Vercel gives you a URL like `yourapp.vercel.app`
4. Set up the keepalive GitHub Action (see `.github/workflows/keepalive.yml`)

### 4. Share with Employees
1. Send the Vercel URL to employees via WhatsApp
2. **Android:** Open in Chrome → "Add to Home Screen" prompt appears → Install
3. **iOS:** Open in Safari → Share button → "Add to Home Screen"
4. App appears on home screen with your icon

---

## 📱 How It Works

### Employee Flow
```
Open app → Login (email + password)
         → Tap "Clock In"
         → Camera opens → take selfie
         → GPS captured simultaneously (3 samples averaged)
         → Geofence checked (distance from office calculated)
         → Selfie + location + timestamp + accuracy saved
         → Confirmation shown ✅ (or ⚠️ if outside geofence)
```

### Admin Flow
```
Open app → Login (email + password)
         → See today's dashboard (Present / Absent / Late / Not Marked)
         → Tap any employee → view selfie + GPS pin + time + accuracy
         → Switch to Map View → see all clock-in locations as pins
         → Pick a date → view historical data
         → Export → download CSV report
```

### Offline Flow
```
Employee clocks in with no internet
→ Data saved to localStorage queue
→ App shows "Saved offline, will sync when online"
→ Internet returns:
  → Android: Background Sync triggers automatically
  → iOS: Manual "Sync Now" button or auto-sync on next app open
→ Data POSTed to Supabase with original timestamp
→ Admin sees "synced offline" badge on that record
```

---

## 🔒 Security

| Layer | Implementation |
|---|---|
| **Authentication** | Supabase Auth — JWT tokens, email/password, session refresh |
| **Authorization** | Row Level Security — database-level, per-row access control |
| **Transport** | HTTPS enforced by Vercel (also required for Camera + GPS APIs) |
| **API Keys** | `anon` key is safe for client-side (RLS handles authorization) |
| **Camera** | Browser prompts user consent before access |
| **Location** | Browser prompts user consent before access |
| **Anti-spoofing** | GPS jitter analysis + impossible speed detection + selfie verification |
| **Storage** | Bucket policies: max 2MB per file, image types only |
| **Keepalive** | GitHub Actions cron prevents Supabase project pausing |

---

## 🗺️ Roadmap

| Version | Feature | Status |
|---|---|---|
| **v1** | Core attendance (selfie + GPS) | 🔨 Building |
| **v1** | GPS mandatory for clock-in (blocked if OFF) | 🔨 Building |
| **v1** | Last known location logging (app-open pings) | 🔨 Building |
| **v1** | Anti-spoofing (jitter + teleport + consistency) | 🔨 Building |
| **v1** | Email auth (admin + employee) | 🔨 Building |
| **v1** | Admin dashboard with stats + map | 🔨 Building |
| **v1** | PWA + offline sync (Android primary) | 🔨 Building |
| **v2** | Strict geofence enforcement (reject out-of-zone) | 📋 Planned |
| **v2** | Selfie + GPS combo verification (tamper-proof) | 📋 Planned |
| **v2** | iOS optimization (fallbacks, install guide) | 📋 Planned |
| **v2** | Phone OTP login (via Indian SMS provider) | 📋 Planned |
| **v2** | Leave management system | 📋 Planned |
| **v2** | Live location tracking (location_pings) | 📋 Planned |
| **v2** | Push notifications (attendance reminders) | 📋 Planned |
| **v3** | Multi-branch/location support | 💡 Idea |
| **v3** | Payroll integration | 💡 Idea |
| **v3** | Face recognition verification | 💡 Idea |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/leave-system`)
3. Commit your changes (`git commit -m 'Add leave management'`)
4. Push to the branch (`git push origin feature/leave-system`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) — Backend-as-a-Service
- [Leaflet.js](https://leafletjs.com) — Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org) — Free map tiles

---

<div align="center">
  <strong>Built with ❤️ for small businesses who deserve enterprise-grade tools — for free.</strong>
</div>
