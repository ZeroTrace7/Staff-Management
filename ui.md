# 🖼️ UI Reference — MyHisaab App Screenshots Analysis

> All UI patterns extracted from MyHisaab reference screenshots.
> **This file is the visual blueprint for building Staff Management PWA.**
>
> **Status:** v1 UI is built. All core screens implemented. Adaptation notes below show what was kept, changed, or skipped.

---

## 🎨 Visual Identity (from Screenshots)

### Color Palette Observed
```
Background (light/onboarding):  ~#EBF0FF (light lavender-blue)
Background (dark/dashboard):    ~#0F1724 (deep navy charcoal)
Card surface (dark mode):       ~#1A2332 (translucent dark card)
Primary CTA button:             ~#2563EB (medium blue)
Primary CTA hover:              ~#1D4FD8 (deeper blue)
Progress bar:                   ~#F59E0B (orange/amber)
Branded period:                 ~#F59E0B (same amber as progress)

Status Colors:
  Not Marked:   🟠 Orange    ~#F97316
  Present:      🟢 Green     ~#22C55E
  Absent/Late:  🔴 Red       ~#EF4444
  Leave:        🟡 Yellow    ~#EAB308
  Early:        🟣 Purple    ~#A855F7
  Info/Total:   🔵 Blue      ~#3B82F6

Filter pills (active):         ~#374151 (dark gray fill, white text)
Filter pills (inactive):       transparent, border only
Input border (default):        ~#D1D5DB (light gray)
Input border (focused):        ~#2563EB (blue, matches primary)
Destructive/Logout:            ~#DC2626 (red) on dark muted bg
```

### Typography Observed
```
Headings:       Bold, large (Good morning. / Your Info. / All Requests.)
Brand period:   Colored dot at end of headings (amber/orange)
Body text:      Regular weight, ~14-16px
Muted text:     Gray, smaller, used for descriptions
Stat numbers:   Bold, ~24-28px
Stat labels:    Regular, ~12px, muted color
```

### Iconography
```
Bottom nav:     Outline icons (inactive), Filled icons (active)
Settings menu:  Monoline icons left-aligned before labels
Chevrons:       Right-pointing > for navigation items
Toggles:        iOS-style rounded switches
```

---

## 📱 Screen-by-Screen Breakdown

### 1. Onboarding Carousel (4 slides)

```
┌─────────────────────────────────┐
│  hisaab.  👤👤👤👤  ★★★★★ 4.7  │  ← Header: logo + social proof
│           Based on 700+ review   │
│                                  │
│  ┌─────────────────────────┐    │
│  │                         │    │  ← Rounded card with phone
│  │    [Phone Mockup        │    │     mockup screenshot inside
│  │     showing app]        │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                  │
│  Smart Attendance & Payroll     │  ← Bold heading
│  Accurate tracking with         │  ← Muted description
│  effortless payroll.             │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🇮🇳 +91 │ Enter phone... │   │  ← Phone input with country
│  └──────────────────────────┘   │
│       ● ● ● ●                   │  ← Dot indicators (blue active)
│                                  │
│  By continuing, you agree to     │
│  Terms & Conditions and          │  ← Legal text (bold links)
│  Privacy Policy                  │
│                                  │
│  ┌──────────────────────────┐   │
│  │        Continue          │   │  ← Soft blue CTA, full-width
│  └──────────────────────────┘   │
└─────────────────────────────────┘

Slides:
1. "Smart Attendance & Payroll" — phone showing dark dashboard
2. "Data Security & Privacy" — two phones (map + dashboard)
3. "Redefine Visibility & Control" — calendar with color-coded days
4. "Unified Work Management" — laptop + phone combo view
```

**Key CSS patterns:**
- Background: light lavender `~#EBF0FF`
- Card: white with `border-radius: 16px`, subtle shadow
- CTA: full-width, `border-radius: 12px`, soft blue `~#93B5F7` fill
- Dot indicators: small circles, blue = active, gray = inactive
- Phone input: split layout — country code left | input right, separated by vertical line

---

### 2. Account Creation — Step 1 of 3

