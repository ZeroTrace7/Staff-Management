# Staff Management PWA - Complete Project Flow

This document outlines the end-to-end flow of the Staff Management Progressive Web Application (PWA). It details the user journey, authentication mechanisms, database interactions, and module functions.

## 1. Initial Entry & Role Selection (`index.html`)
- **Step 1 (Role Selection):** When a user opens the application (`index.html`), they are presented with a choice to proceed as either a **Business** (Owner/Admin) or an **Employee**.
- **State Check:** On load, `app.js` runs to see if an active Supabase session already exists. If a user is already authenticated, the app determines their role from the `users` table and routes them directly to their respective dashboard (`owner.html` or `employee.html`), bypassing the selection screen.
- **Routing:** 
  - Selecting "Business" and clicking Continue navigates the user to `owner.html`.
  - Selecting "Employee" and clicking Continue navigates the user to `employee.html`.

---

## 2. The Business/Owner Flow (`owner.html`)

### A. Onboarding & Authentication
- **Step 2 (Business Details):** The owner fills out introductory UI fields (Name, Firm Name, Employee Count). This is currently a visual step that leads to account creation.
- **Step 3 (Signup / Sign In):** 
  - **Signup:** The owner enters their email, password, and company name. `Auth.signUpOwner` (`auth.js`) sends this to Supabase Auth. A temporary state (`PENDING_OWNER_KEY`) is saved in `localStorage`.
  - **Bootstrap:** Once email confirmation is successful, `Auth.completeOwnerBootstrap` runs. This critical function:
    1. Generates a new unique `id` (UUID) for the company.
    2. Inserts a new record into the `companies` table.
    3. Inserts the owner into the `users` table with the role `'admin'`, linking them to the newly created `company_id`.

### B. Owner Dashboard (`view-dashboard`)
- **Geofence Setup:** When the dashboard loads, the app checks if the `company.geofence_lat` is `0`. If so, a Geofence configuration modal pops up automatically. The owner uses their device's GPS to lock in the office coordinates and sets a radius (e.g., 100 meters). This data is saved to the `companies` table.
- **Adding Employees:** The owner clicks the floating "+" button or "Add Employee" to provision staff. 
  - They input the employee's Name, Email, and a Temporary Password. 
  - This calls `Auth.provisionEmployee`, which hits a secure `/api/create-employee` backend endpoint to create the auth account. The employee is then automatically linked to the owner's `company_id` in the `users` table.

### C. Owner Navigation & Features
- **Map View:** Shows real-time locations of employees fetched from the `last_known_locations` table.
- **Staff List:** Displays all employees tied to the `company_id` (enforced via Supabase Row-Level Security policies).
- **Settings:** Allows the owner to tweak Payroll, Leave systems, WhatsApp reports, and Geofence rules.

---

## 3. The Employee Flow (`employee.html`)

### A. Authentication
- **Sign In:** Employees do not sign up. They log in using the email and temporary password provisioned by their admin. `Auth.signIn` handles this.
- If the credentials are valid, Supabase returns a session, and the app reads the `users` table to confirm the role is `'employee'`.

### B. Permissions & Setup
- **Permissions Screen (`view-emp-permissions`):** Before reaching the dashboard, the app requires the employee to grant specific device permissions (Location, Camera, Notifications).
- **Battery Optimization:** A special modal warns users (especially on Xiaomi/Redmi devices) to disable battery restrictions so background location tracking works reliably.

### C. Attendance & Punch Flow (`view-emp-dashboard`)
- **Dashboard State:** The dashboard dynamically updates its UI based on the employee's current state (e.g., displaying "Punch IN" vs. "Punch OUT"). It calculates this by calling `Attendance.getPunchState()`, which fetches today's logs from `attendance_logs`.
- **The Punch Process:**
  1. Employee clicks **Punch IN**.
  2. A confirmation modal appears.
  3. The camera view (`view-emp-camera`) opens. The employee takes a selfie.
  4. The employee clicks **Submit Punch**.
  
- **Behind the Scenes (`attendance.js`):**
  1. `LocationService` retrieves a high-accuracy GPS coordinate and checks for spoofing.
  2. It compares the employee's current GPS location against the company's geofence (`isInsideGeofence`).
  3. `CameraService` uploads the selfie blob to the Supabase `selfies` storage bucket.
  4. An attendance record object is built, noting whether `is_geofence_valid` is true or false.
  5. The record is inserted into the `attendance_logs` table. 
  6. The `last_known_locations` table is updated with the employee's current coordinates.
  7. **Offline Mode:** If the network request fails (e.g., no internet), `OfflineSync.saveToQueue()` saves the record in `IndexedDB`/`localStorage` to sync automatically once connectivity is restored.

### D. Employee Navigation
- **You Tab:** Shows analytical stats, last punched times, and monthly reports.
- **Requests Tab:** An interface for applying for sick leaves or casual leaves. 
- **Settings:** Allows employees to manage personal details and sign out.

---

## 4. Backend Architecture (Supabase SQL)
The database utilizes Row-Level Security (RLS) to enforce strict multitenancy constraints:

- **`companies`**: Holds global configurations per firm (geofence lat/lng, radius).
- **`users`**: Links the Supabase `auth.users` ID to a specific `company_id`. Distinguishes between `admin` and `employee`.
- **`attendance_logs`**: The core ledger for punches. Stores `type` (clock_in/out), `selfie_url`, `lat`, `lng`, and `is_geofence_valid`.
- **`last_known_locations`**: An upsert-only table that tracks the absolute latest ping of an employee for the owner's map view.
- **Security:** RLS ensures that an employee can only insert logs into their own company's ledger and can only see their own attendance history. Admins can read all data, but only for the `company_id` they belong to.
