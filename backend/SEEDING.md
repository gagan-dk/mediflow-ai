# MediFlow Database Seeding

This document describes how to seed the MediFlow database with the operational
demo data that previously lived as hardcoded records in the React frontend, how
many records to expect, and how to interpret the post-seed verification results.

## Source of the seed data

All records below were copied **exactly** from the existing frontend demo data —
no names or operational values were invented or silently changed.

| Source file | Records used |
|---|---|
| `src/services/mockData.ts` (`INITIAL_HOSPITALS`) | 6 hospitals |
| `src/services/mockData.ts` (`INITIAL_DOCTORS`) | 5 doctors |
| `src/services/mockData.ts` (`INITIAL_ROOMS`) | 6 rooms |
| `src/services/mockData.ts` (`INITIAL_AMBULANCES`) | 5 ambulances |
| `src/services/mockData.ts` (ICU capacity per hospital) | 6 ICU units |
| `src/services/mockData.ts` (ER capacity per hospital) | 6 emergency rooms |
| `src/services/mockData.ts` (queue / operational metrics per hospital) | 6 hospital operations |
| `src/context/AppContext.tsx` (`DEMO_CREDENTIALS`) | 3 demo users |
| `src/context/AppContext.tsx` (staff profile) | 1 staff assignment |
| `src/context/AppContext.tsx` (patient profile) | 1 patient profile |

Real geographic discovery (Geoapify / LocationIQ) is intentionally **not**
seeded — the seed contains only MediFlow's curated operational records. Fresh
map-discovered hospitals are kept separate and matched at runtime by
`hospitalDiscoveryService` / `hospitalService`.

## Seed command

Run from the `backend/` directory with the virtualenv active:

```powershell
# Idempotent seed + verification (safe to run repeatedly)
.\.venv\Scripts\python.exe -m app.seed.seed_database

# Drop all seeded data first, then re-seed + verify
# (requires --confirm-drop AND DEBUG=true or MEDIFLOW_ALLOW_DROP=1)
.\.venv\Scripts\python.exe -m app.seed.seed_database --drop --confirm-drop
```

The script reads `DATABASE_URL` from `.env` (default
`postgresql+psycopg://mediflow:mediflow@localhost:5432/mediflow`). It also
supports a SQLite URL (e.g. `sqlite:///test_scratch.db`) for local testing.

### Demo account passwords

Demo passwords are **never taken from committed constants**. They are resolved
at seed time, in priority order:

1. `MEDIFLOW_SEED_PASSWORD` — password for all demo accounts
   (`patient@mediflow.ai`, `staff@mediflow.ai`, `admin@mediflow.ai`).
2. `MEDIFLOW_SEED_ADMIN_PASSWORD` — overrides the ADMIN account only
   (strongly recommended so the admin password differs from the demo users).
3. `DEBUG=true` — falls back to the documented **development-only** defaults
   (`patient123` / `staff123` / `admin123`).

Outside debug mode (the `.env` default `DEBUG=false`), a run **without
`MEDIFLOW_SEED_PASSWORD` fails immediately** instead of installing a
well-known password — in particular, the ADMIN account can never get a
publicly known default password in a non-debug environment.

Before the first run on a fresh database, apply the schema:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

The seed script also creates tables automatically if they do not exist
(`Base.metadata.create_all`), so `alembic upgrade head` is optional for the
seed itself, but recommended for a managed schema.

## Idempotency

The seed is **idempotent**:

- Every record gets a **deterministic UUID** (`uuid.uuid5`) derived from its
  natural key (e.g. `hosp-citycare` → a fixed UUID).
- Each entity is inserted with an `ON CONFLICT ... DO UPDATE` (UPSERT) keyed on
  its primary key, so re-running the script updates values in place instead of
  creating duplicate rows.
- Unique business constraints (`registration_number`, `vehicle_number`, email)
  provide a second line of defense against duplicates.

Running the seed twice produces identical row counts (verified below).

## Expected records after seeding

| Table | Rows | Notes |
|---|---|---|
| `hospitals` | 6 | CityCare Medical Center, Metro Trauma & Apex Institute, LifeLine Super Specialty Hospital, St. Jude Memorial Hospital, Apex Heart & Vascular Institute, Westside Community Hospital |
| `users` | 3 | patient@mediflow.ai, staff@mediflow.ai, admin@mediflow.ai |
| `doctors` | 5 | Dr. Anil Kumar (Cardiology), Dr. Priya Sharma (Neurology), Dr. Rohit Sen (Emergency Medicine), Dr. Kavitha Nair (Pulmonology), Dr. Meera Iyer (Internal Medicine) — all at CityCare |
| `rooms` | 6 | ER-01…ER-03 (Emergency), ICU-01…ICU-02 (ICU), W-101 (General Ward) — all at CityCare |
| `beds` | 244 | CityCare bed grid generated exactly as the frontend `hospitalToBeds()` does: 24 ICU `citycare-ICU-01..24` (5 AVAILABLE / 19 OCCUPIED) + 220 `citycare-B01..220` (35 Emergency AVAILABLE, 7 General AVAILABLE, 178 General OCCUPIED) |
| `ambulances` | 5 | KA-01-A17 (ALS), KA-01-A22 (BLS), KA-01-A09 (ALS, en route), KA-01-A35 (ALS), KA-01-A44 (BLS, at hospital) |
| `icu_units` | 6 | one per hospital; e.g. CityCare 24 total / 5 available (frontend ICU metrics) |
| `emergency_rooms` | 6 | one per hospital; e.g. CityCare capacity 35 / 26 patients (frontend ER metrics) |
| `hospital_operations` | 6 | one per hospital; e.g. CityCare 42% ER load / 8 min wait / 3 ambulances |
| `hospital_staff` | 1 | Dr. Priya Rao (staff@mediflow.ai) → CityCare Medical Center |
| `patients` | 1 | Rohan Verma (patient@mediflow.ai) |

