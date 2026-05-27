# 📱 Staff Management PWA

<div align="center">
  <strong>An Android-first, offline-capable attendance Progressive Web App (PWA) for small teams.</strong>
</div>
<br/>

The Staff Management PWA provides a seamless, zero-cost, browser-based employee attendance system. It utilizes **Supabase** for backend services (Auth, Postgres Database, Storage) and native Web APIs (Camera, Geolocation) for a robust attendance tracking system with anti-spoofing mechanisms.

---

## 🌟 Key Features

### 🏢 For Business Owners (Admins)
- **Zero-Friction Bootstrap:** Create a company profile and set up a workspace in seconds.
- **Geofence Configuration:** Set office coordinates and a valid punch-in radius.
- **Employee Provisioning:** Securely create and manage employee accounts directly from the dashboard.
- **Live Dashboard:** Real-time visibility into active heads, present staff, absentees, and late arrivals.
- **Live Map View:** Track employee locations visually via Leaflet and OpenStreetMap.

### 👷 For Employees
- **Role-Safe Portal:** Secure login with temporary credentials provided by the admin.
- **Selfie Verification:** Mandatory selfie capture using the device camera (`getUserMedia`) before punching in or out.
- **GPS Validation:** Mandatory location capture with anti-spoofing and geofence distance calculation.
- **Offline Resilience:** Punch records queue up locally when offline and sync automatically upon reconnection.

---

## 🚀 The Core Workflow (v1)

1. **Owner Signup:** Create an account and initialize a company workspace.
2. **Geofence Setup:** Define the valid office boundary and start time.
3. **Staff Creation:** Owner generates employee credentials for the team.
4. **Employee Login:** Staff signs in on their mobile device.
5. **Secure Punch:** Employee takes a fresh selfie and records high-accuracy GPS coordinates.
6. **Live Review:** Owner monitors attendance and geo-compliance in real-time from the dashboard.

---

## 🛠️ Technology Stack

**Frontend**
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Service Worker for offline app shell caching
- Leaflet.js + OpenStreetMap for live tracking

**Backend & Database**
- **Supabase** (PostgreSQL Database)
- **Supabase Auth** (Role-based access control)
- **Supabase Storage** (Selfie retention)
- **Supabase Realtime** (Live dashboard updates via websockets)

**Native Browser APIs**
- Geolocation API (High-accuracy GPS tracking)
- MediaDevices API / Camera (Live selfie capture)

---

## 📂 Project Structure

```text
Staff Management/
├── index.html            # Role selection (Owner vs Employee)
├── owner.html            # Admin dashboard, staff management, map view
├── employee.html         # Employee punch portal, offline queue
├── manifest.json         # PWA configuration
├── service-worker.js     # Offline app-shell caching
├── css/
│   └── style.css         # Application styling
├── js/
│   ├── app.js            # Core routing and init logic
│   ├── attendance.js     # Punch-in/out logic & spoof detection
│   ├── auth.js           # Supabase auth wrapper & role management
│   ├── admin-dashboard.js# Owner live statistics & realtime listeners
│   ├── camera.js         # Selfie capture & storage upload
│   ├── location.js       # GPS, geofencing, and distance calc
│   ├── offline-sync.js   # LocalStorage queuing and background sync
│   └── supabase-client.js# Supabase initialization
└── supabase/
    └── schema.sql        # Postgres tables, RLS policies, triggers
```

---

## 🔒 Security & Data Integrity

- **Row Level Security (RLS):** Supabase database policies ensure employees can only write their own records, and owners can only view their company's data.
- **Anti-Spoofing Engine:**
  - *Teleport Detection:* Flags unnatural movement speeds (>120 km/h).
  - *Jitter Detection:* Flags identical repeated coordinates commonly caused by mock-location apps.
  - *Accuracy Thresholds:* Flags low-accuracy GPS pings (>150 meters).

---

## ⚙️ Setup & Deployment

### 1. Supabase Configuration
1. Create a new [Supabase](https://supabase.com) project.
2. Navigate to the SQL Editor and run the contents of `supabase/schema.sql` to generate tables and RLS policies.
3. Create a **public** storage bucket named `selfies`.
4. Enable **Email/Password** authentication in Auth Settings.
   - *Recommendation:* Disable mandatory email confirmation for a smoother v1 bootstrap flow.
5. Retrieve your `Project URL` and `anon key` from the project settings.

### 2. Client Configuration
Update `js/supabase-client.js` with your specific Supabase credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Local Development
Since the app uses standard web technologies, any static file server works:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```
Navigate to `http://localhost:8080/index.html` to view the application.

---

## 🚧 Roadmap & Future Scope

While the v1 *Attendance Hard Path* is fully complete, placeholder UI exists for the following upcoming modules:
- Leave Management & Approval Workflows
- Payroll & Salary Configuration
- Employee Expense Tracking
- Holiday Management & Shift Scheduling
- True background sync via IndexedDB (currently relies on `localStorage` queueing)

---
<div align="center">
  <i>Engineered for simplicity, accuracy, and offline resilience.</i>
</div>