```
┌─────────────────────────────────┐
│  ← hisaab.        [Need Help?] │  ← Back arrow + help button (black pill)
│                                  │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Orange progress bar (⅓ filled)
│  Step 1 of 3                     │
│                                  │
│  Create account                  │  ← Bold, large heading
│  Choose how want to start        │  ← Muted subtitle
│                                  │
│  ┌──────────┐  ┌──────────┐    │
│  │          │  │  🏢       │    │  ← Two selection cards
│  │ Employee │  │ Business  │    │     Business = blue border
│  │ Join your│  │ Create a  │    │     + blue background tint
│  │ team     │  │ workspace │    │     Employee = gray border
│  └──────────┘  └──────────┘    │
│                                  │
│  ☑ Have you ever used a app...  │  ← Checkbox with text
│                                  │
│  ┌──────────────────────────┐   │
│  │        Continue          │   │  ← Blue CTA
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Key CSS patterns:**
- Progress bar: 3 segments, orange fill, gray unfilled, `border-radius: 4px`
- Selection cards: equal width, `border-radius: 12px`, `height: ~140px`
- Selected card: blue border `2px`, light blue background tint
- Unselected card: gray border `1px`
- "Need Help?" button: black pill with phone icon

---

### 3. Account Creation — Step 2 of 3 (Details Form)

```
┌─────────────────────────────────┐
│  ← hisaab.        [Need Help?] │
│                                  │
│  ████████░░░░░░░░░░░░░░░░░░░░  │  ← ⅔ filled
│  Step 2 of 3                     │
│                                  │
│  Enter your details              │
│  Please provide your info below  │
│                                  │
│  ┌────────────┐ ┌────────────┐  │  ← Side-by-side inputs
│  │ First Name │ │ Last Name  │  │
│  └────────────┘ └────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │  ← Full-width inputs
│  │ Firm Name                 │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ Designation               │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ Employee count            │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐   │
│  │        Continue          │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Key CSS patterns:**
- Inputs: `border-radius: 12px`, `border: 1px solid #D1D5DB`, `height: ~52px`
- Placeholder text: muted gray
- Two-column layout for First/Last name: `gap: 12px`
- Clean white background, no card wrappers on form page

---

### 4. Account Creation — Step 3 of 3 (Password)

```
┌─────────────────────────────────┐
│  ← hisaab.        [Need Help?] │
│                                  │
│  ██████████████████████████████  │  ← Full orange bar
│  Step 3 of 3                     │
│                                  │
│  Welcome,                        │
│                                  │
│  ┌───────────────────────── 👁┐  │  ← Password with eye toggle
│  │ Create Password              │  │     Focused = blue border
│  └──────────────────────────┘   │
│                                  │
│  ┌───────────────────────── 👁┐  │
│  │ Confirm Password             │  │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │        Continue          │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Key CSS patterns:**
- Focused input: `border: 2px solid #2563EB` (blue)
- Eye icon: right-aligned inside input, toggles visibility
- "Welcome," — personalized greeting, comma suggests name follows later

---

### 5. Admin Dashboard (Dark Theme) — MAIN SCREEN

