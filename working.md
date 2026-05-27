# Staff Management PWA — Complete Project Flow

> This document traces the exact, verified flow of the Staff Management PWA from screen to screen, function to function. Every claim below has been cross-referenced against the source code.

---

## 1. Initial Entry & Role Selection (`index.html`)

### What the user sees
- A light-themed onboarding card titled **"Create account"** with a 3-step progress bar (Step 1 of 3).
- Two selection cards: **Employee** ("Join your team") and **Business** ("Create a workspace"). Business is selected by default.
- A checkbox asking if the user has used an attendance/payroll app before.
- A **Continue** button.

### What happens on load
- `app.js` is loaded and its `DOMContentLoaded` handler runs.
- The handler checks the page path: since `index.html` does **not** end with `owner.html` or `employee.html`, **no session check is performed**. The role-selection view (`view-step1`) is simply shown as-is. There is no auto-redirect on this page.

### Routing logic (`handleStep1Continue()` in `app.js`)
- If the user selected **Employee** → `window.location.href = 'employee.html'`
- If the user selected **Business** → `window.location.href = 'owner.html'`

### Scripts loaded on this page
`supabase-client.js` → `utils.js` → `offline-sync.js` → `auth.js` → `app.js` + Service Worker registration.

---

## 2. The Business / Owner Flow (`owner.html`)

### A. Auto-routing on page load
When `owner.html` loads, the `DOMContentLoaded` handler in `app.js` (lines 685–753) runs:
1. It detects `isOwnerPage = true`.
2. It calls `Auth.getSession()` to check for an existing Supabase session.
3. **If a session exists:**
   - It calls `Auth.getProfile()` to look up the user in the `users` table.
   - If no profile exists yet but a pending owner bootstrap is saved in `localStorage`, it calls `Auth.completeOwnerBootstrap()` to finish setup.
   - If the resolved profile has `role === 'admin'` → navigates directly to `view-dashboard` and calls `initializeOwnerExperience()`. The signup/signin screens are skipped entirely.
   - If the resolved profile has `role === 'employee'` → redirects to `employee.html`.
4. **If no session** → shows `view-step2` (the first visible form on this page).

### B. Step 2 — Business Details (`view-step2`)
- **Back arrow** → links back to `index.html`.
- Progress bar shows Step 2 of 3.
- Form fields: **First Name**, **Last Name**, **Firm Name**, **Designation**, **Employee Count**.
- **Continue** button → calls `navigateTo('view-step3')` (purely client-side view switch, no data is saved from this step).

### C. Step 3 — Account Creation (`view-step3`)
- Progress bar shows Step 3 of 3.
- A **toggle checkbox** (`owner-signup-toggle`) lets the user switch between "Creating a new account" (signup) and sign-in mode.
- Form fields: **Company / Firm Name**, **Email Address**, **Password** (with show/hide toggle).
- Error message container and a "Resend confirmation email" button (hidden by default).

### D. Authentication logic (`handleOwnerAuth()` in `app.js`)
- Reads the toggle state to determine signup vs. signin.

**Signup path (`Auth.signUpOwner` in `auth.js`):**
1. Calls `supabase.auth.signUp()` with the email, password, and user metadata (`company_name`, `role: 'admin'`).
2. Saves `{ email, companyName }` to `localStorage` under key `sm_pending_owner_bootstrap`.
3. If Supabase requires email confirmation (no auto-confirm) → returns `needsConfirmation: true`. The UI shows "Check your email" and reveals the resend button.
4. If a session is returned immediately → calls `completeOwnerBootstrap()` right away.

**Sign-in path (`Auth.signIn` in `auth.js`):**
1. Calls `supabase.auth.signInWithPassword()`.
2. Calls `Auth.getProfile()` to look up the `users` row for this auth ID.
3. If no profile exists, it checks for a pending bootstrap or `user_metadata.company_name` and calls `completeOwnerBootstrap()`.

**`completeOwnerBootstrap()` — the critical setup function:**
1. Generates a UUID for the new company.
2. Inserts into `companies` table: `{ id, name, admin_ids: [userId], geofence_lat: 0, geofence_lng: 0, geofence_radius: 100 }`.
3. Inserts into `users` table: `{ id: userId, company_id, name: "<Company> Admin", email, role: 'admin' }`.
4. Clears the pending bootstrap from `localStorage`.

