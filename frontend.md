# 🎨 Frontend Design System — Staff Management PWA

> Design principles and CSS patterns extracted from [shadcn/ui](https://github.com/shadcn-ui/ui), adapted for Vanilla HTML/CSS/JS.
> **This file is the single source of truth for all frontend design decisions.**

---

## 🏛️ Core Philosophy (from shadcn/ui)

1. **Semantic Token System** — Never use raw colors. Every color is a CSS variable with semantic meaning.
2. **Background + Foreground Pairs** — Every surface has a paired text color (e.g., `--primary` + `--primary-foreground`).
3. **Consistent Radius Scale** — One `--radius` base value generates the entire scale.
4. **Dark Mode via Token Override** — Same token names, different values under `.dark` selector.
5. **Accessible by Default** — Focus rings, ARIA attributes, disabled states on every interactive element.
6. **Variant Pattern** — Components have named variants (default, destructive, outline, secondary, ghost).
7. **Data Attributes** — Use `data-slot`, `data-variant`, `data-size` for styling hooks and debugging.

---

## 🎨 Color System (OKLCH — shadcn/ui Standard)

We use OKLCH color space (perceptually uniform) exactly as shadcn/ui does.

```css
:root {
  /* ── Base ── */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* ── Cards & Surfaces ── */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* ── Primary Action (brand color) ── */
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);

  /* ── Secondary ── */
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  /* ── Muted (disabled, placeholders) ── */
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);

  /* ── Accent (hover states) ── */
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);

  /* ── Destructive (errors, delete) ── */
  --destructive: oklch(0.577 0.245 27.325);

  /* ── Borders & Inputs ── */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  /* ── Chart Colors ── */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* ── Status Colors (custom for attendance) ── */
  --success: oklch(0.55 0.18 145);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
  --info: oklch(0.55 0.15 250);
  --info-foreground: oklch(0.985 0 0);

  /* ── Radius Scale (from single base) ── */
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);

  /* ── Shadows ── */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* ── Typography ── */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── Transitions ── */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Spacing (8px grid) ── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
```

### Dark Mode Overrides

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --success: oklch(0.65 0.2 145);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
  --info: oklch(0.488 0.243 264.376);
  --info-foreground: oklch(0.985 0 0);
}
```

---

## 🧩 Component Patterns (Vanilla CSS equivalents of shadcn/ui)

### Button Variants

```css
/* Base button — matches shadcn Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition-fast);
  outline: none;
  cursor: pointer;
  border: 1px solid transparent;
  /* Default size */
  height: 2.25rem; /* h-9 */
  padding: 0.5rem 1rem;
}

.btn:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px oklch(from var(--ring) l c h / 0.5);
}

.btn:disabled {
  pointer-events: none;
  opacity: 0.5;
}

/* Variants */
.btn-default       { background: var(--primary); color: var(--primary-foreground); }
.btn-default:hover  { opacity: 0.9; }

.btn-destructive       { background: var(--destructive); color: white; }
.btn-destructive:hover  { opacity: 0.9; }

.btn-outline {
  border-color: var(--border);
  background: var(--background);
  box-shadow: var(--shadow-xs);
}
.btn-outline:hover { background: var(--accent); color: var(--accent-foreground); }

.btn-secondary       { background: var(--secondary); color: var(--secondary-foreground); }
.btn-secondary:hover  { opacity: 0.8; }

.btn-ghost           { background: transparent; color: var(--foreground); }
.btn-ghost:hover      { background: var(--accent); color: var(--accent-foreground); }

.btn-link { background: transparent; color: var(--primary); text-decoration-offset: 4px; }
.btn-link:hover { text-decoration: underline; }

