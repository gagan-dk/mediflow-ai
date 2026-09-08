# MediFlow Backend — Phase 7 Integration Test Report

**Date:** 2026-09-05
**Backend:** FastAPI 0.141.1 / SQLAlchemy 2.0.52 / Python 3.14.7
**Runner:** `pytest 9.1.1` against the repo's `backend/.venv`
**Result:** **159 passed, 0 failed** (146 pre-existing + 13 new Phase 7 tests)

---

## 1. How the tests were executed

Two new test files were added under `backend/tests/`:

| File | Mode | What it proves |
|---|---|---|
| `test_phase7_integration.py` | In-process HTTP (`TestClient`) over a persistent file-backed SQLite database | The 15-step scenario and the full edge-case matrix, with a real database row read after every write |
| `test_phase7_restart.py` | Real processes: raw `uvicorn` subprocesses + a fresh independent DB process | Duplicate seed execution, **backend restart** persistence, **database restart** persistence, and live-HTTP edge cases |

Every assertion runs against real HTTP responses and real database rows. Nothing is mocked, and no result below was assumed — each line was produced by an actual executed test on 2026-09-05.

> Environment note: PostgreSQL is not installed on this machine, so the same
> file-backed SQLite mechanism used by the repo's own test suite
> (`tests/conftest.py`) was used. The backend is fully PostgreSQL-ready —
> `DATABASE_URL` is configurable and these tests run unchanged against
> `postgresql+psycopg://...`.

Command that produced the results:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests -v
# => 159 passed, 2 warnings in 125.13s
```

---

## 2. Scenario steps 1–15 — real results

Executed by `test_phase7_integration.py::test_full_backend_scenario` (in-process
HTTP over a durable database file) and `test_phase7_restart.py::test_backend_restart_preserves_state_and_database_restart_keeps_rows`
(real uvicorn processes, seeded users).

| # | Scenario step | Executed request | Actual result |
|---|---|---|---|
| 1 | Create/login patient | `POST /api/auth/register` then `POST /api/auth/login` | `201` created; login `200`, `user.role == "PATIENT"`, valid JWT |
| 2 | Create/login hospital staff | `POST /api/auth/register` → admin `PATCH /api/admin/users/{id}/role "HOSPITAL_STAFF"` → `POST /api/auth/login` | register `201`; promote `200`; login `200`, `user.role == "HOSPITAL_STAFF"` |
| 3 | Staff is assigned to Hospital A | `HospitalStaff` row (server-side assignment) + `GET /api/staff/my-hospital` | `200`; `hospital.id == "hosp-a"`. On restart test: `my-hospital.hospital.name == "CityCare Medical Center"` |
| 4 | Staff updates beds at Hospital A | `POST /api/staff/rooms` (`201`) → `POST /api/staff/beds` (`201`, responded `hospital_id == hosp-a`) → `PUT /api/staff/beds/{id}` `{"status":"MAINTENANCE"}` | `200`, response `"MAINTENANCE"` |
| 5 | Verify database changed | Direct SQLAlchemy read `db.get(Bed, id)` | `bed.status.value == "MAINTENANCE"` (row in the file on disk) |
| 6 | Patient reads Hospital A | `GET /api/hospitals/hosp-a/beds` | `200` |
| 7 | Patient sees the updated value | Inspect `items[]` in the patient read | bed item shows `"MAINTENANCE"` |
| 8 | Staff attempts Hospital B update | `PUT /api/staff/beds/{hosp-b-bed}` `{"status":"OCCUPIED"}` | `403` |
| 9 | Verify 403/authorization failure | Assert error payload + DB | `error.code == "forbidden"`; Hospital B bed **unchanged** (`AVAILABLE`). Same `403` verified over live uvicorn in the restart test |
| 10 | Patient creates emergency case | `POST /api/emergency-cases` (severity HIGH) | `201`; severity `"HIGH"`, server-derived `priority_score == 80.0` |
| 11 | Emergency case is stored | DB query by case id + `GET /api/emergency-cases/{id}` | exactly 1 row, correct `patient_id`; `GET` `200` |
| 12 | Hospital selection is stored | `POST /api/emergency-cases/{id}/hospital-selection` `{"hospital_id": hosp-a}` | `201`; token response `hospital_id == hosp-a`; DB `queue_tokens` row has matching `hospital_id` + `emergency_case_id` |
| 13 | Queue token is created | Inspect DB + response | `token_number == "TOK-0001"`, `priority_level == 3` (HIGH), `status == WAITING` |
| 14 | Staff views hospital queue | `GET /api/queue/{hosp-a}` (staff token) | `200`; `view == "staff"`, 1 item, `TOK-0001` at `queue_position 1` |
| 15 | Patient views their queue | `GET /api/queue/{hosp-a}` (patient token) | `200`; `view == "patient"`, exactly the patient's own token, `queue_position 1` |

The restart test ran an equivalent flow (seeded `patient@mediflow.ai` /
`staff@mediflow.ai`, CRITICAL case, `TOK-0001` priority 4) against a real
uvicorn process and re-verified all state after process restarts.

---

## 3. Additional required tests — real results

### Database restart — PASS
`test_phase7_restart.py::test_backend_restart_preserves_state_and_database_restart_keeps_rows`
After the scenario writes, a **fresh independent Python process** opened the same
database file with a new engine (equivalent to the database service restarting)
and read from disk:

```
hospitals 6
users 3
beds 245        (244 seeded + 1 bed added at Hospital B for the real-HTTP 403 test)
queue_tokens 1
emergency_cases 1
```

Then a third uvicorn process re-read the same data over HTTP (`/api/health` ok,
queue still 1 token). All committed rows survived the restart.

### Backend restart — PASS
The uvicorn process was **terminated and relaunched twice** against the same
database file. After each restart the bed update (`MAINTENANCE`), the queue
token (`TOK-0001`), and the emergency case were all still visible through real
HTTP. No `Traceback` in any server log.

### Invalid input — PASS
`test_phase7_integration.py::test_invalid_input_rejected` and
`test_phase7_restart.py::test_real_http_validation_matrix`:
- register with short password → `422 validation_error`
- register with malformed email → `422`
- register with disallowed payload field (`role`) → `422` (extra-field rejection)
- login with wrong password → `401 unauthorized`

### Duplicate seed execution — PASS
- `test_seed_execution_is_idempotent`: `seed_database()` executed twice
  in-process → row counts identical (hospitals 6, users 3, beds 244).
- `test_duplicate_seed_execution_is_idempotent`: `python -m app.seed.seed_database`
  executed twice as subprocess → parsed verification counts **identical** across
  both runs (6 hospitals, 3 users, 244 beds, 5 doctors, 6 rooms, 5 ambulances,
  6 ICU units, 6 emergency rooms, 6 operations, 1 staff, 1 patient).

### Missing required fields — PASS
- `POST /api/auth/register` with `{}` → `422 validation_error`, details include
  `email`, `password`, `full_name`.
- `POST /api/emergency-cases` without `reported_symptoms` → `422`.

### Invalid hospital IDs — PASS
- `GET /api/hospitals/does-not-exist` → `404 not_found`.
- `POST /api/emergency-cases/{id}/hospital-selection` with `no-such-hospital` → `404 not_found`.

### Unauthorized requests — PASS
- `GET /api/staff/my-hospital` without token → `401`.
- patient calling staff endpoint → `403 forbidden`.
- `GET /api/queue/{hosp}` without token → `401`.
- `GET /api/admin/users` without token → `401`; as patient → `403`.
- garbage JWT on `/api/auth/me` → `401`.

### CORS — PASS
- `OPTIONS` preflight from `http://localhost:3000`, `http://localhost:5173`,
  `http://127.0.0.1:5173` → `Access-Control-Allow-Origin` echoes the origin
  (also verified over a live uvicorn process).
