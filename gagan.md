# MediFlow — Gagan Implementation Plan

## How to use this file

Implement the phases below **one by one**, in order, using the detailed Antigravity prompt under each phase. Do not implement future phases early unless the prompt explicitly allows it.

**Gagan owns:** backend, database, authentication, API contracts, migrations, server-side authorization, and backend testing.

**Pari owns:** frontend migration, frontend API integration, UI behavior, and frontend testing. The two tracks are designed to progress in parallel while keeping contracts stable.

---

# Phase 1 — Backend & Database Foundation

### Simple explanation
We are creating the permanent place where MediFlow data will live instead of keeping hospital information inside React code. This improves persistence, consistency, and future multi-user access.

### Antigravity Prompt

```text
MEDIFLOW — GAGAN PHASE 1: DATABASE + FASTAPI FOUNDATION

Build the backend/database foundation for MediFlow without redesigning the existing frontend.

GOALS
- Create a PostgreSQL-backed FastAPI backend.
- Use SQLAlchemy 2.x and Alembic migrations.
- Create normalized tables for the current MediFlow domain.
- Keep all secrets in backend .env and never commit them.
- Do not delete the existing frontend hardcoded data yet.
- Do not change the existing map/search behavior.

DATABASE ENTITIES

1. users
   id, email, password_hash, full_name, phone, role, created_at, updated_at

Roles:
PATIENT
HOSPITAL_STAFF
ADMIN

2. hospitals
   id, name, registration_number, address, city, state, postal_code,
   latitude, longitude, phone, email, emergency_available, status,
   geoapify_place_id, locationiq_place_id, created_at, updated_at

3. hospital_staff
   id, user_id, hospital_id, staff_role, created_at

4. doctors
   id, hospital_id, name, specialty, registration_number, phone,
   email, status, created_at, updated_at

5. rooms
   id, hospital_id, room_number, room_type, floor, status

6. beds
   id, hospital_id, room_id, bed_number, bed_type, status, updated_at

Bed status:
AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE

7. icu_units
   id, hospital_id, name, total_beds, available_beds, occupied_beds, updated_at

8. emergency_rooms
   id, hospital_id, name, status, current_patients, capacity, updated_at

9. ambulances
   id, hospital_id, vehicle_number, type, status,
   latitude, longitude, current_assignment, updated_at

10. patients
    id, user_id, name, date_of_birth, phone, emergency_contact, created_at

11. emergency_cases
    id, patient_id, reported_symptoms, age, latitude, longitude,
    severity, priority_score, status, created_at, updated_at

Severity:
CRITICAL, HIGH, MODERATE, LOW

12. queue_tokens
    id, hospital_id, emergency_case_id, token_number, priority_level,
    queue_position, status, created_at, called_at, completed_at

13. hospital_operations
    hospital_id, current_er_load, estimated_wait_minutes,
    available_ambulances, last_updated

REQUIREMENTS

- Add foreign keys and indexes.
- Add unique constraints where appropriate.
- Hospital IDs must be stable database IDs.
- Provider IDs are metadata, not primary keys.
- Add created_at/updated_at consistently.
- Use UTC timestamps in storage.
- Add sensible NOT NULL constraints.
- Add indexes for hospital_id, user_id, status, coordinates where useful.
- Add cascading behavior carefully; do not accidentally delete important records.
- Create Alembic initial migration.
- Create backend configuration using environment variables.
- Add health endpoint:
  GET /api/health
- Add database connectivity check.
- Add clear project README with local setup.
- Add requirements/pyproject configuration.
- Add basic backend tests.

DO NOT:
- Put database credentials in source code.
- Put API keys in source code.
- Delete React hardcoded data.
- Implement fake API responses.
- Implement AI diagnosis.
- Add paid services.

FINAL REPORT:
- files created
- database tables
- relationships
- migration command
- local startup command
- test results
- any unresolved issue
```

---

# Phase 2 — Seed Existing Hardcoded Data

### Simple explanation
We take the existing demo hospitals such as City Center, Medicare, Apollo, etc., and put them into PostgreSQL. The data becomes database records instead of React constants.

### Antigravity Prompt

