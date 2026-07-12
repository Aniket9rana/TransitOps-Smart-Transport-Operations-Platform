# TransitOps — Smart Transport Operations Platform

TransitOps is a fleet operations platform that replaces spreadsheets and manual logbooks with a single, role-aware system for vehicles, drivers, trip dispatch, maintenance, fuel/expenses, and analytics. Every operational rule — dispatch eligibility, capacity checks, automatic status transitions, cost roll-ups, and KPIs — lives in one place and is enforced on the server, so the numbers on the dashboard and the analytics reports are always computed from real records, never hardcoded.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions, Route Handlers) on React 19
- **Language:** TypeScript
- **Database:** SQLite via **Prisma 7** (better-sqlite3 driver adapter)
- **Auth:** JWT sessions signed with `jose` (HttpOnly cookie), bcrypt password hashing, failed-attempt lockout
- **UI:** Tailwind CSS v4, Base UI primitives, dark-mode-only design system with status/brand tokens
- **Charts:** Recharts · **PDF export:** jsPDF + jspdf-autotable · **Toasts:** Sonner

---

## Setup & Run

**Prerequisites:** Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root (see below)

# 3. Generate the Prisma client, create the SQLite schema, and seed demo data
npm run demo:reset

# 4. Start the dev server  ->  http://localhost:3000
npm run dev
```

**`.env`** (required — the app needs a DB URL and an auth secret):

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="change-me-to-any-long-random-string"
```

### Individual database commands

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate the Prisma client into `lib/generated/prisma` |
| `npm run db:push` | Create/sync the SQLite schema from `prisma/schema.prisma` |
| `npm run db:seed` | Wipe all rows and reseed the pristine demo dataset (idempotent) |
| **`npm run demo:reset`** | **One command** → generate + push + seed. Returns the app to a clean, fully-populated demo state. Safe to run mid-presentation. |

### Production build

```bash
npm run build && npm run start
```

---

## Demo Credentials

All four accounts share the password **`transit123`**.

| Role | Email | Sees in the sidebar |
| --- | --- | --- |
| **Fleet Manager** (Maya R.) | `maya.r@transitops.in` | Dashboard, Fleet, Drivers, Maintenance, **Analytics**, **Settings (edit)** |
| **Dispatcher** (Raven K.) | `raven.k@transitops.in` | Dashboard, Fleet (view), **Trips**, Maintenance (view), Settings (view) |
| **Safety Officer** (Sana O.) | `sana.o@transitops.in` | Dashboard, **Drivers**, Trips (view), Settings (view) |
| **Financial Analyst** (Farid A.) | `farid.a@transitops.in` | Dashboard, Fleet (view), Maintenance (view), **Fuel & Expenses**, **Analytics**, Settings (view) |

> The **Dashboard** is view-only for every role. **Analytics** is reachable only by Fleet Manager and Financial Analyst — Dispatcher and Safety Officer have no Analytics nav item and are redirected if they try the URL directly (enforced in `proxy.ts` middleware). **Settings** is visible to all but editable only by the Fleet Manager.

---

## 🏆 Judge Demo Script (the winning sequence)

### 1 — RBAC is real (log in as different roles)
- Log in as **Farid (Financial Analyst)** → sidebar shows **Analytics** + **Fuel & Expenses**, no Trips.
- Log out, log in as **Raven (Dispatcher)** → sidebar shows **Trips**, **no Analytics**. Paste `/analytics` in the URL → you're bounced back to the Dashboard. This is defense-in-depth: the nav is hidden *and* the server refuses.

### 2 — Trip lifecycle & automatic status transitions (as Dispatcher, Raven)
- Go to **Trips**. Create a trip and pick a heavy cargo weight that exceeds the vehicle's max load → **capacity-exceeded block** stops the dispatch with the exact overage.
- Fix the weight and **Dispatch** → the assigned **vehicle and driver both auto-flip to "On Trip"** (check the Fleet/Drivers screens).
- **Complete** the trip (enter final odometer + fuel) → vehicle and driver **flip back to "Available"**, a **FuelLog is written**, and the **odometer advances**.
- **Cancel** a different dispatched trip → its vehicle and driver are **restored to "Available"**.