**After successful auth:**
- If the profile role is `'employee'` → redirects to `employee.html`.
- Otherwise → sets `selectedRole = 'business'`, calls `navigateTo('view-dashboard')`, and runs `initializeOwnerExperience()`.

### E. Owner Dashboard (`view-dashboard`)
- **Dark theme** with gradient background.
- **Greeting header** ("Good morning.").

**`initializeOwnerExperience()` does:**
1. Calls `AdminDashboard.init()` which:
   - Fetches the admin profile and company data.
   - Binds the staff search input with a debounced handler.
   - Subscribes to **Supabase Realtime** channels on `attendance_logs`, `last_known_locations`, and `users` tables for live updates.
   - Calls `AdminDashboard.refresh()` → loads stats + staff roster.
2. Checks if `company.geofence_lat === 0 && company.geofence_lng === 0`. If so, **automatically opens the Geofence configuration modal**.

**Attendance Statistics Card** — shows live counts:
- Not marked, Present, Absent, Late, Outside zone, Clocked out, Heads, Archived, Admin, Located, Employee.
- Computed from `users` + `attendance_logs` for today's date range.
- "Late" is determined by comparing the first `clock_in` timestamp against `company.work_start_time`.

**Staff Search** — filters the roster by name or email (debounced 150ms).

**Staff Roster Card** — lists each employee with:
- Name, email, punch status (Punched in / Clocked out / No punch yet), last timestamp, distance from office.

**Geofence Summary Card** — displays current geofence config or "Not configured yet."

### F. Geofence Configuration Modal (`geofence-modal`)
- Fields: Latitude, Longitude, Radius (metres), Work Start Time.
- **"Use Current Location"** button → calls `LocationService.getCurrentPosition()` to auto-fill lat/lng from the device GPS.
- **"Save Geofence"** → calls `Auth.updateCompanySettings()` which runs `supabase.from('companies').update(...)`.
- After save, updates both dashboard and settings geofence summaries, refreshes the staff roster, and reloads the map if it's visible.

### G. Add Employee Modal (`add-employee-modal`)
- Fields: Full Name, Email, Temporary Password.
- **"Create Employee"** → calls `Auth.provisionEmployee()`:
  1. Verifies the caller is an admin via `Auth.getProfile()`.
  2. Gets a fresh access token via `Auth._getFreshAccessToken()`.
  3. Sends a `POST /api/create-employee` request with the employee details and the admin's Bearer token.

**Server-side (`api/create-employee.js`):**
1. Validates the admin's token using the **Supabase Service Role Key** (server-only secret).
2. Confirms the caller has `role: 'admin'` in the `users` table.
3. Creates a new auth user via `supabase.auth.admin.createUser()` with `email_confirm: true` (no email verification needed for employees).
4. Inserts the employee profile into `users` with `role: 'employee'` and the admin's `company_id`.
5. If the email already exists in auth, it updates the existing auth user's password and metadata instead.
6. Returns the created employee profile. The client shows a success message and refreshes the roster.

### H. Map View (`view-map`)
- Uses **Leaflet.js** with OpenStreetMap tiles.
- Fetches all employee locations from `last_known_locations` table (filtered by `company_id`).
- Plots markers with popups showing employee name, last update time, and GPS accuracy.
- Draws a blue circle for the geofence boundary if configured.
- Centers on the geofence location (or first employee, or Delhi as fallback).

### I. Settings View (`view-settings`)
- Shows owner profile avatar placeholder.
- **Navigation items** (visual-only, not wired to sub-views): Switch Firm, Personal Details, Company Details, Company Shifts, Employee Categories, Payroll Configurations, Payroll Template, Designations & Permissions, Holidays, Reports.
- **Feature toggles** (client-side only, not persisted): Leave System, Face Attendance, Expense System, Geo Fencing, Custom Daywise Salary, Maintain Salary Payment History.
- **Notification toggles**: Staff Punch Notification, WhatsApp Report (with time display).
- **Workplace Setup section**: Geofence Status display + Edit button, Add Employee Account shortcut, Review Attendance Logs shortcut.
- **Sign Out** button → calls `Auth.signOut()` → `supabase.auth.signOut()` → redirects to `index.html`.