```
┌─────────────────────────────────┐
│  ○                          ○   │  ← Decorative circles (subtle)
│                                  │
│  Good morning.                   │  ← Greeting + amber period
│                                  │
│  ┌──────────────────────────┐   │
│  │ Attendance Statistics     │   │
│  │ Based on May 25, 2026 📅 │   │  ← "Today" button with calendar icon
│  │                           │   │
│  │ ┌──────┐┌──────┐┌──────┐ │   │  ← 3-column stat grid
│  │ │🟠 0  ││🟢 0  ││🔴 0  │ │   │
│  │ │Staff ││Staff ││Staff │ │   │     Each cell has:
│  │ │Not   ││Pres- ││Abs-  │ │   │     - colored left border (3px)
│  │ │marked││ent   ││ence  │ │   │     - bold number
│  │ └──────┘└──────┘└──────┘ │   │     - "Staff" label
│  │                           │   │     - category name
│  │ ┌──────┐┌──────┐┌──────┐ │   │
│  │ │🔵 0  ││🟡 0  ││🟣 0  │ │   │
│  │ │Staff ││Staff ││Staff │ │   │
│  │ │Late  ││Leave ││Early │ │   │
│  │ └──────┘└──────┘└──────┘ │   │
│  │                           │   │
│  │ ┌──────┐┌──────┐         │   │  ← 2 items in row 3
│  │ │🔵 0  ││⚪ 0  │         │   │
│  │ │Staff ││Staff │         │   │
│  │ │Heads ││Archvd│         │   │
│  │ └──────┘└──────┘         │   │
│  │                           │   │
│  │ ┌──────┐┌──────┐┌──────┐ │   │  ← Role breakdown
│  │ │🔵 0  ││🔵 0  ││🔵 0  │ │   │
│  │ │Staff ││Staff ││Staff │ │   │
│  │ │Admin ││Mngr  ││Empl  │ │   │
│  │ └──────┘└──────┘└──────┘ │   │
│  └──────────────────────────┘   │
│                                  │
│  🔍 Search                  >   │  ← Search bar
│                                  │
│  [All] [+]                  (+)  │  ← Filter + FAB button
│                                  │
│  ┌──────────────────────────┐   │
│  │ ⚠️ You're in Trial Mode │   │  ← Yellow warning banner
│  └──────────────────────────┘   │
│                                  │
│  🗺  👥  💼  📋  ⚙️             │  ← Bottom nav (5 tabs)
│  Map Staff Work Leaves Settings  │     Active tab = filled blue icon
└─────────────────────────────────┘
```

**Key CSS patterns for stat grid:**
```css
/* Each stat cell */
.stat-cell {
  background: transparent or subtle dark card;
  border-left: 3px solid [status-color];
  padding: 12px;
  border-radius: 8px;
}

/* Grid layout */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
```

---

### 6. Leave Requests Screen

```
┌─────────────────────────────────┐
│  All Requests.               🔄 │  ← Heading + refresh icon
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🔵Total  🟠Pend  🟢Appr  🔴Rej │  ← Summary bar
│  │   0        0       0       0  │     Colored dots before labels
│  │  reqs    reqs    reqs    reqs │
│  └──────────────────────────┘   │
│                                  │
│  🔍 Search by name, reason...   │  ← Search input
│                                  │
│  [All] [Pending] [Approved] [Re…│  ← Horizontal scroll filter pills
│                                  │
│  Leave Requests      0 results  │  ← Section header + count
│                                  │
│       No requests found          │  ← Empty state (centered text)
│                                  │
│  ─────────────────────────────  │
│  🗺  👥  💼  📋  ⚙️             │
│  Map Staff Work Leaves Settings  │
└─────────────────────────────────┘
```

**Key CSS patterns:**
- Summary bar: 4 columns, each with colored dot + label + bold number
- Filter pills: horizontal scroll, `border-radius: 9999px`
  - Active "All": outline style (border only, no fill)
  - Other pills: dark gray fill `~#374151`, white text
- Empty state: simple centered text, no illustration

---

### 7. Settings / Profile Screen

