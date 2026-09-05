# MediFlow AI Backend

PostgreSQL-backed **FastAPI** foundation for the MediFlow emergency triage platform.

## Tech Stack

| Technology | Purpose |
|---|---|
| FastAPI 0.141 | REST API framework |
| SQLAlchemy 2.0 | ORM / data access layer |
| Alembic | Schema migrations |
| PostgreSQL + psycopg v3 | Database driver |
| Pydantic v2 | Settings + request/response validation |
| bcrypt | Password hashing (never stored in plaintext) |
| PyJWT | Signed access-token authentication (HS256) |
| Pytest + httpx | Automated tests |

## Project Structure

```
backend/
├── alembic/                 # Alembic migration environment
│   ├── versions/            # Generated migrations
│   ├── env.py
│   └── script.py.mako
├── alembic.ini
├── app/
│   ├── main.py              # FastAPI app, routers, error handlers, CORS
│   ├── core/
│   │   ├── config.py        # Settings loaded from .env
│   │   ├── database.py      # Engine, session, connectivity check
│   │   └── security.py      # bcrypt hashing + JWT encode/decode
│   ├── api/                 # HTTP routers + shared dependencies
│   │   ├── deps.py          # Pagination, current-user/role/staff-hospital deps
│   │   ├── auth.py          # register / login / me
│   │   ├── admin.py         # Admin-only user management
│   │   ├── hospitals.py     # Public hospital read APIs
│   │   └── staff.py         # Staff write/management APIs
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── common.py        # Pagination + consistent error models
│   │   ├── auth.py          # Register/login/token/user schemas
│   │   ├── hospital.py      # Read schemas (hospital domain)
│   │   └── staff.py         # Write schemas (doctor/room/bed/ambulance/ops)
│   ├── models/              # SQLAlchemy ORM models (13 tables)
│   │   ├── base.py          # DeclarativeBase + timestamp mixin
│   │   ├── user.py          # users
│   │   ├── hospital.py      # hospitals
│   │   ├── hospital_staff.py# hospital_staff
│   │   ├── patient.py       # patients
│   │   ├── facility.py      # doctors, rooms, beds, icu_units, emergency_rooms
│   │   ├── ambulance.py     # ambulances
│   │   ├── emergency.py     # emergency_cases, queue_tokens
│   │   └── operations.py    # hospital_operations
│   └── seed/                # Idempotent database seeding (see SEEDING.md)
│       └── seed_database.py
├── tests/                   # pytest suite
├── .env                     # Local secrets (gitignored — never commit)
├── .env.example             # Template for environment variables
├── requirements.txt
└── pyproject.toml
```

## Database Schema

| Table | Notes |
|---|---|
| `users` | app accounts; roles `PATIENT`, `HOSPITAL_STAFF`, `ADMIN` |
| `hospitals` | central entity; stable UUID PK; provider IDs (`geoapify_place_id`, `locationiq_place_id`) are non-key metadata |
| `hospital_staff` | join table users ↔ hospitals; unique per (user, hospital) |
| `doctors` | per-hospital physician records |
| `rooms` | per-hospital rooms; unique per (hospital, room_number) |
| `beds` | per-hospital beds; status `AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE` |
| `icu_units` | ICU capacity counters per hospital |
| `emergency_rooms` | ER capacity/current patients per hospital |
| `ambulances` | vehicles with live `latitude`/`longitude` |
| `patients` | patient profile linked 1:1 to a `users` row |
| `emergency_cases` | triage cases with severity `CRITICAL/HIGH/MODERATE/LOW` |
| `queue_tokens` | hospital waiting queue entries |
| `hospital_operations` | 1:1 live ER load / wait estimates per hospital |

Behaviors applied consistently:

- UUID (`String(36)`) primary keys with stable database IDs.
- `created_at` / `updated_at` UTC timestamps via `func.now()`.
- Foreign keys with cascades chosen carefully: child rows cascade when their
  hospital is deleted; `beds.room_id` and `queue_tokens.emergency_case_id` use
  `SET NULL` so history is not destroyed.
- Indexes on `hospital_id`, `user_id`, `status`, and coordinate pairs.
- Unique constraints on emails, registration numbers, vehicle numbers, and
  per-hospital room/bed/token numbers.

## Local Setup

### 1. Prerequisites

- Python 3.10+ (tested on 3.14)
- PostgreSQL 14+ running locally

### 2. Create the database and role

```sql
CREATE ROLE mediflow WITH LOGIN PASSWORD 'mediflow';
CREATE DATABASE mediflow OWNER mediflow;
```

### 3. Install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

### 4. Configure environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` to match your local PostgreSQL credentials. `.env` is gitignored —
never commit it.

### 5. Run migrations

```powershell
.\.venv\Scripts\python -m alembic upgrade head
```

To create a new migration after model changes:

```powershell
.\.venv\Scripts\python -m alembic revision --autogenerate -m "describe change"
```

### 6. Start the server

```powershell
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health
- DB connectivity check: http://localhost:8000/api/health/db
- Readiness check: http://localhost:8000/api/health/ready

## API

Interactive OpenAPI docs are generated automatically by FastAPI at
`http://localhost:8000/docs` (JSON at `/openapi.json`).

