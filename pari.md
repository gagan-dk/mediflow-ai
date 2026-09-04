# MediFlow — Pari Implementation Plan

## How to use this file

Implement the phases below **one by one**, in order, using the detailed Antigravity prompt under each phase.

**Pari owns:** frontend data migration, API client integration, patient/staff UI integration, frontend state synchronization, error/loading states, and frontend tests.

**Gagan owns:** backend/database/auth/API implementation. Pari should use Gagan's documented API contract and should not duplicate backend logic.

The two tracks can be developed simultaneously. Until an endpoint is available, use a clearly isolated temporary adapter/mock only where necessary; do not leave mock operational data as the production source.

---

# Phase 1 — Frontend Data Audit

### Simple explanation
Before changing the frontend, we find every hardcoded hospital/doctor/bed/queue value. This prevents hidden demo data from remaining after the database is introduced.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 1: FRONTEND HARDcoded DATA AUDIT

Audit the entire React/Vite project.

Find all hardcoded:
- hospital records
- doctors
- specialties
- beds
- rooms
- ICU values
- emergency rooms
- ambulance records
- queue/token records
- operational status
- wait times
- hospital recommendations
- patient demo records

Do NOT delete anything yet.

Create:
docs/FRONTEND_DATA_AUDIT.md

For each source record:
- file
- variable/function
- data type
- purpose
- whether it is geographic data
- whether it is operational data
- whether it should move to backend
- dependencies/components using it

Also identify:
- current AppContext state
- hospitalService
- discovery service
- map service
- pages/components that consume hospital data

Do not modify unrelated functionality.

Final report must identify all frontend operational-data sources.
```

---

# Phase 2 — Create Frontend API Layer

### Simple explanation
Instead of components directly knowing how to call FastAPI, we create one clean API layer. This makes the frontend easier to maintain and lets us switch from hardcoded data to backend data safely.

### Antigravity Prompt

```text id="n3gk5q"
MEDIFLOW — PARI PHASE 2: FRONTEND API CLIENT

Create a centralized frontend API client for the FastAPI backend.

Suggested structure:

src/services/api/
  apiClient.ts
  authApi.ts
  hospitalApi.ts
  doctorApi.ts
  bedApi.ts
  roomApi.ts
  ambulanceApi.ts
  emergencyApi.ts
  queueApi.ts

Requirements:
- Base URL from VITE_API_BASE_URL.
- Never hardcode backend URL.
- Centralized fetch/error handling.
- JSON parsing.
- timeout/abort support where appropriate.
- authentication token handling according to Gagan's API contract.
- never log tokens/passwords.
- typed request/response interfaces.
- consistent ApiError type.

Do NOT yet replace all hardcoded data.

Create:
src/types/api.ts

Keep map provider APIs separate from the MediFlow backend API.

The backend owns operational data.
Geoapify/LocationIQ own geographic discovery.

Final report:
- files created
- API methods
- environment variable
- example request/response types
```

---

# Phase 3 — Hospital Data Migration

### Simple explanation
Now the patient UI stops reading City Center/Medicare/Apollo operational values from React constants and starts reading them from the backend database.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 3: CONNECT HOSPITAL DATA TO BACKEND

Replace frontend hardcoded operational hospital data with API data.

IMPORTANT:
- Do not remove real Geoapify/LocationIQ geographic discovery.
- Do not send geographic discovery through FastAPI unless the API contract explicitly provides it.
- MediFlow backend is the source of truth for operational data.
- Keep map provider geographic data separate.

Update:
- hospitalService
- AppContext where necessary
- HospitalFinderPage
- hospital detail components
- hospital recommendation displays

New flow:

Geographic search
→ real coordinates
→ hospital discovery
→ stable hospital identity/matching
→ request MediFlow operational record
→ display operational data if available

If no MediFlow record:
"Operational data not available"

Never fabricate:
- beds
- ICU
- wait time
- doctors
- ambulance count
- emergency capacity

Remove only the hardcoded operational-data source after the backend replacement is verified.

Keep a temporary compatibility adapter only if required during migration, and mark it clearly for removal.
```

---

# Phase 4 — Staff UI → Real Backend

### Simple explanation
This is where the Hospital Staff dashboard becomes real. When staff changes beds, doctors, rooms, ICU, or ambulances, the change is saved in PostgreSQL rather than only changing the screen.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 4: HOSPITAL STAFF REAL DATA MANAGEMENT

Connect the Hospital Staff interface to the FastAPI backend.

Staff must be able to manage only their assigned hospital.

Connect:
- hospital details
- doctors
- rooms
- beds
- ICU
- emergency rooms
- ambulances
- operational status
- ER load
- wait time where supported by backend contract

For every update:

UI
→ API request
→ FastAPI authorization
→ PostgreSQL
→ API response
→ frontend state refresh

Do NOT treat localStorage as the source of truth.

After successful mutation:
- update UI from server response
- show success state
- invalidate/refetch affected data

On failure:
- show useful error
- preserve previous valid UI state
- do not pretend save succeeded

Disable editing controls while save is in progress where appropriate.

Never allow frontend role/hospital_id manipulation to bypass backend authorization.

