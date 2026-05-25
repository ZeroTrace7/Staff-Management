# 🔍 Competitor Analysis — PresenTrak by DZAB SOFT PVT LTD

> Deep analysis of PresenTrak's features, pricing, architecture, and business model.
> Source: Proposal PDF (dated 07/05/2025) + website research + market analysis.

---

## 🏢 Company Profile

| Field | Details |
|---|---|
| **Product Name** | PresenTrak |
| **Company** | DZAB SOFT PVT LTD |
| **Founded** | Jaipur, Rajasthan, India |
| **Office** | C-304, Cine Star, Central Spine, Vidhyadhar Nagar, Jaipur 302039 |
| **Second Office** | Office No. 135-136-137, 1st Floor, ARG North Avenue, Opp Krishi Mandi, Sikar Road, VKI, Jaipur 302039 |
| **Website** | [presentrak.com](https://www.presentrak.com) |
| **Parent Website** | [dzabsoft.com](https://www.dzabsoft.com) |
| **Contact** | sales@presentrak.com, +91-9257041758 |
| **Sales Contact** | Hamlata Mahicha — +91 92518 35993 |
| **ERP Login** | [erp.presentrak.com](https://erp.presentrak.com/) |
| **Target Market** | Small & Medium Businesses in India |
| **Positioning** | "Affordable attendance + payroll software for Indian SMBs" |

---

## 📋 Proposal Details (from PDF)

| Field | Details |
|---|---|
| **Proposal For** | Mr. Arvind Gupta (7020848061) |
| **Date** | 07/05/2025 |
| **Plan** | 1 to 10 Users |
| **Duration** | 1 Year |
| **MRP** | ₹4,999/year |
| **Discounted** | ₹1,999/year (60% off) |
| **GST (18%)** | ₹360 |
| **Total** | **₹2,359/year** (for up to 10 employees) |
| **Payment** | Bank transfer to IndusInd Bank — DZAB SOFT PVT LTD |

---

## 💰 Full Pricing Tiers (from Website)

| Plan | Users | Price/Year | Per User/Month |
|---|---|---|---|
| **Starter** | 1–10 | ₹4,999 (₹1,999 discounted) | ~₹17/user/month |
| **Business** | 11–50 | ₹9,999 | ~₹17/user/month |
| **Corporate** | 51–100 | ₹14,999 | ~₹12/user/month |
| **Custom** | 100+ | Contact sales | Custom |

> **Analysis:** Even at discounted price, they charge ₹2,359/year for 10 users.
> **Our app: ₹0/year forever.** This is our single biggest competitive advantage.

### Features Included in ALL Plans
- ✅ Digital Attendance / Punch-in
- ✅ Flexible Shifts
- ✅ Live Geo-Tracking & Tagging
- ✅ Digital Payslips
- ✅ Attendance Reports
- ✅ Employee Leave Management
- ✅ Admin Monitoring
- ✅ Employee Onboarding
- ✅ Employee Database Management
- ✅ Allowances & Deductions Management

---

## 🧩 Complete Feature Breakdown

### Module 1: Attendance Management
| Feature | Description | Our Equivalent |
|---|---|---|
| GPS-based mobile check-in/out | Employees mark attendance from phone with location | ✅ v1 — GPS mandatory clock-in |
| Biometric integration | Fingerprint/hardware scanner support | ❌ Skip — needs hardware, not PWA-compatible |
| Facial recognition | AI face matching at check-in | ❌ Skip v1 — we use selfie photo instead |
| Kiosk attendance | Tablet/kiosk at office entry | ❌ Skip — over-engineered for 10 employees |
| Real-time monitoring | Live dashboard of who's present/absent | ✅ v1 — Supabase Realtime |
| Late entry tracking | Auto-flag if employee clocks in after shift start | ✅ v1 — compare timestamp vs `work_start_time` |
| Overtime calculation | Track hours beyond shift end | 📋 v2 |
| Working hours calculation | Auto-calculate daily/weekly/monthly hours | ✅ v1 — clock_in minus clock_out |

### Module 2: Leave & Shift Scheduling
| Feature | Description | Our Equivalent |
|---|---|---|
| Smart leave tracking | Digital leave requests with balance tracking | 📋 v2 |
| Approval workflows | Manager approves/rejects leave requests | 📋 v2 |
| Shift assignments | Create and assign shifts to employees | 📋 v2 |
| Holiday calendar | Company-wide holiday configuration | 📋 v2 |
| Weekly offs management | Configure which days are off | 📋 v2 |

### Module 3: Payroll Integration
| Feature | Description | Our Equivalent |
|---|---|---|
| Auto-calculated attendance reports | Attendance → salary-ready reports | 📋 v2 — CSV export first |
| Digital payslips | Employee salary slips generated automatically | 💡 v3 |
| Allowances & deductions | Configure salary components | 💡 v3 |
| Salary processing | One-click payroll based on attendance | 💡 v3 |

### Module 4: Dashboard & Reports
| Feature | Description | Our Equivalent |
|---|---|---|
| Detailed attendance summaries | Daily/weekly/monthly reports | ✅ v1 — admin dashboard |
| Analytics & insights | Attendance trends, patterns | 📋 v2 |
| Exportable reports (Excel/PDF) | Download reports in Excel or PDF | ✅ v1 — CSV export |
| Real-time analytics | Live workforce data | ✅ v1 — Supabase Realtime |

### Module 5: Employee Self-Service
| Feature | Description | Our Equivalent |
|---|---|---|
| Employee/parent login portal | View own attendance and notifications | ✅ v1 — employee dashboard |
| View attendance history | Calendar view of past attendance | ✅ v1 |
| View payslips | Access salary slips | 💡 v3 |
| Apply for leave | Digital leave request | 📋 v2 |

### Module 6: Platform & Infrastructure
| Feature | Description | Our Equivalent |
|---|---|---|
| Mobile app (Android/iOS) | Native mobile app | ✅ v1 — PWA (installable, no app store) |
| Web access | Browser-based dashboard | ✅ v1 — Vercel hosted |
| Cloud-based | Hosted on cloud servers | ✅ v1 — Supabase cloud |
| Encrypted data storage | Secure cloud storage | ✅ v1 — Supabase RLS + HTTPS |
| Automated backups | Regular data backups | ✅ Supabase handles this (free tier) |
| Multi-location support | Track across branches | 💡 v3 |

### Module 7: Customization
| Feature | Description | Our Equivalent |
|---|---|---|
| Organization logo | Custom branding | 📋 v2 |
| Domain customization | Custom URL/domain | ✅ v1 — Vercel custom domain (free) |
| Theme customization | Colors/branding | 📋 v2 — CSS variables make this easy |

### Module 8: Employee Live Tracking
| Feature | Description | Our Equivalent |
|---|---|---|
| Live GPS tracking | Real-time employee location on map | ✅ v1 — last known location logging |
| Geo-tagging | Location tagged to every action | ✅ v1 — lat/lng on every clock-in |
| Route tracking | Track employee movement path | 💡 v3 — needs `location_pings` |

---

## 🔧 Implementation Process (from PDF)

PresenTrak's onboarding process:

| Step | What They Do | What We Do |
|---|---|---|
| 1. Requirement Collection | Understand user structure, reporting needs | ❌ Not needed — self-serve setup |
| 2. Configuration | Set up departments, shifts, attendance rules | ✅ Admin onboarding flow — set company name, geofence, work hours |
| 3. Training | Online or on-site training for users/admins | ❌ Not needed — intuitive UI, zero training |
| 4. Go-Live | Final testing and deployment | ✅ Deploy to Vercel, share URL via WhatsApp |
| 5. Support | Ongoing technical and functional support | ❌ Self-serve — no support overhead |

> **Key insight:** They need 5 implementation steps because their software is complex.
> Our PWA is designed to be so simple that it needs zero training.

---

## 📞 Support & Service (from PDF)

| Service | What They Offer | Our Approach |
|---|---|---|
| Email support | During business hours | ❌ No support team needed (10 users) |
| Call support | During business hours | ❌ Owner IS the admin |
| WhatsApp support | During business hours | ❌ Not needed |
| Regular updates | Performance + new features | ✅ Git push → Vercel auto-deploys |
| Data security | Encrypted cloud, restricted access | ✅ Supabase RLS + HTTPS by default |

---

## 🎯 Target Industries (from Website)

PresenTrak targets these sectors:
1. 🏢 Company Offices
2. 🏪 Retail Businesses, Showrooms and Shops
3. 🏫 Schools, Colleges and Educational Institutions
4. 🏨 Hotels, Resorts, Cafés, Bars & Restaurants
5. 🏥 Hospitals, Clinics, Labs and Medical Stores
6. 🚗 Field Service / Marketing Based Companies
7. 🏭 Factories & Manufacturing Units
8. 📊 Small and Medium Enterprises (SMEs)

> **Our focus:** Single office small business (Sun Associates) — we don't need multi-industry flexibility.

---

## ⚔️ Head-to-Head Comparison

| Dimension | PresenTrak | Our App (Staff Management PWA) |
|---|---|---|
| **Cost** | ₹2,359/year (10 users) | **₹0/year forever** |
| **Platform** | Native app (Android/iOS) + Web | PWA (works like native, no app store) |
| **Setup Time** | 5-step implementation + training | Share URL → done in 2 minutes |
| **GPS Tracking** | ✅ GPS check-in + live tracking | ✅ GPS mandatory + last known location |
| **Biometric** | ✅ Fingerprint + face recognition | ❌ Selfie photo (simpler, no hardware) |
| **Payroll** | ✅ Full payroll + payslips | ❌ v3 (CSV export in v1) |
| **Leave Management** | ✅ Full system | ❌ v2 |
| **Shifts** | ✅ Flexible shift management | ❌ v2 |
| **Reports** | ✅ Excel + PDF | ✅ CSV export |
| **Offline** | ❓ Unknown | ✅ Full offline-first with sync |
| **Anti-Spoofing** | ❓ Not mentioned | ✅ Jitter + teleport + consistency |
| **Map View** | ✅ Live tracking | ✅ Leaflet.js + last known location |
| **Selfie Proof** | ❓ Not mentioned (they use biometric) | ✅ Selfie captured at every clock-in |
| **Support** | Email + Call + WhatsApp | Self-serve (no overhead) |
| **Scalability** | 10 to 100+ users | 10-20 users (by design) |
| **Backend** | Custom ERP (erp.presentrak.com) | Supabase (free tier) |
| **Deployment** | Their servers | Vercel (free) |
| **Custom Domain** | ❓ Likely paid add-on | ✅ Free via Vercel |

---

## 🏆 Where We Win

| Advantage | Why It Matters |
|---|---|
| **₹0 cost vs ₹2,359/year** | For a 10-person office, saving ₹2,359/year is significant |
| **Zero setup** | No 5-step implementation, no training calls |
| **Offline-first** | PresenTrak doesn't mention offline support — we're built for it |
| **Anti-spoofing** | They don't advertise any fake GPS detection — we have 3-layer system |
| **Selfie proof** | Visual proof at every clock-in (they rely on biometrics which need hardware) |
| **No app store** | PWA installs instantly from URL — no Play Store listing needed |
| **Open source** | Owner has full control — no vendor lock-in |

## ⚠️ Where They Win (and our plan to catch up)

| Their Advantage | Why It Matters | Our Plan |
|---|---|---|
| **Full payroll** | One-click salary processing | v3 — CSV export covers 80% for now |
| **Leave management** | Digital leave requests + approvals | v2 — planned |
| **Shift management** | Multiple shifts, rotation | v2 — planned |
| **Facial recognition** | Tamper-proof biometric | v3 — selfie is good enough for 10 people |
| **Multi-location** | Track across branches | v3 — single office for now |
| **Kiosk mode** | Office entry point tablet | ❌ Skip — unnecessary for 10 employees |
| **Dedicated support** | Help when things break | Self-serve design eliminates this need |
| **Native app** | Better OS integration | PWA covers 95% of native app features |

---

## 💡 Features We Should Adopt (Priority Order)

### Immediate (add to v1 scope if possible)
1. ✅ **Working hours calculation** — clock_out minus clock_in = hours worked per day
2. ✅ **Late entry flagging** — compare clock-in time vs `work_start_time`

### v2 (next update)
3. 📋 **Leave management** — apply, approve, balance tracking
4. 📋 **Shift management** — create shifts, assign employees
5. 📋 **Digital payslips** — generate PDF salary slips
6. 📋 **Overtime calculation** — hours beyond shift end
7. 📋 **Custom branding** — company logo, theme colors

### v3 (future)
8. 💡 **Full payroll integration** — allowances, deductions, tax
9. 💡 **Multi-location** — multiple offices
10. 💡 **Route tracking** — employee movement history

---

## 🔑 Key Business Intelligence

### Their Weaknesses (opportunities for us)
1. **No offline mode mentioned** — field employees with poor internet can't use it
2. **No anti-spoofing mentioned** — mock GPS apps could fool their system
3. **Paid product** — any free alternative with core features is immediately attractive
4. **Complex setup** — 5-step implementation is a barrier for small businesses
5. **No selfie verification** — they rely on biometrics which needs hardware investment
6. **Vendor lock-in** — if they shut down, all your data is gone (our app is self-hosted)

### Their Strengths (things we must respect)
1. **Complete payroll** — salary processing is a real need we'll eventually address
2. **Established product** — they have a working product with real customers
3. **Support team** — for non-technical business owners, support matters
4. **ERP system** — their backend (erp.presentrak.com) is a full enterprise system

---

## 📊 Market Positioning

```
                        FEATURES →
                   Basic                          Full Suite
              ┌─────────────────────────────────────────────┐
    FREE   │  ★ OUR APP                                    │
              │  (v1)                                         │
              │                                               │
              │           ★ OUR APP                           │
   COST       │           (v2-v3)                              │
    ↓         │                                               │
              │                                               │
              │                    ★ PresenTrak               │
   ₹2,359/yr  │                    (₹2,359/yr)                │
              │                                               │
              │                              ★ MyHisaab       │
   ₹5,000+/yr │                              (Full HRMS)      │
              │                                               │
              │                                  ★ Keka/greytHR│
   ₹50,000+/yr│                                  (Enterprise)  │
              └─────────────────────────────────────────────┘
```

**Our position:** Maximum value at zero cost. As we add v2-v3 features, we move right on the feature axis while staying at ₹0 on the cost axis.

---

<div align="center">
  <em>Document created from PresenTrak proposal PDF (07/05/2025) + website research (presentrak.com) + market analysis.</em>
</div>