The authoritative, versioned endpoint contract lives in
[`API_CONTRACT.md`](API_CONTRACT.md). Request and response schemas are stable
and do not change once documented.

### Health and readiness

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Liveness: 200 while the process runs; `database` reflects reachability |
| GET | `/api/health/db` | Database connectivity status only (200 always) |
| GET | `/api/health/ready` | Readiness: 200 only when dependencies (database) are reachable, else 503 with the standard error envelope |

### Logging

Logs are emitted as structured single-line `key=value` records (see
`app/core/logging.py`). Passwords, access tokens, API keys, and unnecessary
personal data are never logged; a `RedactingFilter` provides defense-in-depth
masking. Set `DEBUG=true` in `.env` for a human-readable format.

### Public hospital read APIs (`/api/hospitals`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hospitals` | Paginated list of hospitals |
| GET | `/api/hospitals/{hospital_id}` | One hospital |
| GET | `/api/hospitals/{hospital_id}/doctors` | Paginated doctors |
| GET | `/api/hospitals/{hospital_id}/rooms` | Paginated rooms |
| GET | `/api/hospitals/{hospital_id}/beds` | Paginated beds |
| GET | `/api/hospitals/{hospital_id}/icu` | Paginated ICU units |
| GET | `/api/hospitals/{hospital_id}/emergency-rooms` | Paginated emergency rooms |
| GET | `/api/hospitals/{hospital_id}/ambulances` | Paginated ambulances |
| GET | `/api/hospitals/{hospital_id}/operations` | Live operational metrics |

List endpoints accept `page` (≥1) and `size` (1–100) and return a
`{items, total, page, size, pages}` envelope.

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a `PATIENT` account (bcrypt-hashed password) |
| POST | `/api/auth/login` | Exchange email + password for a JWT access token |
| GET | `/api/auth/me` | Current authenticated user |

- Passwords are hashed with **bcrypt** server-side and never returned by any
  response.
- Tokens are signed **JWTs (HS256)** with a configurable expiration
  (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 480 minutes). The signing key comes
  from `SECRET_KEY` in the environment.
- Login failures return a generic `401 {"error": {"code": "unauthorized",
  "message": "Invalid email or password"}}` — no account enumeration.
- Send the token as `Authorization: Bearer <access_token>`.
- Self-registration only creates `PATIENT` accounts; `HOSPITAL_STAFF` and
  `ADMIN` roles are assigned by admins (see below).

### Admin management (`/api/admin`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | Paginated list of user accounts (ADMIN only) |
| PATCH | `/api/admin/users/{id}/role` | Assign a role to a user (ADMIN only) |

### Staff write/management APIs (`/api/staff`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/staff/my-hospital` | The acting staff member's hospital snapshot |
| PUT | `/api/staff/my-hospital` | Update the acting hospital's profile |
| POST | `/api/staff/doctors` | Add a doctor |
| PUT | `/api/staff/doctors/{id}` | Update a doctor |
| DELETE | `/api/staff/doctors/{id}` | Remove a doctor |
| POST | `/api/staff/rooms` | Add a room |
| PUT | `/api/staff/rooms/{id}` | Update a room |
| POST | `/api/staff/beds` | Add a bed |
| PUT | `/api/staff/beds/{id}` | Update a bed |
| POST | `/api/staff/ambulances` | Add an ambulance |
| PUT | `/api/staff/ambulances/{id}` | Update an ambulance |
| PUT | `/api/staff/operations` | Update live operational metrics |

**Authorization:** every staff endpoint authenticates the bearer token and
requires the `HOSPITAL_STAFF` role. The acting hospital is resolved **server-side
from the `hospital_staff` join table** — a `hospital_id` sent by the frontend is
never trusted. Cross-hospital record access returns `403`; patients and admins
receive `403`; missing/invalid/expired tokens receive `401`.

### Error format

All errors use a consistent body:

```json
{
  "error": {
    "code": "not_found",
    "message": "Hospital not found",
    "details": null
  }
}
```

Validation failures return `422` with a `details` array; conflicts return
`409`; missing resources `404`; cross-hospital access `403`; missing identity
`401`. Responses never include provider API keys, database credentials, or
provider place IDs.

## Tests

```powershell
.\.venv\Scripts\python -m pytest tests -q
```

Tests cover the health endpoints, schema metadata (tables, foreign keys, unique
constraints, relationships, timestamps, provider-ID metadata fields), and the
hospital + staff APIs. They do not require a running PostgreSQL instance (the 
suite uses an ephemeral SQLite database).

## Notes

- On Python 3.14 use the `psycopg` (v3) driver (`postgresql+psycopg://`);
  `psycopg2` has no 3.14 wheels.
- The React frontend is intentionally untouched: hardcoded data and map/search
  behavior remain as-is until API endpoints replace them in a later phase.

## Seeding the database

Load the frontend's operational demo records (hospitals, doctors, rooms, beds,
ambulances, ICU/ER capacity, queue metrics) into the database:

```powershell
.\.venv\Scripts\python.exe -m app.seed.seed_database
```

The seed is idempotent (safe to re-run) and prints verification results. See
[`SEEDING.md`](SEEDING.md) for expected row counts, demo credentials, and the
verification output.