```text
MEDIFLOW — GAGAN PHASE 2: MIGRATE EXISTING DEMO DATA INTO DATABASE

Inspect the existing frontend carefully and identify all hardcoded operational/demo records:
- hospitals
- doctors
- specialties
- rooms
- beds
- ICU
- emergency rooms
- ambulances
- queue/demo operational values

Create backend seed data from the existing records.

IMPORTANT:
- Do not invent new hospitals.
- Preserve useful existing demo values.
- Do not silently change names or operational values.
- Deduplicate obvious duplicate records.
- Do not put seed data back into React.
- Keep real geographic discovery separate from seeded MediFlow operational data.

Create:
backend/app/seed/seed_database.py

The seed operation must be idempotent:
running it twice must not create duplicate hospitals/doctors/beds.

Use stable seed identifiers or safe matching.

After seeding:
- verify row counts
- verify foreign keys
- verify every doctor belongs to a hospital
- verify every room belongs to a hospital
- verify every bed belongs to a room/hospital
- verify staff assignments reference valid hospitals

Document:
python seed command
expected records
verification results
```

---

# Phase 3 — Hospital & Operational APIs

### Simple explanation
Now the backend can actually give the frontend hospital information and receive staff updates. This is the bridge between the database and the website.

### Antigravity Prompt

```text
MEDIFLOW — GAGAN PHASE 3: HOSPITAL + OPERATIONAL REST APIs

Build production-structured FastAPI APIs for the database entities.

PATIENT/READ APIs:

GET /api/hospitals
GET /api/hospitals/{hospital_id}
GET /api/hospitals/{hospital_id}/doctors
GET /api/hospitals/{hospital_id}/rooms
GET /api/hospitals/{hospital_id}/beds
GET /api/hospitals/{hospital_id}/icu
GET /api/hospitals/{hospital_id}/emergency-rooms
GET /api/hospitals/{hospital_id}/ambulances
GET /api/hospitals/{hospital_id}/operations

STAFF APIs:

GET /api/staff/my-hospital
PUT /api/staff/my-hospital
POST /api/staff/doctors
PUT /api/staff/doctors/{id}
DELETE /api/staff/doctors/{id}
POST /api/staff/rooms
PUT /api/staff/rooms/{id}
POST /api/staff/beds
PUT /api/staff/beds/{id}
POST /api/staff/ambulances
PUT /api/staff/ambulances/{id}
PUT /api/staff/operations

Requirements:
- Pydantic request/response schemas.
- Validation.
- Proper HTTP status codes.
- No database credentials in responses.
- No provider API keys in responses.
- Consistent error format.
- Pagination for list endpoints where appropriate.
- Backend logging without sensitive data.
- Tests for success, invalid ID, validation failure, and unauthorized access placeholders.

Do not yet replace the frontend data source.
The API must be usable independently first.

Generate OpenAPI documentation through FastAPI.
```

---

# Phase 4 — Authentication & Authorization

### Simple explanation
We replace fake frontend roles with real backend identity and permissions. A staff member can only modify their own hospital.

### Antigravity Prompt

```text
MEDIFLOW — GAGAN PHASE 4: REAL AUTHENTICATION + AUTHORIZATION

Implement secure backend authentication.

Roles:
PATIENT
HOSPITAL_STAFF
ADMIN

Requirements:
- Password hashing using a secure modern password hashing library.
- JWT access-token authentication or an equally secure server-supported mechanism.
- Login endpoint.
- Current-user endpoint.
- Role enforcement dependencies.
- Staff hospital ownership enforcement.
- Admin-only management operations.
- Patient access restricted to their own sensitive records.
- Staff cannot modify another hospital.
- Never trust hospital_id supplied by the frontend when determining staff ownership.

Endpoints:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Implement:
- authenticated user dependency
- role dependency
- current staff hospital dependency

Security:
- never store plaintext passwords
- never return password_hash
- validate credentials server-side
- safe error messages
- configurable token expiration
- secret key in environment
- CORS restricted to known frontend origin(s)

Tests:
- patient login
- staff login
- admin login
- invalid password
- expired/invalid token
- staff accessing own hospital
- staff attempting another hospital
- patient attempting staff endpoint
- admin access

Do not add social login or paid authentication services.
```