### J. Bottom Navigation Bar (Owner)
5 tabs: **Map** → `view-map` | **Staff** → `view-dashboard` | **Work** (no handler) | **Leaves** (no handler) | **Settings** → `view-settings`.

---

## 3. The Employee Flow (`employee.html`)

### A. Auto-routing on page load
Same mechanism as owner page:
1. Checks `isEmployeePage = true`.
2. If an active session exists and the profile has `role === 'employee'` → navigates directly to `view-emp-dashboard` and calls `initializeEmployeeExperience()`.
3. If the profile has `role === 'admin'` → redirects to `owner.html`.
4. If no session → shows `view-emp-step2` (the sign-in form).

### B. Employee Sign In (`view-emp-step2`)
- **Back arrow** → links to `index.html`.
- Title: "Welcome back." / Subtitle: "Sign in with the credentials your admin provided".
- Fields: **Email Address**, **Password** (with show/hide toggle).
- **"Sign In"** button → calls `handleEmployeeAuth()`:
  1. Calls `Auth.signIn(email, password)` — no `allowOwnerBootstrap` flag, so employees cannot accidentally create companies.
  2. On success: if profile role is `'admin'` → redirects to `owner.html`. Otherwise → sets `selectedRole = 'employee'`, navigates to `view-emp-dashboard`, calls `initializeEmployeeExperience()`.
  3. On failure: shows friendly error. "Invalid login credentials" is reworded to "Check the email and temporary password from your owner."

### C. Permissions Screen (`view-emp-permissions`)
- **This view exists in the HTML but is NOT automatically shown in any code path.** After successful login, employees go directly to the dashboard. The permissions screen is a pre-built UI that is currently disconnected from the main flow.
- It contains 6 permission cards: Notifications ✓, Location access ✓, Physical activity ✓, Location service (Allow button), Battery optimization (Allow button), Auto-start (Allow button).
- Clicking Allow on battery/auto-start opens a `battery-modal` with Xiaomi/Redmi optimization instructions.
- A Continue button is enabled only when all permissions are granted.

### D. Employee Dashboard (`view-emp-dashboard`)
- **Dark theme** (`#111418` background).
- Header shows "Staff Management" with a refresh button (↻) that calls `restoreEmployeePunchState()`.
- **Top banner**: Dynamic status messages (e.g., "Please punch in to mark your attendance", "You are punched in since 9:32 AM").
- **Center**: Large "SM" watermark text with a status message below.
- **Bottom**: A large action button — either green **"Punch IN"** or red **"Punch OUT"**.

**`initializeEmployeeExperience()` does:**
1. Sets `employeeDashboardInitialized = true`.
2. Calls `restoreEmployeePunchState()` → `Attendance.getPunchState()`:
   - Fetches today's attendance logs for this user from `attendance_logs`.
   - If the last log's type is `'clock_in'` → employee is punched in.
   - If no logs or last log is `'clock_out'` → employee is punched out.
3. Calls `applyPunchState()` which updates the button text/color, banner message, and modal text accordingly.

### E. The Punch Process (step-by-step)

1. Employee taps **Punch IN** (or **Punch OUT**).
2. **Confirmation modal** (`punch-modal`) appears: "Punching IN?" / "Capture a fresh selfie to punch IN." with Cancel and Confirm buttons.
3. Employee taps **Confirm** → `handlePunch()`:
   - Closes the modal.
   - Calls `startEmployeeCamera()` → resets camera state, navigates to `view-emp-camera`, opens front-facing camera via `CameraService.startCamera()`.
4. **Camera view** (`view-emp-camera`): Shows live video feed with a **Capture** button.
5. Employee taps **Capture** → `captureEmployeeSelfie()`:
   - `CameraService.captureFrame()` draws the video frame onto a canvas (mirrored for front camera), converts to JPEG blob at 0.7 quality.
   - Camera stream is stopped.
   - Preview image is shown. Two new buttons appear: **Retake** and **Submit Punch**.
