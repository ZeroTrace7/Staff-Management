# 📱 Staff Management PWA

<div align="center">
  <strong>Free, GPS + Selfie verified attendance app for small teams.</strong>
  <br/>
  <em>No app store. No subscription. No server costs.</em>
  <br/><br/>
  ✅ 14 production-ready features · 📴 Works offline · 🛡️ Anti-spoofing · 🗺️ Live map · ₹0/month
</div>

---

## 🌟 What It Does

A complete attendance system that runs in the browser. The owner sets up a workspace, adds employees, and defines an office boundary. Employees punch in by taking a selfie and sharing their GPS location. If they're outside the office zone, the app blocks the punch. Everything works offline and syncs automatically.

---

## ✅ 14 Working Features

### 🏢 For Owners

| Feature | What It Does |
|---|---|
| 📊 **Live Dashboard** | Real-time stats — present, absent, late, outside zone — updates automatically |
| 🗺️ **Map View** | See every employee's last punch location on an interactive map with geofence circle |
| 📍 **Geofence Setup** | Set office coordinates + radius — "Use Current Location" makes it instant |
| 👤 **Employee Provisioning** | Create employee accounts securely from the dashboard — no signup needed |
| ⏰ **Late Detection** | Automatically flags anyone who punches in after the set work start time |
| ⚡ **Real-Time Updates** | Dashboard refreshes itself when employees punch — no manual refresh |
| 🏢 **One-Step Bootstrap** | Sign up → create company → set geofence → add employees — all in 2 minutes |

### 👷 For Employees

| Feature | What It Does |
|---|---|
| 🤳 **Selfie Verification** | Mandatory front-camera selfie at every punch — proves the right person is there |
| 📍 **GPS Attendance** | High-accuracy location captured with every punch — stored with the record |
| 🛡️ **Geofence Enforcement** | Can't mark attendance outside the office zone — shows exact distance |
| 🕵️ **Anti-Spoofing** | Catches fake GPS apps — teleport detection, jitter analysis, accuracy checks |
| 📴 **Offline Mode** | Punch without internet — records queue locally and sync when back online |

### 🔧 Platform

| Feature | What It Does |
|---|---|
| 🔒 **Role-Based Security** | 13 database policies — employees see only their data, admins see only their company |
| 📲 **PWA** | Install from browser — works like a native app, updates instantly, no app store |

---

## 🚀 Quick Start

### 1. Supabase Setup

1. Create a [Supabase](https://supabase.com) project (free tier)
2. Run `supabase/schema.sql` in the SQL Editor — creates all tables + security policies
3. Create a **public** storage bucket named `selfies`
4. Enable **Email/Password** auth in Authentication → Settings

### 2. Configure the App

Update `js/supabase-client.js` with your project credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Run Locally

```bash
npm i -g vercel          # One-time: install Vercel CLI
vercel env pull .env     # Pull env vars from Vercel project
vercel dev               # Start local server with API support
```

> 💡 Basic features work with any static server (`npx serve .`), but employee creation needs the Vercel runtime for `api/create-employee.js`.

### 4. Deploy to Production

```bash
vercel --prod
```

Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel → Settings → Environment Variables.

---

## 🏗️ Project Structure

```
Staff Management/
├── index.html              Landing page — role selection
├── owner.html              Admin dashboard, map, settings
├── employee.html           Punch portal, camera, offline queue
├── manifest.json           PWA config (icons, theme, display)
├── service-worker.js       Offline cache + auto-update
│
├── css/
│   └── style.css           Full design system (OKLCH tokens, dark mode)
│
├── js/
│   ├── app.js              Routing, UI logic, punch flow
│   ├── auth.js             Signup, login, bootstrap, provisioning
│   ├── attendance.js       Clock-in/out, geofence check, record building
│   ├── camera.js           Selfie capture, compression, upload
│   ├── location.js         GPS, Haversine distance, anti-spoofing
│   ├── admin-dashboard.js  Stats, roster, map, realtime subscriptions
│   ├── offline-sync.js     localStorage queue, auto-retry on reconnect
│   ├── supabase-client.js  Database connection setup
│   └── utils.js            Date formatting, CSV export, helpers
│
├── api/
│   └── create-employee.js  Serverless endpoint (secure account creation)
│
└── supabase/
    └── schema.sql          4 tables, 13 RLS policies, 2 helper functions
```

---

## 🛠️ Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| **Frontend** | Vanilla HTML/CSS/JS + Service Worker | Free |
| **Maps** | Leaflet.js + OpenStreetMap | Free |
| **Database** | Supabase PostgreSQL | Free (500MB) |
| **Auth** | Supabase Auth (email/password) | Free |
| **Storage** | Supabase Storage (selfie photos) | Free (1GB) |
| **Realtime** | Supabase Realtime (websockets) | Free |
| **Hosting** | Vercel (static + serverless) | Free |
| **Typography** | Google Fonts (Inter) | Free |
| **Total** | | **₹0/month** |

---

## 🔒 Security

- **Row Level Security (RLS)** — 13 policies ensure data isolation between companies and roles
- **Server-Side Employee Creation** — admin key never touches the browser
- **Anti-Spoofing Engine** — teleport detection (>120 km/h), jitter detection (identical coords), accuracy threshold (>150m)
- **Scoped Storage** — selfies stored at `{company_id}/{user_id}/` — employees can't see each other's photos
- **HTTPS everywhere** — Supabase + Vercel enforce TLS by default

---

## 📋 Environment Variables

| Variable | Where to Find | Used By |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API | Frontend + API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | Frontend + API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) | **Server only** (`api/create-employee.js`) |

> ⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.** It is only used by the serverless API endpoint.

---

## 🚧 Roadmap

Placeholder UI exists for these upcoming features:

- 📋 Leave management with approval workflows
- 💰 Payroll and salary configuration
- 🔄 Shift scheduling
- 📈 Attendance analytics and reports
- 🔔 Push notifications

---

<div align="center">

**Staff Management PWA v1.0**

14 features · Zero cost · Built for small teams

*Engineered for simplicity, accuracy, and offline resilience.*

</div>