---

# Phase 5 — Emergency Cases & Queue Backend

### Simple explanation
The emergency flow becomes real database-backed data. Patient emergency cases and queue tokens persist instead of existing only in browser state.

### Antigravity Prompt

```text id="8e1t1k"
MEDIFLOW — GAGAN PHASE 5: EMERGENCY CASE + QUEUE BACKEND

Implement backend support for emergency workflow.

Create APIs:

POST /api/emergency-cases
GET /api/emergency-cases/{id}
GET /api/patients/me/emergency-cases

POST /api/emergency-cases/{id}/hospital-selection
POST /api/queue/{hospital_id}/tokens
GET /api/queue/{hospital_id}
PUT /api/queue/tokens/{token_id}/status

Requirements:
- authenticated patient ownership
- server-side validation
- emergency severity enum
- priority_score is a prioritization value, not a diagnosis
- preserve audit timestamps
- deterministic queue ordering
- critical/high priority cases cannot be reordered arbitrarily by clients
- hospital staff can manage their own hospital queue
- patients can view their own queue information
- avoid exposing other patients' sensitive data

Use wording:
"AI-assisted prioritization"
"priority score"

Never:
"AI diagnosis"
"clinical diagnosis by AI"

Add tests for:
- create emergency case
- patient ownership
- staff queue access
- cross-hospital access denial
- queue ordering
- invalid token operations
```

---

# Phase 6 — Backend Integration Hardening

### Simple explanation
Before connecting everything permanently, we make sure the backend is reliable, validated, secure, and easy for Pari's frontend track to consume.

### Antigravity Prompt

```text id="j6w3m7"
MEDIFLOW — GAGAN PHASE 6: API CONTRACT + HARDENING

Prepare the backend for frontend integration.

Requirements:
- Review all API routes.
- Ensure response schemas are stable.
- Ensure OpenAPI docs accurately describe every endpoint.
- Add consistent error response format.
- Add CORS for the MediFlow frontend development origin.
- Add request validation.
- Add database transaction handling.
- Add proper rollback on failures.
- Add indexes where tests reveal slow common queries.
- Add automated tests for core APIs.
- Add health/readiness endpoints.
- Add structured development logging.
- Never log passwords, tokens, API keys, or unnecessary personal data.

Create an API contract document:
backend/API_CONTRACT.md

Document:
- authentication
- hospital endpoints
- doctor endpoints
- bed endpoints
- room endpoints
- ambulance endpoints
- operations endpoints
- emergency endpoints
- queue endpoints
- request examples
- response examples
- error examples

Do not change endpoint contracts after documenting them unless necessary.
```

---

# Phase 7 — Backend Testing & Demo Preparation

### Simple explanation
We test the whole backend as if multiple users are using it at the same time, so the SIH demo doesn't depend on fragile browser-only data.

### Antigravity Prompt

```text
MEDIFLOW — GAGAN PHASE 7: BACKEND INTEGRATION TESTING

Run a complete backend test cycle.

Scenario:

1. Create/login patient.
2. Create/login hospital staff.
3. Staff is assigned to Hospital A.
4. Staff updates beds at Hospital A.
5. Verify database changed.
6. Patient reads Hospital A.
7. Patient sees the updated value.
8. Staff attempts Hospital B update.
9. Verify 403/authorization failure.
10. Patient creates emergency case.
11. Emergency case is stored.
12. Hospital selection is stored.
13. Queue token is created.
14. Staff views hospital queue.
15. Patient views their queue.

Also test:
- database restart
- backend restart
- invalid input
- duplicate seed execution
- missing required fields
- invalid hospital IDs
- unauthorized requests
- CORS
- API health

Do not claim a test passes unless it was actually executed.

Final report must include real test results.
```

---

# Gagan's Completion Rule

Do not mark a phase complete merely because files were created.

A phase is complete only when:
1. code exists,
2. migrations/tests run,
3. real local PostgreSQL is used,
4. acceptance tests pass,
5. the API contract is documented where applicable,
6. no hardcoded secrets exist.