```
┌─────────────────────────────────┐
│  ┌──────────────────────────┐   │  ← Purple gradient header area
│  │                           │   │
│  │  Your Info.               │   │  ← Heading with amber period
│  │                           │   │
│  │  ┌────┐                   │   │  ← Large avatar circle (~80px)
│  │  │ 👤 │                   │   │     Gray placeholder with icon
│  │  └────┘                   │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🏢 Switch Firm          > │   │  ← Menu list items
│  ├──────────────────────────┤   │     Pattern: icon + label + chevron
│  │ 📋 Your Personal Details > │   │
│  ├──────────────────────────┤   │
│  │ 🏢 Company Details      > │   │
│  ├──────────────────────────┤   │
│  │ 🕐 Company Shifts       > │   │
│  ├──────────────────────────┤   │
│  │ 👥 Employee Categories  > │   │
│  ├──────────────────────────┤   │
│  │ ⚙️ Payroll Config       > │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Key CSS patterns:**
```css
/* Settings menu item */
.settings-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.settings-item-icon { width: 24px; opacity: 0.7; }
.settings-item-label { flex: 1; font-size: 16px; }
.settings-item-chevron { opacity: 0.5; }
```

---

### 8. Company Settings (Feature Toggles)

```
┌─────────────────────────────────┐
│  │ 📋 Payroll Template     > │  ← Navigation items (with chevron)
│  │ 👥 Designations & Perms > │
│  ├──────────────────────────┤
│  │ 📅 Leave System      🔵🔘│  ← Toggle items (with switch)
│  │ 👤 Face Attendance   🔵🔘│     ON = blue filled circle
│  │ 💰 Expense System    ⚪🔘│     OFF = gray
│  │ 📍 Geo Fencing       ⚪🔘│
│  │ 💵 Custom Salary     ⚪🔘│
│  │ 📊 Salary History    🔵🔘│
│  ├──────────────────────────┤
│  │ 📅 Holidays             > │
│  │ 📊 Reports              > │
│  ├──────────────────────────┤
│  │ 🔔 Staff Punch Notif  🔵🔘│  ← Toggle with description
│  │    Get notified about     │     Helper text below label
│  │    in/out of your staff   │
│  ├──────────────────────────┤
│  │ 💬 WhatsApp Report    🔵🔘│  ← Toggle with time display
│  │    Get daily attendance   │     "8:00 PM" shown
│  │    report...  8:00 PM     │
│  └──────────────────────────┘
└─────────────────────────────────┘
```

---

### 9. Invite & Logout Section

```
┌─────────────────────────────────┐
│  Invite Employees                │
│  ┌──────────────────────────┐   │
│  │ Company Code              │   │
│  │ OODD1           📋  🔗   │   │  ← Code + copy + share buttons
│  └──────────────────────────┘   │
│                                  │
│  │ 📋 View Logs            > │   │
│                                  │
│  ┌──────────────────────────┐   │
│  │        Logout            │   │  ← Red/destructive button
│  └──────────────────────────┘   │     Muted red background
└─────────────────────────────────┘
```

**Key CSS patterns:**
- Company code: large monospace font, dark card background
- Copy/share icons: inline buttons inside the card
- Logout: full-width, muted red background, red text

---

### 10. Map View

```
┌─────────────────────────────────┐
│  h. Trial            🔄  🧭   │  ← Mini logo + trial badge + controls
│                                  │
│  ┌──────────────────────────┐   │
│  │                           │   │
│  │      [Full Screen Map]    │   │  ← Leaflet/OSM map fills entire view
│  │       with employee       │   │
│  │       location pins       │   │
│  │                           │   │
│  └──────────────────────────┘   │
│                                  │
│  ─────────────────────────────  │
│  🗺  👥  💼  📋  ⚙️             │
│  Map Staff Work Leaves Settings  │
└─────────────────────────────────┘
```

---

## 🧱 Reusable Component Inventory

### Components We Need (mapped from screenshots)

| Component | Used In | Visual Reference |
|---|---|---|
| **Onboarding Carousel** | Login page | Slides 1-4 with dots |
| **Phone Input** | Login | 🇮🇳 +91 split input (adapt to email for us) |
| **Progress Steps** | Signup flow | 3-segment orange bar |
| **Selection Card** | Role picker | Employee vs Business with blue highlight |
| **Form Input** | Signup, settings | Rounded, tall, with focus border |
| **Password Input** | Signup | Input + eye toggle icon |
| **Stat Cell** | Dashboard | Colored left border + number + label |
| **Stat Grid** | Dashboard | 3-column grid of stat cells |
| **Greeting Header** | Dashboard | "Good morning**.**" with amber period |
| **Search Bar** | Dashboard, leaves | Rounded input with search icon + chevron |
| **Filter Pills** | Staff list, leaves | Horizontal scroll, pill-shaped buttons |
| **Bottom Nav** | All screens | 5 tabs, outline/filled icon states |
| **Settings Menu Item** | Settings | Icon + label + chevron/toggle |
| **Toggle Switch** | Settings | iOS-style, blue=on, gray=off |
| **Summary Bar** | Leaves | 4-col with colored dots + numbers |
| **Company Code Card** | Settings | Large code + copy + share |
| **FAB Button** | Dashboard | Floating + button, bottom-right |
| **Warning Banner** | Dashboard | Yellow bar, full-width, fixed above nav |
| **Empty State** | Lists | Centered "No data" text |
| **Avatar** | Profile, staff list | Circle with photo or placeholder icon |
| **Logout Button** | Settings | Full-width, destructive red |

---

## 📐 Layout Specifications

### Spacing
```
Page padding:           16-20px horizontal
Card padding:           16-20px
Input height:           48-52px
Button height:          48-52px (CTA), 36px (secondary)
Stat cell padding:      12-16px
Bottom nav height:      60-64px + safe-area
Settings item height:   56px
Gap between cards:      12-16px
Gap in stat grid:       8px
```

### Border Radius
```
Cards:                  12-16px
Inputs:                 12px
CTA Buttons:            12px
Filter pills:           9999px (full round)
Stat cells:             8px
Avatar:                 50% (circle)
Bottom nav icons:       12px (active background)
```

### Bottom Navigation Pattern
```css
.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 64px;
  background: var(--background);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted-foreground);
  cursor: pointer;
}