6. Employee taps **Submit Punch** → `submitEmployeePunch()`:
   - Shows banner: "Verifying GPS and uploading your selfie..."
   - Calls `Attendance.clockIn(blob)` or `Attendance.clockOut(blob)`.

### F. Behind the Scenes — `Attendance._buildRecord()` (`attendance.js`)

1. **Profile & Company check**: Ensures the employee has a valid profile and company. Verifies the company's geofence is configured (lat/lng ≠ 0, radius > 0). Throws an error if not.
2. **GPS Acquisition**: `LocationService.acquireVerifiedPosition()`:
   - Gets high-accuracy GPS via `navigator.geolocation.getCurrentPosition()` (timeout: 12s, max age: 0).
   - Runs **anti-spoofing checks** (`checkSpoofing()`):
     - **Teleport detection**: If speed between last two readings exceeds 120 km/h → flagged.
     - **Jitter detection**: If last 3 GPS samples have identical coordinates → flagged (common with mock GPS apps).
     - **Low accuracy**: If accuracy exceeds 150m → flagged.
   - Returns `{ lat, lng, accuracy, spoofFlags }`.
3. **Selfie Upload**: `CameraService.uploadSelfie()`:
   - Uploads the JPEG blob to Supabase Storage bucket `selfies`.
   - Path format: `{company_id}/{user_id}/{UTC-timestamp}.jpg`.
   - Returns the public URL of the uploaded selfie.
4. **Geofence Validation**: `LocationService.isInsideGeofence()`:
   - Uses the **Haversine formula** to calculate the distance between the employee's GPS coordinates and the company's geofence center.
   - Returns `{ inside: boolean, distanceMetres: number }`.
5. **Record Assembly**: Builds an attendance record:
   ```
   { user_id, company_id, type, selfie_url, lat, lng, accuracy_meters,
     timestamp, is_geofence_valid, distance_from_office, synced_offline: false, spoof_flags }
   ```

### G. Saving the Record — `Attendance._insertOrQueue()`

- **Online**: Inserts into `attendance_logs` table via Supabase client. On success, also upserts `last_known_locations` with the employee's current GPS.
- **Offline / Network Failure**: If the insert fails due to a network issue (`!navigator.onLine`, "failed to fetch", "timed out"), the record is saved to `localStorage` via `OfflineSync.saveToQueue()` under key `sm_attendance_queue`.
- **RLS Error**: If the insert fails with a "row-level security" error, a specific user-friendly message is shown.

### H. Offline Sync (`offline-sync.js`)

- Records are queued as JSON in `localStorage` (NOT IndexedDB).
- When the device comes back online, a `window.addEventListener('online', ...)` event handler automatically calls `OfflineSync.syncNow()`:
  - Iterates through all queued records, strips internal metadata, marks `synced_offline: true`, and inserts each into `attendance_logs`.
  - Failed records remain in the queue for the next attempt.
  - Success count is shown in the employee dashboard banner.

### I. Post-Punch UI Update
- Navigates back to `view-emp-dashboard`.
- Calls `applyPunchState(!isPunchedIn, result.record)` to flip the button (IN→OUT or OUT→IN).
- Shows appropriate banner:
  - ✅ "Attendance recorded successfully." (green)
  - ⚠️ "Attendance recorded outside the office zone." (amber, if `is_geofence_valid === false`)
  - Appends "Saved offline and will sync automatically." if offline.

### J. Employee — You Tab (`view-emp-you`)
- Shows "Previous Reports" section with a styled monthly card (currently hardcoded to "May '26").
- "Your current analytics" section with hardcoded attendance entries (Monday/Sunday).
- Floating orange punch button (✋) → navigates back to `view-emp-dashboard`.

### K. Employee — Requests Tab (`view-emp-requests`)
- Header: "Leave Requests" with Pending / Approved / Rejected filter tabs (visual only, not wired).
- Shows a sample leave card (Sick Leave, May 28–29, Pending status with reason).
- **Floating "+" button** → opens `leave-modal`:
  - Leave Type dropdown (Sick Leave, Casual Leave, Half Day).
  - From / To date pickers.
  - Reason textarea.
  - Submit button (currently just closes the modal — no backend integration).

