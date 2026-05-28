# Staff Management PWA

<div align="center">
  <strong>Free GPS, selfie, attendance, and attendance-based payroll app for small teams.</strong>
  <br/>
  <em>No app store. No subscription. No server costs.</em>
  <br/><br/>
  Works offline · Anti-spoofing · Live map · Payroll slips · Rs. 0/month
</div>

---

## What It Does

Staff Management is a browser-based PWA for small teams. Owners create a company, add employees, set an office geofence, track attendance with GPS and selfies, and generate monthly attendance-based payroll. Employees punch in/out from their phone, can work offline, and can view their own salary slips.

Payroll is intentionally attendance-based payroll, not full statutory payroll compliance. It answers: "How much do I owe this employee this month based on attendance, deductions, overtime, and adjustments?"

---

## Working Features

### For Owners

| Feature | What It Does |
|---|---|
| Live Dashboard | Real-time stats for present, absent, late, and outside-zone employees |
| Map View | Shows employee punch locations on a Leaflet map with the office geofence |
| Geofence Setup | Configure office latitude, longitude, and allowed radius |
| Employee Provisioning | Create employee accounts from the owner dashboard through the secure API |
| Late Detection | Flags late punches based on company work start time |
| Staff Roster | Shows live employee status and today's worked hours |
| Salary Setup | Configure monthly CTC, Basic %, HRA %, special allowance, bank/PAN/UAN fields |
| Payroll Settings | Configure daily-rate method, work hours, late grace, late penalty, and overtime multiplier |
| Monthly Payroll | Generate payroll from attendance logs for a selected month |
| Adjustments | Add bonuses, incentives, reimbursements, fines, or advance recovery |
| Confirm & Lock | Confirm payroll through a database RPC; confirmed runs are locked by RLS |
| Salary Slips | View and print salary slips generated from payroll snapshot data |

### For Employees

| Feature | What It Does |
|---|---|
| Selfie Verification | Requires a front-camera selfie with every punch |
| GPS Attendance | Captures location and accuracy with each attendance record |
| Geofence Enforcement | Blocks attendance outside the configured office zone |
| Anti-Spoofing | Detects suspicious GPS behavior such as teleport jumps and poor accuracy |
| Offline Mode | Queues punches locally and syncs when the device reconnects |
| Payroll History | Shows the employee's recent payroll runs and salary slips in the You tab |

### Platform

| Feature | What It Does |
|---|---|
| Role-Based Security | Supabase RLS isolates company, owner, employee, attendance, and payroll data |
| PWA | Installable from the browser with offline caching and service worker updates |
| Serverless API | Employee creation uses a Vercel function so the service role key stays server-side |

---

## Payroll Status

The 3-phase attendance-based payroll system is implemented.

| Phase | Status | Scope |
|---|---|---|
| Phase 1 | Complete | Payroll schema, salary configs, company payroll settings, worked-hours calculation |
| Phase 2 | Complete | Monthly payroll generation, adjustments, draft updates, confirm-and-lock RPC |
| Phase 3 | Complete | Salary slip HTML, print flow, owner slip view, employee payroll history |

### Payroll Model

- Uses full monthly CTC minus attendance deductions, avoiding double deduction.
- Snapshots CTC, Basic %, HRA %, daily-rate method, work hours, and overtime multiplier into `payroll_runs`.
- Generates slips from snapshot data, so old slips do not change after salary revisions.
- Uses an RPC named `confirm_payroll` for draft-to-confirmed transitions.
- RLS blocks normal update/delete of confirmed and paid payroll runs.
- Adjustments are blocked for confirmed/paid months.

### Deferred Payroll Scope

These are not part of the current payroll implementation:

- Paid leave workflow
- Company holiday calendar
- Shift scheduling
- PF, ESI, Professional Tax, and TDS compliance automation
- CA/statutory filing reports

---

## Quick Start

### 1. Supabase Setup

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Run `supabase/payroll-schema.sql` after the base schema.
4. Create a public storage bucket named `selfies`.
5. Enable Email/Password auth in Authentication -> Settings.