.bottom-nav-item.active {
  color: var(--primary);
}

.bottom-nav-item.active .nav-icon {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 12px;
  padding: 6px 16px;
}
```

### Stat Cell Pattern
```css
.stat-cell {
  position: relative;
  padding: 12px 12px 12px 16px;
  border-radius: 8px;
  border-left: 3px solid var(--stat-color);
  background: oklch(from var(--card) l c h / 0.5);
}
.stat-cell .stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--card-foreground);
}
.stat-cell .stat-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}
.stat-cell .stat-category {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 2px;
}
```

---

## 🔄 Adaptation Notes (MyHisaab → Our App)

| MyHisaab | Our Adaptation | v1 Status |
|---|---|---|
| Phone OTP login | Email/password login (same clean UI, different input) | ✅ DONE — owner.html + employee.html |
| 5-tab bottom nav (Map, Staff, Work, Leaves, Settings) | Same 5 tabs for owner; 5 tabs for employee (Punch, You, Work, Requests, Settings) | ✅ DONE — both navs built |
| "hisaab." branding | "Staff Management." branding with amber period | ✅ DONE |
| Trial mode banner | Not needed — our app is free | ✅ Removed |
| Face Attendance toggle | Selfie capture is mandatory (not toggleable) | ✅ DONE — always enforced |
| Geo Fencing toggle | Geofencing always on, configurable via modal | ✅ DONE — geofence modal in owner.html |
| Company code invite | Admin creates employee accounts from dashboard | ✅ DONE — `provisionEmployee()` |
| Dark dashboard theme | Dark theme on all dashboard/main screens | ✅ DONE |
| Orange progress bar | 3-segment progress bar on onboarding | ✅ DONE |
| Colored stat cells | 3×3+ grid with colored left borders | ✅ DONE — 12 stat cells |
| Settings menu pattern | Icon + label + chevron list items | ✅ DONE — owner + employee settings |
| Leave request screen | Pending/Approved/Rejected tabs + request form | 🔲 Placeholder UI only — no backend |
| Map view | Full-screen Leaflet map with employee pins + geofence circle | ✅ DONE |
| Staff roster cards | Employee cards with status, last punch, geofence distance | ✅ DONE |
| Payroll/salary toggles | Toggle UI exists in settings | 🔲 Placeholder UI only — no backend |
| WhatsApp report toggle | Toggle UI exists in settings | 🔲 Placeholder UI only — no backend |

---

## ✅ Design Checklist

- [x] Uses dark theme for dashboard/main screens
- [x] Uses light theme for onboarding/auth screens
- [x] Heading has branded colored period (amber "**.**")
- [x] Stat cells use colored left-border (not background fill)
- [ ] Interactive elements have focus-visible ring
- [x] Bottom nav uses outline icons (inactive) / filled icons (active)
- [x] Inputs are tall (48-52px), rounded (12px radius)
- [x] CTA buttons are full-width, blue, bottom of screen
- [ ] Filter pills are horizontally scrollable
- [x] Settings items follow icon + label + chevron pattern
- [x] Empty states have centered text
- [ ] Loading states use skeleton animation
- [x] Mobile-first: designed for 375px+ screens

---

<div align="center">
  <em>This document captures the complete visual language from MyHisaab reference screenshots.<br/>All designs will follow these patterns adapted for Staff Management PWA.</em>
</div>