### 3 — The double-assignment block (as Dispatcher)
- Create **two DRAFT trips that both select the same available vehicle**.
- Dispatch the first (vehicle → On Trip). Now dispatch the second → **blocked**: the vehicle is already on a trip. The re-check happens *inside the database transaction*, so two simultaneous dispatches can't both win the race.

### 4 — Maintenance removes a vehicle from the pool (as Fleet Manager, Maya)
- Go to **Maintenance**, open a service record for an available vehicle → its status becomes **"In Shop"**.
- Switch to **Trips** → that vehicle has **vanished from the dispatch selection pool** (In-Shop and Retired vehicles are never dispatchable). Close the record → it returns to Available.

### 5 — Live Dashboard, Analytics & exports (as Fleet Manager or Financial Analyst)
- **Dashboard:** 7 live KPIs computed from real data; an **amber license-expiry banner** ("driver license(s) expired or expiring soon" → links to Drivers, because John's license is expired). Change the **Vehicle Type / Status / Region** filters → the vehicle KPIs and the Vehicle-Status bars **recompute server-side** and the Recent Trips list re-scopes. **ETA** is derived, not stored.
- **Analytics:** 4 headline metric cards, a **Monthly Revenue** bar chart, **Top Costliest Vehicles** bars, and a sortable per-vehicle report. Click **Export CSV** (real `.csv` download) and **Export PDF** (real titled PDF with the headline KPIs + per-vehicle table).
- **Settings:** as Fleet Manager, change the **Depot Name** and Save → it immediately appears in the **top bar** (proof the setting is real). Log in as another role → the same form is **read-only**.

---

## Architecture — deliberate engineering

- **Single-source-of-truth rule libraries.** Every business rule is written once and imported everywhere:
  - `lib/permissions.ts` — the role→module RBAC matrix, `can()`, `visibleNavFor()`.
  - `lib/eligibility.ts` — vehicle/driver dispatch eligibility and block reasons.
  - `lib/trip-lifecycle.ts` — legal trip transitions, capacity check, derived ETA, dispatch re-validation.
  - `app/actions/maintenance.ts` — maintenance open/close and the vehicle-status side effects.
  - `lib/costs.ts` — operational cost (Fuel + Maintenance), revenue, and per-vehicle roll-ups.
  - `lib/metrics.ts` — **every dashboard and analytics KPI**, each with a documented formula. The Dashboard and Analytics screens import the *same* `dashboardKpis()`/utilization function, so overlapping numbers can never disagree.
- **Transaction-safe status transitions.** Dispatch/complete/cancel run inside `prisma.$transaction`, and eligibility is **re-validated inside the transaction** right before the write — so the "no double-assignment" and "capacity" invariants hold even under concurrent requests, not just at form-submit time.
- **Defense-in-depth RBAC.** The client hides what a role can't use (`visibleNavFor`), the `proxy.ts` middleware gates every route by module, and **every server mutation calls `requirePermission(...)` first** (including the CSV export route handler, which returns 403 without analytics access). Hiding a button is a convenience; the server check is the guarantee.
- **Read-derived analytics.** Phase 6 adds no schema. All KPIs, charts, and exports are computed live from existing Vehicle/Trip/Fuel/Maintenance/Expense records. The wireframe's sample numbers are illustrative; the app shows the real computed values.

---

## ✅ Mandatory Deliverables Checklist

| Deliverable | Where it's implemented |
| --- | --- |
| **Responsive web interface** | Dark-mode design system (`app/globals.css`); app shell `app/(app)/layout.tsx` with collapsible mobile drawer (`components/layout/mobile-nav.tsx`); tables scroll horizontally (`components/ui/table.tsx`); responsive KPI grids. |
| **Authentication with RBAC** | JWT sessions (`lib/session.ts`), login + lockout (`app/actions/auth.ts`, `app/login/`), permission matrix + guards (`lib/permissions.ts`, `lib/rbac.ts`), route middleware (`proxy.ts`). |
| **CRUD — Vehicles & Drivers** | `app/(app)/fleet/*` + `app/actions/vehicles.ts`; `app/(app)/drivers/*` + `app/actions/drivers.ts`. |
| **Trip Management with validations** | `app/(app)/trips/*` + `app/actions/trips.ts`; rules in `lib/eligibility.ts` + `lib/trip-lifecycle.ts` (capacity, eligibility, double-assignment). |
| **Automatic status transitions** | In-transaction status flips on dispatch/complete/cancel (`app/actions/trips.ts`) and maintenance open/close (`app/actions/maintenance.ts`). |
| **Maintenance workflow** | `app/(app)/maintenance/*` + `app/actions/maintenance.ts` — vehicle → In Shop and removed from dispatch pool; close → Available. |
| **Fuel & Expense tracking** | `app/(app)/expenses/*` + `app/actions/expenses.ts`; cost roll-ups in `lib/costs.ts`. |
| **Dashboard with KPIs** | `app/(app)/dashboard/page.tsx` — 7 KPIs, filters, recent trips, vehicle-status bars, license banner; formulas in `lib/metrics.ts`. |
| **Charts & visual analytics** | `app/(app)/analytics/page.tsx` — Recharts Monthly Revenue chart (`revenue-chart.tsx`) + costliest-vehicle bars (`costliest-vehicles.tsx`). |
| **CSV export** | Route handler `app/(app)/analytics/export/csv/route.ts` (RBAC-guarded, `text/csv` download) triggered by `export-buttons.tsx`. |
| **PDF export** | jsPDF + jspdf-autotable in `app/(app)/analytics/export-buttons.tsx` — titled "TransitOps — Fleet Report" with headline KPIs + per-vehicle table. |

### Bonus features delivered
Charts & visual analytics · PDF export · **in-app license-expiry reminder** (the email-reminder bonus, done in-app as a dashboard banner) · advanced search, filters, and **click-to-sort** on Fleet / Drivers / Analytics tables · **dark mode** (intentional, app-wide) · loading skeletons and friendly empty states throughout.

---

## Project Structure

```
app/
  (app)/                      # authenticated shell (sidebar + topbar)
    dashboard/                # Screen 1 — live KPIs, filters, recent trips, status bars, license banner
    analytics/                # Screen 7 — KPIs, charts, sortable report
      export/csv/route.ts     #   real CSV download (RBAC-guarded)
    fleet/  drivers/  trips/  maintenance/  expenses/  settings/
    layout.tsx  loading.tsx (per route)
  actions/                    # server actions (auth, vehicles, drivers, trips, maintenance, expenses, settings)
  icon.tsx                    # generated favicon (amber "T")
  login/  layout.tsx  globals.css
components/                   # kpi-card, status-badge, data-table-sort, page-skeleton, layout/*, ui/*
lib/                          # permissions, rbac, session, eligibility, trip-lifecycle, maintenance,
                              # costs, metrics, org-settings, format, status, prisma
prisma/                       # schema.prisma, seed.ts, migrations
proxy.ts                      # Next.js 16 middleware (route-level RBAC)
```

## Troubleshooting

- **`AUTH_SECRET environment variable is not set`** → create `.env` (see Setup) and restart the dev server.
- **Empty dashboard / analytics** → run `npm run demo:reset` to (re)create and seed the database.
- **Vehicle/driver missing from dispatch** → it's On Trip, In Shop, or Retired, or the driver's license expired/suspended — by design (`lib/eligibility.ts`).

---

**Built for smarter transport operations.**