### 2. Configure the App

Update `js/supabase-client.js` with your project credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Run Locally

```bash
npm i -g vercel
vercel env pull .env
vercel dev
```

Basic static screens can run with a static server, but employee creation needs the Vercel runtime for `api/create-employee.js`.

### 4. Deploy

```bash
vercel --prod
```

Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel -> Settings -> Environment Variables.

---

## Project Structure

```text
Staff Management/
├── index.html              Landing page and role selection
├── owner.html              Owner dashboard, map, settings, payroll UI
├── employee.html           Employee punch portal, You tab, payroll history
├── manifest.json           PWA manifest
├── service-worker.js       Offline cache and app update handling
│
├── css/
│   └── style.css           App styling, responsive layout, print styles
│
├── js/
│   ├── app.js              Routing, UI logic, punch flow, payroll handlers
│   ├── auth.js             Signup, login, bootstrap, employee provisioning
│   ├── attendance.js       Clock-in/out, geofence check, attendance records
│   ├── camera.js           Selfie capture, compression, upload
│   ├── location.js         GPS, Haversine distance, anti-spoofing
│   ├── admin-dashboard.js  Owner stats, roster, map, realtime updates
│   ├── payroll.js          Salary config, payroll generation, slips
│   ├── offline-sync.js     localStorage queue and retry sync
│   ├── supabase-client.js  Supabase client setup
│   └── utils.js            Date formatting, CSV export, shared helpers
│
├── api/
│   └── create-employee.js  Serverless employee creation endpoint
│
└── supabase/
    ├── schema.sql          Base company, user, attendance, and helper schema
    └── payroll-schema.sql  Payroll tables, policies, indexes, and RPC
```

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS + Service Worker | Free |
| Maps | Leaflet.js + OpenStreetMap | Free |
| Database | Supabase PostgreSQL | Free tier available |
| Auth | Supabase Auth | Free tier available |
| Storage | Supabase Storage for selfies | Free tier available |
| Realtime | Supabase Realtime | Free tier available |
| Hosting | Vercel static + serverless | Free tier available |

---

## Security

- Row Level Security protects company-scoped and employee-owned data.
- Payroll confirmation uses `confirm_payroll(...)` as a `SECURITY DEFINER` RPC after validating the current user is an admin of the company.
- Confirmed and paid payroll runs are immutable through normal client writes.
- Employee creation uses `api/create-employee.js`; the service role key never belongs in frontend code.
- Selfies are stored under company/user paths in the `selfies` bucket.
- GPS anti-spoofing checks suspicious location accuracy, jumps, and repeated coordinates.

---

## Environment Variables

| Variable | Where to Find | Used By |
|---|---|---|
| `SUPABASE_URL` | Supabase -> Settings -> API | Frontend and API |
| `SUPABASE_ANON_KEY` | Supabase -> Settings -> API | Frontend and API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Settings -> API | Server only, `api/create-employee.js` |

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

---

## Verification Notes

Current static verification completed:

- `js/payroll.js` contains Phase 1, 2, and 3 payroll methods.
- `owner.html` and `employee.html` load `js/payroll.js` before `js/app.js`.
- `service-worker.js` caches `js/payroll.js` and is bumped to cache version `v14`.
- JavaScript syntax checks passed for the main app, payroll, dashboard, service worker, and API files.
- `supabase/payroll-schema.sql` defines payroll tables, indexes, RLS policies, and the `confirm_payroll` RPC.

Residual items to keep in mind:

- Supabase migration execution was not verified against a live database in this audit.
- Salary slips are printable HTML using `window.print()`, not generated binary PDFs.
- Payroll assumes attendance logs are the source of truth and currently excludes statutory payroll automation.
- Weekly off rules are still fixed in code rather than configurable per company.

---

## Roadmap

- Leave requests and paid leave payroll integration
- Company holiday calendar
- Shift scheduling
- Attendance analytics and reports
- Optional statutory payroll reports after supporting data exists
- Push notifications

---

<div align="center">

**Staff Management PWA**

Attendance, payroll, and offline-first field verification for small teams.

</div>
