# MediFlow Backend — API Contract

**Version:** 1.0 (Phase 6)
**Base URL:** `http://localhost:8000`
**Interactive docs:** `/docs` · **OpenAPI JSON:** `/openapi.json`

This document is the authoritative contract between the MediFlow backend and
the frontend. Endpoint contracts (paths, methods, request/response shapes,
status codes) are **stable**: they are not changed after this document without
a version bump and coordinated frontend change.

Conventions used everywhere:

- All timestamps serialize as ISO-8601 UTC (e.g. `2026-09-05T10:15:30.123456+00:00`).
- All IDs are server-generated stable database IDs (`String(36)` UUIDs).
- All list endpoints are paginated with `page` (≥ 1) and `size` (1–100,
  default 20) query parameters and return the `Page` envelope.
- Errors always use the `Error` envelope (see [Errors](#errors)).
- `HOSPITAL_STAFF` can only ever operate on the hospital they are assigned to
  server-side. A `hospital_id` sent by a client is never trusted for
  authorization.

---

## 1. Authentication

| Role            | Value            |
|-----------------|------------------|
| Patient         | `PATIENT`        |
| Hospital staff  | `HOSPITAL_STAFF` |
| Admin           | `ADMIN`          |

Passwords are hashed with bcrypt server-side and are never stored or returned
in plaintext. Self-registration creates `PATIENT` accounts only; staff and
admin roles are assigned by an admin.

Access tokens are signed JWTs (HS256). Send them as:

```
Authorization: Bearer <access_token>
```

Token lifetime is `ACCESS_TOKEN_EXPIRE_MINUTES` (default 480 minutes).

| Method | Endpoint               | Description                            |
|--------|------------------------|----------------------------------------|
| POST   | `/api/auth/register`   | Create a patient account               |
| POST   | `/api/auth/login`      | Exchange credentials for an access token |
| GET    | `/api/auth/me`         | Current authenticated user             |

### POST /api/auth/register

Request:

```json
{
  "email": "sara.patient@example.com",
  "password": "securepass123",
  "full_name": "Sara Patient",
  "phone": "+91 90000 00000"
}
```

Success — `201 Created`:

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "email": "sara.patient@example.com",
  "full_name": "Sara Patient",
  "phone": "+91 90000 00000",
  "role": "PATIENT",
  "created_at": "2026-09-05T10:15:30.123456+00:00",
  "updated_at": "2026-09-05T10:15:30.123456+00:00"
}
```

- `409` `conflict` — email already registered.
- `422` `validation_error` — invalid email, password shorter than 8 chars, or
  unexpected fields (e.g. `role`) in the body.

### POST /api/auth/login

Request:

```json
{ "email": "sara.patient@example.com", "password": "securepass123" }
```

Success — `200 OK`:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "email": "sara.patient@example.com",
    "full_name": "Sara Patient",
    "phone": "+91 90000 00000",
    "role": "PATIENT",
    "created_at": "2026-09-05T10:15:30.123456+00:00",
    "updated_at": "2026-09-05T10:15:30.123456+00:00"
  }
}
```

- `401` `unauthorized` — invalid email or password (same message for both, no
  account enumeration).

### GET /api/auth/me

Auth: Bearer token, any role.

Success — `200 OK` — same `User` shape as register. `401` when the token is
missing, invalid, expired, or its owner no longer exists.

---

## 2. Hospitals (public read)

No authentication required. Provider place IDs and any credential-like data
are never serialized.

| Method | Endpoint                                  | Description                          |
|--------|-------------------------------------------|--------------------------------------|
| GET    | `/api/hospitals`                          | Paginated list of hospitals          |
| GET    | `/api/hospitals/{hospital_id}`            | One hospital                         |
| GET    | `/api/hospitals/{hospital_id}/doctors`    | Paginated doctors                    |
| GET    | `/api/hospitals/{hospital_id}/rooms`      | Paginated rooms                      |
| GET    | `/api/hospitals/{hospital_id}/beds`       | Paginated beds                       |
| GET    | `/api/hospitals/{hospital_id}/icu`        | Paginated ICU units                  |
| GET    | `/api/hospitals/{hospital_id}/emergency-rooms` | Paginated emergency rooms      |
| GET    | `/api/hospitals/{hospital_id}/ambulances` | Paginated ambulances                 |
| GET    | `/api/hospitals/{hospital_id}/operations` | Live operational metrics (object)    |

### GET /api/hospitals

Success — `200 OK`:

```json
{
  "items": [
    {
      "id": "hosp-001",
      "name": "City Center Hospital",
      "registration_number": "REG-1001",
      "address": "12 MG Road",
      "city": "Bangalore",
      "state": "Karnataka",
      "postal_code": "560001",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "phone": "+91 80 4000 1001",
      "email": "contact@citycenter.example",
      "emergency_available": true,
      "status": "ACTIVE",
      "created_at": "2026-09-05T10:00:00.000000+00:00",
      "updated_at": "2026-09-05T10:00:00.000000+00:00"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

`HospitalStatus` enum: `ACTIVE`, `INACTIVE`, `UNDER_REVIEW`.

### GET /api/hospitals/{hospital_id}/operations

Success — `200 OK` (not a `Page`):

```json
{
  "id": "op-001",
  "hospital_id": "hosp-001",
  "current_er_load": 42,
  "estimated_wait_minutes": 15,
  "available_ambulances": 3,
  "created_at": "2026-09-05T10:00:00.000000+00:00",
  "updated_at": "2026-09-05T10:00:00.000000+00:00"
}
```

Hierarchical list endpoints under a hospital return `Page` envelopes of:

| Path suffix   | Item schema          | Sample fields                                                        |
|---------------|----------------------|----------------------------------------------------------------------|
| `/doctors`    | `DoctorRead`         | `id`, `hospital_id` (see [Doctors](#3-doctors))                      |
| `/rooms`      | `RoomRead`           | `id`, `hospital_id`, `room_number`, `room_type`, `floor`, `status`   |
| `/beds`       | `BedRead`            | `id`, `hospital_id`, `room_id?`, `bed_number`, `bed_type`, `status`  |
| `/icu`        | `ICURead`            | `id`, `hospital_id`, `name`, `total_beds`, `available_beds`, `occupied_beds` |
| `/emergency-rooms` | `EmergencyRoomRead` | `name`, `status`, `current_patients`, `capacity`                       |
| `/ambulances` | `AmbulanceRead`      | `id`, `hospital_id`, `vehicle_number`, `type`, `status`, `latitude?`, `longitude?`, `current_assignment?` |

- `404` `not_found` — unknown `hospital_id`; `/operations` also returns `404`
  when the hospital has no operations row.

---

## 3. Doctors

### Public read

`GET /api/hospitals/{hospital_id}/doctors` — see section 2.

### Staff management (`/api/staff`)

Auth: Bearer + `HOSPITAL_STAFF`. The hospital is resolved server-side.

| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| POST   | `/api/staff/doctors`           | Add a doctor             |
| PUT    | `/api/staff/doctors/{doctor_id}` | Update a doctor        |
| DELETE | `/api/staff/doctors/{doctor_id}` | Remove a doctor        |

`DoctorRead` shape:

```json
{
  "id": "doc-001",
  "hospital_id": "hosp-001",
  "name": "Dr. Priya Nair",
  "specialty": "Cardiology",
  "registration_number": "KMC-12345",
  "phone": "+91 98450 00000",
  "email": "priya.nair@citycenter.example",
  "status": "AVAILABLE",
  "created_at": "2026-09-05T10:00:00.000000+00:00",
  "updated_at": "2026-09-05T10:00:00.000000+00:00"
}
```

`DoctorStatus` enum: `AVAILABLE`, `BUSY`, `OFF_DUTY`.

### POST /api/staff/doctors

Request:

```json
{
  "name": "Dr. Priya Nair",
  "specialty": "Cardiology",
  "registration_number": "KMC-12345",
  "phone": "+91 98450 00000",
  "status": "AVAILABLE"
}
```

Success — `201 Created` — returns `DoctorRead`. Note the response
`hospital_id` is the staff member's own hospital, never any hospital sent in
the request body.

- `401` missing/invalid/expired token
- `403` role is not staff, or staff of another hospital
- `409` a doctor with the same `registration_number` already exists
- `422` validation failure (missing `name`/`specialty`, bad enum, etc.)

### PUT /api/staff/doctors/{doctor_id}

Request body accepts any subset of the create fields. Success — `200 OK` —
returns the updated `DoctorRead`. `404` unknown id; `403` doctor belongs to
another hospital.

### DELETE /api/staff/doctors/{doctor_id}

Success — `204 No Content` (empty body). `404` unknown id; `403` belongs to
another hospital.

---

## 4. Rooms

### Public read

`GET /api/hospitals/{hospital_id}/rooms` — see section 2.

### Staff management

| Method | Endpoint                     | Description          |
|--------|------------------------------|----------------------|
| POST   | `/api/staff/rooms`           | Add a room           |
| PUT    | `/api/staff/rooms/{room_id}` | Update a room        |

`RoomRead` shape:

```json
{
  "id": "room-001",
  "hospital_id": "hosp-001",
  "room_number": "ER-01",
  "room_type": "Emergency Room",
  "floor": "Ground Floor",
  "status": "AVAILABLE"
}
```

`RoomStatus` enum: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`.

POST request:

```json
{
  "room_number": "ER-01",
  "room_type": "Emergency Room",
  "floor": "Ground Floor",
  "status": "AVAILABLE"
}
```

- `201` on create (`RoomRead`), `200` on update.
- `409` when `room_number` is already used in this hospital.
- `404`/`403`/`422` as per section 3.

---

## 5. Beds

### Public read

`GET /api/hospitals/{hospital_id}/beds` — see section 2.

### Staff management

| Method | Endpoint                   | Description        |
|--------|----------------------------|--------------------|
| POST   | `/api/staff/beds`          | Add a bed          |
| PUT    | `/api/staff/beds/{bed_id}` | Update a bed       |

`BedRead` shape:

```json
{
  "id": "bed-001",
  "hospital_id": "hosp-001",
  "room_id": "room-001",
  "bed_number": "B-01",
  "bed_type": "ICU",
  "status": "AVAILABLE",
  "created_at": "2026-09-05T10:00:00.000000+00:00",
  "updated_at": "2026-09-05T10:00:00.000000+00:00"
}
```

`BedStatus` enum: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`.

POST request:

```json
{
  "bed_number": "B-01",
  "bed_type": "ICU",
  "room_id": "room-001",
  "status": "AVAILABLE"
}
```

- `409` when `bed_number` is already used in this hospital.
- `422` when `room_id` belongs to a different hospital (or does not exist).

---

## 6. Ambulances

### Public read

`GET /api/hospitals/{hospital_id}/ambulances` — see section 2.

### Staff management

| Method | Endpoint                             | Description          |
|--------|--------------------------------------|----------------------|
| POST   | `/api/staff/ambulances`              | Add an ambulance     |
| PUT    | `/api/staff/ambulances/{ambulance_id}` | Update an ambulance |

`AmbulanceRead` shape:

```json
{
  "id": "amb-001",
  "hospital_id": "hosp-001",
  "vehicle_number": "KA-01-AB-1234",
  "type": "ALS",
  "status": "AVAILABLE",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "current_assignment": null,
  "created_at": "2026-09-05T10:00:00.000000+00:00",
  "updated_at": "2026-09-05T10:00:00.000000+00:00"
}
```

`AmbulanceType` enum: `BLS`, `ALS`, `MORTUARY`.
`AmbulanceStatus` enum: `AVAILABLE`, `DISPATCHED`, `EN_ROUTE`, `AT_HOSPITAL`, `MAINTENANCE`.

POST request:

```json
{
  "vehicle_number": "KA-01-AB-1234",
  "type": "ALS",
  "status": "AVAILABLE",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

- `409` when `vehicle_number` already exists.

---

## 7. Hospital operations

| Method | Endpoint                | Description                              |
|--------|-------------------------|------------------------------------------|
| GET    | `/api/hospitals/{hospital_id}/operations` | Public read (section 2)     |
| GET    | `/api/staff/my-hospital` | Staff snapshot (hospital + operations)  |
| PUT    | `/api/staff/my-hospital` | Update hospital profile                 |
| PUT    | `/api/staff/operations`  | Update live operational metrics         |

### GET /api/staff/my-hospital

Auth: `HOSPITAL_STAFF`.

Success — `200 OK`:

```json
{
  "hospital": { "...HospitalRead..." },
  "operations": { "...OperationRead..." }
}
```

`operations` is `null` when the hospital has no operations row.

### PUT /api/staff/my-hospital

Request (any subset):

```json
{
  "name": "City Center Hospital (Flagstaff)",
  "address": "12 MG Road",
  "city": "Bangalore",
  "state": "Karnataka",
  "postal_code": "560001",
  "phone": "+91 80 4000 1001",
  "email": "contact@citycenter.example",
  "emergency_available": true,
  "status": "ACTIVE"
}
```

Success — `200 OK` — same `MyHospitalResponse` shape. Unlisted fields (e.g.
`id`, `latitude`, `registration_number`) are rejected with `422`.

### PUT /api/staff/operations

Request (any subset):

```json
{
  "current_er_load": 55,
  "estimated_wait_minutes": 15,
  "available_ambulances": 4
}
```

Constraints: `current_er_load` 0–100; the rest ≥ 0. Success — `200 OK` —
`OperationRead`. `404` when the hospital has no operations row.

---

## 8. Emergency cases

Auth: Bearer + `PATIENT` (patient endpoints). The AI-assisted
`priority_score` **is derived server-side from `severity`** — clients can
never set it, and the score is a prioritization signal, never a clinical
diagnosis.

Severity → server-derived priority score:

| Severity   | `priority_score` |
|------------|------------------|
| CRITICAL   | 100.0            |
| HIGH       | 80.0             |
| MODERATE   | 55.0             |
| LOW        | 30.0             |

| Method | Endpoint                                        | Description                          |
|--------|-------------------------------------------------|--------------------------------------|
| POST   | `/api/emergency-cases`                          | Report an emergency case             |
| GET    | `/api/emergency-cases/{case_id}`                | Get own case (owner only)            |
| GET    | `/api/patients/me/emergency-cases`              | List own cases (paginated)           |
| POST   | `/api/emergency-cases/{case_id}/hospital-selection` | Direct case to a destination hospital |

`EmergencyCaseRead` shape:

```json
{
  "id": "case-001",
  "patient_id": "pat-001",
  "reported_symptoms": "Chest pain and shortness of breath",
  "age": 45,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "severity": "HIGH",
  "priority_score": 80.0,
  "status": "REPORTED",
  "created_at": "2026-09-05T10:20:00.000000+00:00",
  "updated_at": "2026-09-05T10:20:00.000000+00:00"
}
```

`EmergencyCaseStatus` enum: `REPORTED`, `DISPATCHED`, `EN_ROUTE`, `ARRIVED`,
`TREATING`, `RESOLVED`, `CANCELLED`.

### POST /api/emergency-cases

Request:

```json
{
  "reported_symptoms": "Chest pain and shortness of breath",
  "age": 45,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "severity": "HIGH"
}
```

- `201` returns `EmergencyCaseRead`.
- `422` invalid/lat-long out of range, missing symptoms, unknown severity, or
  a client-supplied `priority_score` (rejected as an extra field).
- `403` for non-patient roles.

### GET /api/emergency-cases/{case_id}

Owner-only. A case owned by **another** patient returns `404` (existence is
never leaked). `403` for non-patient roles.

### GET /api/patients/me/emergency-cases

Returns a `Page` of the patient's own cases (newest first). `200` even when
no patient profile exists yet (`total: 0`).

### POST /api/emergency-cases/{case_id}/hospital-selection

Request:

```json
{ "hospital_id": "hosp-001" }
```

Creates a queue token at the destination hospital. Success — `201 Created` —
returns a `QueueTokenView` (section 9). Idempotent: repeating the same
selection returns the existing token (`201`).

- `404` unknown case (or another patient's case), unknown hospital.

---

## 9. Queue

| Method | Endpoint                                | Auth / notes                          |
|--------|-----------------------------------------|---------------------------------------|
| GET    | `/api/queue/{hospital_id}`              | Staff see own hospital's full queue; patients see only their own tokens |
| POST   | `/api/queue/{hospital_id}/tokens`       | Staff issue a token for their own hospital |
| PUT    | `/api/queue/tokens/{token_id}/status`   | Staff advance a token status          |

Ordering is deterministic: `priority_level` descending → `created_at`
ascending → token id. Clients cannot supply a priority level, reorder the
queue, or alter server-derived priority.

Severity → queue `priority_level`:

| Severity   | `priority_level` |
|------------|------------------|
| CRITICAL   | 4                |
| HIGH       | 3                |
| MODERATE   | 2                |
| LOW        | 1                |

`QueueResponse` shape:

```json
{
  "hospital_id": "hosp-001",
  "view": "staff",
  "items": [
    {
      "id": "tok-001",
      "hospital_id": "hosp-001",
      "emergency_case_id": "case-001",
      "token_number": "TOK-0001",
      "priority_level": 4,
      "queue_position": 1,
      "status": "WAITING",
      "patient_name": "Sara Patient",
      "case_severity": "CRITICAL",
      "case_age": 45,
      "reported_symptoms": "Chest pain",
      "called_at": null,
      "completed_at": null,
      "created_at": "2026-09-05T10:20:00.000000+00:00",
      "updated_at": "2026-09-05T10:20:00.000000+00:00"
    }
  ]
}
```

`QueueStatus` enum: `WAITING`, `CALLED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

Allowed status transitions (state machine; anything else is `409`):

```
WAITING → CALLED | CANCELLED
CALLED → IN_PROGRESS | CANCELLED
IN_PROGRESS → COMPLETED | CANCELLED
COMPLETED → (terminal)
CANCELLED → (terminal)
```

- `GET /api/queue/{hospital_id}` — `200` with `view: "staff"` (full queue) or
  `view: "patient"` (only the caller's tokens). Staff of another hospital →
  `403`. Patients never see other patients' data.
- `POST /api/queue/{hospital_id}/tokens` — request body `{}` or
  `{"emergency_case_id": "case-001"}`. A walk-in (no case) gets `LOW`
  priority. `201` returns `QueueTokenView`. Path hospital must equal the
  staff member's hospital (`403` otherwise). Unknown case → `404`.
- `PUT /api/queue/tokens/{token_id}/status` — body `{"status": "CALLED"}`.
  `200` returns the updated `QueueTokenView`; `404` unknown token; `403` token
  belongs to another hospital; `409` invalid transition.

---

## 10. Admin

| Method | Endpoint                          | Description                                |
|--------|-----------------------------------|--------------------------------------------|
| GET    | `/api/admin/users`                | Paginated list of user accounts (ADMIN)    |
| PATCH  | `/api/admin/users/{user_id}/role` | Assign a role to a user (ADMIN)            |

`User` list item shape (no password data):

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "email": "staff@example.com",
  "full_name": "Staff User",
  "role": "HOSPITAL_STAFF",
  "created_at": "2026-09-05T10:15:30.123456+00:00",
  "updated_at": "2026-09-05T10:15:30.123456+00:00"
}
```

PATCH body: `{"role": "HOSPITAL_STAFF"}` (`PATIENT` | `HOSPITAL_STAFF` |
`ADMIN`).

- `400` when an admin attempts to change their own role.

---

## 11. System

| Method | Endpoint            | Description                                                        |
|--------|---------------------|--------------------------------------------------------------------|
| GET    | `/api/health`       | Liveness — 200 while running; `database` reports reachability      |
| GET    | `/api/health/db`    | Database connectivity status only (200 always)                     |
| GET    | `/api/health/ready` | Readiness — 200 when dependencies are reachable, else `503`        |

`/api/health/ready` success:

```json
{
  "status": "ready",
  "database": "connected",
  "version": "0.1.0",
  "checks": { "database": "connected" }
}
```

`/api/health/ready` failure (`503`):

```json
{
  "error": {
    "code": "service_unavailable",
    "message": "Service is not ready",
    "details": null
  }
}
```

---

## Errors

Every non-2xx response uses one envelope. `code` is stable; `details` is a
null or an array of `ErrorDetail` entries (`field`, `message`, `type`) used by
`422` validation errors.

| HTTP | `code`                | Typical use                                    |
|------|-----------------------|------------------------------------------------|
| 400  | `bad_request`         | Business-rule rejection (e.g. admin self role change) |
| 401  | `unauthorized`        | Missing/invalid/expired token, bad login       |
| 403  | `forbidden`           | Wrong role, or resource belongs to another hospital |
| 404  | `not_found`           | Unknown id, unknown path parameters             |
| 409  | `conflict`            | Duplicate unique value, invalid queue transition |
| 422  | `validation_error`    | Request body/parameter validation failed       |
| 500  | `internal_error`      | Unexpected server error (details omitted)      |
| 503  | `service_unavailable` | Readiness/dependency failure                   |

Example — `404`:

```json
{
  "error": {
    "code": "not_found",
    "message": "Hospital not found",
    "details": null
  }
}
```

Example — `422`:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "password", "message": "String should have at least 8 characters", "type": "string_too_short" }
    ]
  }
}
```

Example — `409`:

```json
{
  "error": {
    "code": "conflict",
    "message": "Invalid status transition from WAITING to COMPLETED",
    "details": null
  }
}
```

---

## CORS

The API allows these development origins (JSON `CORS_ORIGINS` in `.env`):

- `http://localhost:3000` (MediFlow Vite dev server)
- `http://127.0.0.1:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Requests from any other origin are rejected without CORS headers.

---

## Stability & versioning

- Contracts in this document are frozen for the frontend integration phase.
  Any necessary change must bump the contract version, update this document,
  and coordinate with the frontend track.
- Response schemas are enforced by Pydantic `response_model`, so the wire
  format cannot drift from this document.
- Backwards-compatible additions (new optional fields, new endpoints) are
  allowed without a version bump; removals and renames require one.