Do not redesign the existing staff dashboard unnecessarily.
```

---

# Phase 5 — Patient ↔ Staff Synchronization

### Simple explanation
Now we prove the main full-stack idea: staff changes hospital information, and the patient sees that same information from the database.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 5: REAL-TIME-ISH PATIENT/STAFF DATA SYNCHRONIZATION

Implement reliable synchronization using API refetch/invalidation.

Required scenario:

Staff:
City Center Hospital
Available beds = 10

Patient:
opens City Center Hospital
sees 10

Staff:
changes available capacity according to actual bed records

Patient:
refreshes/refetches
sees updated server value

Requirements:
- backend remains source of truth
- frontend cache must not permanently override server values
- invalidate hospital operational data after staff mutation
- refresh when patient opens hospital details
- handle stale data with updated_at/last_updated where available
- display "Last updated" where useful
- do not claim real-time if using polling/refetch rather than websockets

Do not introduce WebSockets unless actually needed.
A robust request/refetch approach is sufficient for SIH.

Test:
Staff update → backend → patient fetch → same value.
```

---

# Phase 6 — Authentication UI Integration

### Simple explanation
The frontend login and role routing become connected to real backend authentication instead of fake/demo role switching.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 6: REAL AUTHENTICATION FRONTEND

Connect existing login UI to Gagan's FastAPI authentication endpoints.

Implement:
- login
- logout
- current user
- session restoration according to backend contract
- protected routes
- role-aware navigation
- loading state
- authentication error state
- expired-session handling

Roles:
PATIENT
HOSPITAL_STAFF
ADMIN

Requirements:
- do not trust frontend role for authorization
- frontend role only controls presentation/navigation
- backend remains authoritative
- never display or log passwords
- never log authentication tokens
- do not store sensitive credentials in source code

Preserve existing UI design as much as possible.

Test:
Patient login
Staff login
Admin login
Invalid login
Logout
Refresh page
Unauthorized route
Expired session
```

---

# Phase 7 — Emergency Workflow Integration

### Simple explanation
The emergency process moves from frontend-only demo state to persistent backend data: patient creates an emergency case, selects a hospital, and receives a real queue token.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 7: CONNECT EMERGENCY WORKFLOW TO BACKEND

Connect existing emergency UI to backend APIs.

Flow:

Patient enters emergency information
→ POST emergency case
→ AI-assisted prioritization result
→ hospital recommendations
→ patient selects hospital
→ selection stored
→ queue token created
→ patient sees token/status

Requirements:
- preserve existing emergency UI
- preserve AI-assisted prioritization wording
- do not call it AI diagnosis
- display priority/risk score only as appropriate
- backend is source of truth for emergency case and queue
- loading states
- error states
- retry where safe
- prevent duplicate emergency submissions
- prevent duplicate token creation from accidental double-clicks

Patient must only access their own case/token.

Hospital staff must see cases/tokens for their assigned hospital according to backend authorization.

Do not fabricate queue positions or emergency status.
```

---

# Phase 8 — Remove Remaining Operational Hardcoding

### Simple explanation
Once the backend works, we clean up the old prototype data. After this phase, refreshing the browser should not restore fake operational values from React code.

### Antigravity Prompt

```text id="n4d5v9"
MEDIFLOW — PARI PHASE 8: REMOVE FRONTEND OPERATIONAL DATA HARDCODING

Search the entire frontend again for operational hospital data.

Remove hardcoded sources for:
- hospitals
- doctors
- beds
- rooms
- ICU
- emergency rooms
- ambulances
- queues
- operational wait times
- operational capacity

EXCEPTION:
Geographic fallback/cache data may remain where intentionally designed.

The following must remain functional:
- GPS
- Geoapify
- LocationIQ
- hospital discovery
- search
- map markers
- routing

The frontend must obtain operational hospital information through the backend API.

If no backend record exists:
show:
"Operational data not available"

Do not replace hardcoded values with another hardcoded JSON file.

Run:
- TypeScript check
- build
- frontend tests
- search test
- hospital details test
- staff update test
```

---

# Phase 9 — Frontend Integration Testing

### Simple explanation
We test the complete user experience: patient and staff are now using the same backend database, while real map search continues working independently.

### Antigravity Prompt

```text
MEDIFLOW — PARI PHASE 9: FULL FRONTEND INTEGRATION TEST

Test the complete application.

PATIENT:
1. Login.
2. Allow GPS.
3. Search hospital.
4. Search area.
5. Select hospital.
6. View operational data.
7. Create emergency case.
8. Select hospital.
9. Receive queue token.
10. View queue status.

STAFF:
1. Login.
2. Open assigned hospital.
3. Update doctor.
4. Update bed.
5. Update room.
6. Update ICU.
7. Update ambulance.
8. Update operational status.
9. View emergency queue.

SYNC:
1. Staff changes hospital data.
2. Server saves it.
3. Patient refetches hospital.
4. Patient sees updated value.

SECURITY:
1. Staff cannot edit another hospital.
2. Patient cannot access another patient's emergency case.
3. Frontend cannot bypass backend permissions.

MAP:
1. GPS works.
2. Search works.
3. Geoapify works.
4. LocationIQ fallback works.
5. Search coordinates do not overwrite GPS.
6. Hospital discovery still works.
7. Routing still works.

NO FAKE DATA:
- no fake hospital discovery
- no fake operational values
- no fake queue values

Run build and TypeScript checks.

Do not claim PASS unless actually tested.
```

---

# Pari's Completion Rule

A phase is complete only when:
1. frontend builds,
2. TypeScript passes,
3. real API integration works where applicable,
4. no unintended hardcoded operational data remains,
5. existing map/search functionality still works,
6. the UI handles loading/error/empty states.