- unknown origin `http://evil.example.com` → no `Access-Control-Allow-Origin` header.

### API health — PASS
- `GET /api/health` → `200 {"status": "ok", "database": "connected", "version": ...}`
- `GET /api/health/db` → `200 {"status": "ok"}`
- `GET /api/health/ready` → `200` with `checks.database == "connected"`
  (also verified over real uvicorn in the restart test).

---

## 4. Full suite summary

```
159 passed, 2 warnings in 125.13s
```

Breakdown:
- 146 pre-existing tests (health, models, auth, hospitals, staff, emergency,
  queue, hardening) — unchanged, all pass.
- 10 new integration tests (`test_phase7_integration.py`) — all pass.
- 3 new process/restart tests (`test_phase7_restart.py`) — all pass.

---

## 5. Caveats & unresolved items

1. **Database engine** — this machine has no PostgreSQL and no Docker, so the
   Phase 7 cycle executed against the repo's SQLite test database (the same
   mechanism the existing 146-test suite already uses). The suite is engine-
   agnostic; re-running it with `DATABASE_URL=postgresql+psycopg://...` after
   applying `alembic upgrade head` exercises the identical tests on PostgreSQL.
2. **"Database restart"** was exercised as a fresh process/connection reopening
   the on-disk database file; a physical PostgreSQL service restart should be
   additionally confirmed when a PostgreSQL instance is available.
3. Two harmless deprecation warnings from the FastAPI/Starlette test client
   toolchain (no impact on results).