### Hospital operations snapshot (from frontend queue/operational values)

| Hospital | ER load % | Wait (min) | Ambulances available |
|---|---|---|---|
| CityCare Medical Center | 42 | 8 | 3 |
| Metro Trauma & Apex Institute | 94 | 38 | 1 |
| LifeLine Super Specialty Hospital | 48 | 11 | 3 |
| St. Jude Memorial Hospital | 62 | 16 | 2 |
| Apex Heart & Vascular Institute | 51 | 10 | 2 |
| Westside Community Hospital | 71 | 20 | 1 |

## Verification results

Every seed run ends with an automated verification block. Verified checks
(run against both a fresh seed and a re-seed — results identical):

```text
--- Row Counts ---
  hospitals                          6
  users                              3
  doctors                            5
  rooms                              6
  beds                             244
  ambulances                         5
  icu_units                          6
  emergency_rooms                    6
  hospital_operations                6
  hospital_staff                     1
  patients                           1

--- Foreign Key Integrity Checks ---
  PASS: Every doctor belongs to a hospital.
  PASS: Every room belongs to a hospital.
  PASS: Every bed belongs to a hospital.
  PASS: All beds with room references point to valid rooms.
  PASS: Every staff assignment references valid hospital and user.
  PASS: Every ambulance belongs to a hospital.
  PASS: Every ICU unit belongs to a hospital.
  PASS: Every emergency room belongs to a hospital.
  PASS: Every hospital operation belongs to a hospital.
  PASS: Each hospital has at most one operation record.
```

The three FKs called out in the task are specifically covered:

1. **Doctors → hospitals**: left-join check in `_verify_seeding()`; no orphan
   doctors (every `doctors.hospital_id` resolves).
2. **Rooms → hospitals**: left-join check; no orphan rooms.
3. **Beds → rooms/hospitals**: beds without a hospital are flagged, and beds
   that reference a `room_id` are checked against `rooms` (no dangling refs).
4. **Staff → hospitals/users**: `hospital_staff` rows are checked against both
   `hospitals` and `users`; no orphan assignments.

## Scope notes

- **Queue/pre-alert demo records are not seeded.** `INITIAL_QUEUE_PATIENTS`,
  `INITIAL_PRE_ALERTS`, active ambulance dispatches, simulation outputs, and
  notification entries are transient runtime state (a live queue changes every
  minute), not static operational configuration. Their *derived* metrics are
  preserved: ER load %, estimated wait minutes, and available ambulance counts
  live in `hospital_operations`, and ICU/ER capacity lives in `icu_units` /
  `emergency_rooms`.
- **Demo users are seeded** (`users`, `hospital_staff`, `patients`) because the
  frontend uses them for prototype authentication and staff/patient pages.
  Passwords are stored as **bcrypt hashes** at seed time (never plaintext).
- **Bed grid**: the frontend has no hardcoded `INITIAL_BEDS`; beds are derived
  at runtime by `hospitalToBeds()`. The seed reproduces that derivation **exactly**
  (same prefixes, numbering, statuses) so the 244-bed CityCare grid matches what
  the demo UI shows.

## Demo credentials

> **Important:** the passwords below are **development-only** defaults. They
> apply only when `DEBUG=true` (or when explicitly supplied via
> `MEDIFLOW_SEED_PASSWORD` / `MEDIFLOW_SEED_ADMIN_PASSWORD`). Outside debug,
> seeding without the environment variables aborts — see
> [Seed command](#seed-command).

The seeded users match the frontend demo login (`src/context/AppContext.tsx`):

| Email | Debug default password | Role |
|---|---|---|
| patient@mediflow.ai | patient123 | patient |
| staff@mediflow.ai | staff123 | hospital_staff |
| admin@mediflow.ai | admin123 | admin |

> **Note:** passwords are hashed with bcrypt via `app.core.security` at seed
> time. These demo credentials work against `POST /api/auth/login`.

## Files

```
backend/app/seed/
├── __init__.py
└── seed_database.py    # seed + verification logic
```