/* Sizes */
.btn-xs { height: 1.5rem; padding: 0 0.5rem; font-size: 0.75rem; gap: 0.25rem; border-radius: var(--radius-md); }
.btn-sm { height: 2rem; padding: 0 0.75rem; gap: 0.375rem; }
.btn-lg { height: 2.5rem; padding: 0 1.5rem; }
.btn-icon { width: 2.25rem; height: 2.25rem; padding: 0; }
```

### Card

```css
/* Matches shadcn Card */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  padding: var(--space-6) 0;
  box-shadow: var(--shadow-sm);
}
.card-header { padding: 0 var(--space-6); display: grid; gap: var(--space-2); }
.card-title  { font-weight: 600; line-height: 1; }
.card-description { font-size: 0.875rem; color: var(--muted-foreground); }
.card-content { padding: 0 var(--space-6); }
.card-footer  { display: flex; align-items: center; padding: 0 var(--space-6); }
```

### Input

```css
/* Matches shadcn Input */
.input {
  height: 2.25rem;
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--input);
  background: transparent;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  box-shadow: var(--shadow-xs);
  transition: color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  color: var(--foreground);
}
.input::placeholder { color: var(--muted-foreground); }
.input:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px oklch(from var(--ring) l c h / 0.5);
}
.input:disabled { pointer-events: none; cursor: not-allowed; opacity: 0.5; }
.input[aria-invalid="true"] {
  border-color: var(--destructive);
  box-shadow: 0 0 0 3px oklch(from var(--destructive) l c h / 0.2);
}
```

### Badge

```css
/* Matches shadcn Badge */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: color var(--transition-fast), box-shadow var(--transition-fast);
}
.badge-default     { background: var(--primary); color: var(--primary-foreground); }
.badge-secondary   { background: var(--secondary); color: var(--secondary-foreground); }
.badge-destructive { background: var(--destructive); color: white; }
.badge-outline     { border-color: var(--border); color: var(--foreground); background: transparent; }
.badge-success     { background: var(--success); color: var(--success-foreground); }
.badge-warning     { background: var(--warning); color: var(--warning-foreground); }
```

### Avatar

```css
/* Matches shadcn Avatar */
.avatar {
  position: relative;
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 9999px;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 0.875rem;
  font-weight: 500;
}
.avatar-sm { width: 2rem; height: 2rem; }
.avatar-lg { width: 3rem; height: 3rem; }
.avatar-xl { width: 4rem; height: 4rem; }
```

### Skeleton (Loading State)

```css
/* Matches shadcn Skeleton */
.skeleton {
  border-radius: var(--radius-md);
  background: var(--muted);
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Alert / Toast

```css
.alert {
  position: relative;
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-4);
  font-size: 0.875rem;
  display: grid;
  grid-template-columns: 0 1fr;
  gap: var(--space-2);
}
.alert-destructive { border-color: var(--destructive); color: var(--destructive); }
.alert-success { border-color: var(--success); color: var(--success); }
.alert-title { font-weight: 500; line-height: 1; letter-spacing: -0.01em; }
.alert-description { font-size: 0.875rem; opacity: 0.9; }
```

### Tabs (Bottom Nav for Mobile)

```css
.tabs {
  display: flex;
  width: 100%;
}
.tab-list {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: var(--muted);
  padding: var(--space-1);
  gap: var(--space-1);
  color: var(--muted-foreground);
}
.tab-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  outline: none;
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
}
.tab-trigger:hover { color: var(--foreground); }
.tab-trigger[data-state="active"],
.tab-trigger.active {
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--shadow-sm);
}
```

### Dialog / Modal

```css
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: oklch(0 0 0 / 0.8);
  animation: overlay-in var(--transition-base);
}
.dialog-content {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 50;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 32rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--background);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  animation: dialog-in var(--transition-base);
}
.dialog-header { display: flex; flex-direction: column; gap: var(--space-2); text-align: center; }
.dialog-title  { font-size: 1.125rem; font-weight: 600; }
.dialog-description { font-size: 0.875rem; color: var(--muted-foreground); }
.dialog-footer { display: flex; justify-content: flex-end; gap: var(--space-2); }

/* Mobile: dialog becomes bottom sheet */
@media (max-width: 640px) {
  .dialog-content {
    top: auto;
    bottom: 0;
    left: 0;
    transform: none;
    max-width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    animation: sheet-in var(--transition-slow);
  }
}

@keyframes overlay-in { from { opacity: 0; } }
@keyframes dialog-in { from { opacity: 0; transform: translate(-50%, -48%) scale(0.95); } }
@keyframes sheet-in  { from { transform: translateY(100%); } }
```

### Progress Bar

```css
.progress {
  position: relative;
  height: 0.75rem;
  width: 100%;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--secondary);
}
.progress-indicator {
  height: 100%;
  width: 0%;
  border-radius: 9999px;
  background: var(--primary);
  transition: width var(--transition-slow);
}
```

### Switch / Toggle

```css
.switch {
  position: relative;
  display: inline-flex;
  height: 1.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 9999px;
  border: 2px solid transparent;
  background: var(--input);
  transition: all var(--transition-fast);
}
.switch[data-state="checked"] { background: var(--primary); }
.switch-thumb {
  pointer-events: none;
  display: block;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  background: var(--background);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
  transform: translateX(0);
}
.switch[data-state="checked"] .switch-thumb { transform: translateX(1rem); }
```

---

## 📐 Layout Rules

### Mobile-First Responsive Breakpoints
```css
/* Base: Mobile (< 640px) — design for phone first */
/* sm: 640px — large phones / small tablets */
/* md: 768px — tablets */
/* lg: 1024px — desktop */
/* xl: 1280px — large desktop */

@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Page Layout Pattern
```css
/* Full-height app layout for PWA */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh; /* dynamic viewport height for mobile */
  background: var(--background);
  color: var(--foreground);
}
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid var(--border);
  background: oklch(from var(--background) l c h / 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: var(--space-3) var(--space-4);
}
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}
.app-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  border-top: 1px solid var(--border);
  background: oklch(from var(--background) l c h / 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: var(--space-2) var(--space-4);
  padding-bottom: env(safe-area-inset-bottom, var(--space-2));
}
```

---

## 🔤 Typography Scale

```css
/* Font loading */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.text-xs   { font-size: 0.75rem; line-height: 1rem; }
.text-sm   { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg   { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl   { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl  { font-size: 1.5rem; line-height: 2rem; }
.text-3xl  { font-size: 1.875rem; line-height: 2.25rem; }

.font-medium   { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold     { font-weight: 700; }

.text-muted { color: var(--muted-foreground); }
```

---

## ✅ Mandatory Rules (MUST follow for every component)

### Rule 1: Semantic Tokens Only
```css
/* ❌ NEVER */
color: #333;
background: rgb(240, 240, 240);
border: 1px solid gray;

/* ✅ ALWAYS */
color: var(--foreground);
background: var(--card);
border: 1px solid var(--border);
```

### Rule 2: Focus Visible Ring on All Interactive Elements
```css
/* Every button, input, link, interactive element MUST have: */
.interactive:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px oklch(from var(--ring) l c h / 0.5);
  outline: none;
}
```

### Rule 3: Data Attributes for Component Identification
```html
<!-- Every component gets a data-slot attribute -->
<button data-slot="button" data-variant="default">Click</button>
<div data-slot="card">...</div>
<input data-slot="input" />
```

### Rule 4: Transition on All Interactive State Changes
```css
/* Every hover/focus/active state MUST have a transition */
transition: all var(--transition-fast);
/* or for specific properties: */
transition: color var(--transition-fast), box-shadow var(--transition-fast);
```

### Rule 5: Disabled State Pattern
```css
/* All interactive elements when disabled: */
.element:disabled,
.element[aria-disabled="true"] {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Rule 6: Error/Invalid State Pattern
```css
.element[aria-invalid="true"] {
  border-color: var(--destructive);
  box-shadow: 0 0 0 3px oklch(from var(--destructive) l c h / 0.2);
}
```

### Rule 7: Dark Mode Compatibility
```css
/* All components must work with .dark class on <html> */
/* Never hardcode light-only or dark-only colors */
/* The token system handles both automatically */
```

### Rule 8: Mobile-First + Safe Areas
```css
/* All fixed elements must respect iOS safe areas */
padding-bottom: env(safe-area-inset-bottom, 0);
padding-top: env(safe-area-inset-top, 0);
```

---

## 🧱 Components Needed for Staff Management

| Component | Where Used | shadcn Equivalent |
|---|---|---|
| **Button** | Clock-in, login, export, actions | Button (6 variants + 4 sizes) |
| **Card** | Dashboard stats, employee cards | Card |
| **Input** | Login form, settings, search | Input |
| **Badge** | Present/Absent/Late status | Badge |
| **Avatar** | Employee photos, selfie thumbnails | Avatar |
| **Dialog/Modal** | Camera capture, confirmations | Dialog (bottom sheet on mobile) |
| **Tabs** | Bottom navigation (employee), top tabs (admin) | Tabs |
| **Alert** | Offline notice, geofence warning | Alert |
| **Skeleton** | Loading states for dashboard | Skeleton |
| **Progress** | GPS accuracy, upload progress | Progress |
| **Switch** | Settings toggles, dark mode | Switch |
| **Table** | Attendance history, staff list | Table |
| **Toast** | Success/error notifications | Sonner/Toast |
| **Empty State** | No records, no data | Empty |
| **Spinner** | Loading actions | Spinner |

---

## 🎬 Animation Library

```css
/* Fade in (for page transitions) */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up (for bottom sheets, toasts) */
@keyframes slide-up {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale in (for modals, cards appearing) */
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Pulse (for recording indicator, GPS scanning) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Spin (for loading spinners) */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Slide in from bottom (for mobile bottom sheet) */
@keyframes sheet-slide-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Utility classes */
.animate-fade-in  { animation: fade-in var(--transition-base); }
.animate-slide-up { animation: slide-up var(--transition-base); }
.animate-scale-in { animation: scale-in var(--transition-base); }
.animate-pulse    { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-spin     { animation: spin 1s linear infinite; }
```

---

## 📋 Checklist Before Writing Any Component

- [ ] Uses only CSS variables from the token system (no raw colors)
- [ ] Has `data-slot` attribute for identification
- [ ] Has `:focus-visible` ring on interactive elements
- [ ] Has `:disabled` / `[aria-disabled]` styling
- [ ] Has `[aria-invalid]` styling for form elements
- [ ] Has smooth transitions on all state changes
- [ ] Works in both light and dark mode
- [ ] Mobile-first responsive design
- [ ] Respects safe-area-inset for fixed elements on mobile
- [ ] Uses Inter font from Google Fonts
- [ ] Loading states use Skeleton pattern
- [ ] Error states use destructive color token

---

<div align="center">
  <em>Reference: <a href="https://github.com/shadcn-ui/ui">shadcn/ui</a> — adapted for Vanilla HTML/CSS/JS</em>
</div>