### L. Employee — Settings Tab (`view-emp-settings`)
- Profile avatar with edit icon.
- Settings list: Personal Details, Leave System toggle, Face Attendance toggle, Expense System toggle, Geo Fencing toggle, Custom Daywise Salary toggle, Holidays, Pay Slips, View Logs.
- **Toggles are client-side only** — clicking toggles the `.active` class but nothing is persisted.
- **Sign Out** button → `Auth.signOut()` → redirects to `index.html`.
- App version footer: "Staff Management v1.0".

### M. Bottom Navigation Bar (Employee)
5 tabs: **Punch** → `view-emp-dashboard` | **You** → `view-emp-you` | **Work** (no handler) | **Requests** → `view-emp-requests` | **Settings** → `view-emp-settings`.

---

## 4. Backend Architecture

### A. Database Tables (Supabase PostgreSQL)

| Table | Purpose | Key Columns |
|---|---|---|
| `companies` | One row per business/firm | `id`, `name`, `admin_ids[]`, `geofence_lat/lng/radius`, `work_start_time` |
| `users` | Links `auth.users.id` to a company | `id` (= auth UID), `company_id`, `name`, `email`, `role` (admin/employee), `is_active` |
| `attendance_logs` | Every punch-in/out record | `user_id`, `company_id`, `type`, `selfie_url`, `lat/lng`, `is_geofence_valid`, `distance_from_office`, `spoof_flags` |
| `last_known_locations` | Latest GPS ping per employee (upsert on `user_id`) | `user_id`, `company_id`, `lat/lng`, `accuracy_meters`, `updated_at` |

### B. Row-Level Security (RLS) Policies

**Helper functions** (defined as `SECURITY DEFINER` to avoid infinite recursion):
- `current_user_company_id()` → returns the `company_id` of the calling user.
- `current_user_is_admin()` → returns true if the calling user has `role = 'admin'`.

**Policy Summary:**

| Table | Operation | Who | Condition |
|---|---|---|---|
| `companies` | INSERT | Authenticated | `auth.uid() = ANY(admin_ids)` |
| `companies` | SELECT | Members | Admin of company OR `company_id` matches |
| `companies` | UPDATE | Admins | Admin of company |
| `users` | INSERT (own) | Self | `id = auth.uid()` (bootstrap) |
| `users` | INSERT (others) | Admins | Same `company_id` |
| `users` | SELECT (own) | Self | `id = auth.uid()` |
| `users` | SELECT (all) | Admins | Same `company_id` |
| `users` | UPDATE | Admins | Same `company_id` |
| `attendance_logs` | INSERT | Self | `user_id = auth.uid()` AND same `company_id` |
| `attendance_logs` | SELECT (own) | Self | `user_id = auth.uid()` |
| `attendance_logs` | SELECT (all) | Admins | Same `company_id` |
| `last_known_locations` | ALL (own) | Self | `user_id = auth.uid()` |
| `last_known_locations` | SELECT (all) | Admins | Same `company_id` |

**Storage (selfies bucket):**
- Upload: authenticated, path must be `{company_id}/{user_id}/...`
- View own: `user_id` folder matches auth UID.
- View company: admins can view all selfies in their `company_id` folder.

### C. Server-Side API (`api/create-employee.js`)
- Runs on Vercel as a serverless function.
- Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only env var) to create auth users with `admin.createUser()`.
- Validates that the calling user is an admin before creating any account.
- Sets `email_confirm: true` so employees don't need to verify their email.

### D. Service Worker (`service-worker.js`)
- **Network-first with cache fallback** strategy.
- Caches all app shell assets (HTML, CSS, JS, manifest) on install.
- Also runtime-caches CDN resources from `cdn.jsdelivr.net` (Supabase SDK).
- Enables offline usage of the app (cached pages load even without internet).

---

## 5. Module Dependency Map

```
index.html ──→ supabase-client.js → utils.js → offline-sync.js → auth.js → app.js

owner.html ──→ supabase-client.js → utils.js → location.js → auth.js → admin-dashboard.js → app.js
               + Leaflet.js (map)

employee.html → supabase-client.js → utils.js → offline-sync.js → location.js → camera.js → auth.js → attendance.js → app.js
```

All modules expose their APIs on `window.*` (e.g., `window.Auth`, `window.Attendance`, `window.CameraService`).
