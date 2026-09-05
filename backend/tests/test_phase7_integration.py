"""Phase 7 — Full backend integration test cycle (in-process HTTP).

Executes the complete MediFlow backend scenario through the real HTTP API
(TestClient over a persistent file-backed SQLite database) and the full
edge-case matrix required by Phase 7:

- Scenario steps 1-15 (patient/staff lifecycle, bed update, cross-hospital
  denial, emergency case, hospital selection, queue tokens, queue views)
- database state verification after every write
- invalid input
- duplicate seed execution
- missing required fields
- invalid hospital IDs
- unauthorized requests
- CORS
- API health

Every assertion runs against real API responses and real database rows; no
result is mocked or assumed.
"""

import contextlib
import io

from sqlalchemy import func, select

from app.models import (
    Bed,
    BedStatus,
    Hospital,
    HospitalStaff,
    HospitalStatus,
    QueueStatus,
    QueueToken,
    Room,
    RoomStatus,
    User,
    UserRole,
)
from app.seed.seed_database import seed_database


def _seed_hospital(db, hospital_id: str, name: str) -> Hospital:
    hospital = Hospital(
        id=hospital_id,
        name=name,
        registration_number=f"REG-{hospital_id}",
        address=f"{name} Address",
        city="Bangalore",
        state="Karnataka",
        postal_code="560001",
        latitude=12.9716,
        longitude=77.5946,
        phone="+91 80 0000 0000",
        email=f"contact@{hospital_id}.test",
        emergency_available=True,
        status=HospitalStatus.ACTIVE,
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


def _seed_room_bed(db, hospital_id: str, room_number: str, bed_number: str) -> Bed:
    room = Room(
        id=f"room-{room_number}",
        hospital_id=hospital_id,
        room_number=room_number,
        room_type="Emergency Room",
        floor="Ground Floor",
        status=RoomStatus.AVAILABLE,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    bed = Bed(
        id=f"bed-{bed_number}",
        hospital_id=hospital_id,
        room_id=room.id,
        bed_number=bed_number,
        bed_type="General",
        status=BedStatus.AVAILABLE,
    )
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


def _register(client, email: str, password: str, full_name: str):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )


def _login(client, email: str, password: str):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _row_count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


# ─── Scenario 1-15: the complete lifecycle ───────────────────────────────────


def test_full_backend_scenario(client, db, user_factory) -> None:
    """Steps 1-15 of the Phase 7 scenario, executed end-to-end."""
    patient_email = "patient-e2e@test.com"
    staff_email = "staff-e2e@test.com"
    patient_password = "patient-secret-1"
    staff_password = "staff-secret-1"

    # Step 1 — Create/login patient.
    reg = _register(client, patient_email, patient_password, "E2E Patient")
    assert reg.status_code == 201, reg.text
    patient_login = _login(client, patient_email, patient_password)
    assert patient_login.status_code == 200, patient_login.text
    patient_token = patient_login.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    assert patient_login.json()["user"]["role"] == "PATIENT"

    # Step 2 — Create/login hospital staff (register via API, onboard via admin).
    reg_staff = _register(client, staff_email, staff_password, "E2E Staff")
    assert reg_staff.status_code == 201, reg_staff.text
    staff_user_id = reg_staff.json()["id"]

    admin = user_factory(role=UserRole.ADMIN, email="admin-e2e@test.com")
    admin_login = _login(client, "admin-e2e@test.com", "password123")
    assert admin_login.status_code == 200, admin_login.text
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    promote = client.patch(
        f"/api/admin/users/{staff_user_id}/role",
        json={"role": "HOSPITAL_STAFF"},
        headers=admin_headers,
    )
    assert promote.status_code == 200, promote.text
    staff_login = _login(client, staff_email, staff_password)
    assert staff_login.status_code == 200, staff_login.text
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}
    assert staff_login.json()["user"]["role"] == "HOSPITAL_STAFF"

    # Step 3 — Staff is assigned to Hospital A (server-side assignment record).
    hosp_a = _seed_hospital(db, "hosp-a", "Hospital A")
    with contextlib.suppress(Exception):  # guard if assignment already present
        db.add(
            HospitalStaff(
                id="hs-e2e-a",
                user_id=staff_user_id,
                hospital_id=hosp_a.id,
                staff_role="Emergency Physician",
            )
        )
        db.commit()
    my_hospital = client.get("/api/staff/my-hospital", headers=staff_headers)
    assert my_hospital.status_code == 200, my_hospital.text
    assert my_hospital.json()["hospital"]["id"] == hosp_a.id

    # Step 4 — Staff updates beds at Hospital A (create room+bed via API, then update).
    created_room = client.post(
        "/api/staff/rooms",
        json={"room_number": "ER-101", "room_type": "Emergency Room", "floor": "Ground Floor"},
        headers=staff_headers,
    )
    assert created_room.status_code == 201, created_room.text
    room_a = created_room.json()
    created_bed = client.post(
        "/api/staff/beds",
        json={"bed_number": "B-101", "bed_type": "General", "room_id": room_a["id"]},
        headers=staff_headers,
    )
    assert created_bed.status_code == 201, created_bed.text
    bed_a = created_bed.json()
    assert bed_a["hospital_id"] == hosp_a.id

    updated = client.put(
        f"/api/staff/beds/{bed_a['id']}",
        json={"status": "MAINTENANCE"},
        headers=staff_headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "MAINTENANCE"

    # Step 5 — Verify database changed.
    bed_row = db.get(Bed, bed_a["id"])
    assert bed_row is not None
    assert bed_row.status.value == "MAINTENANCE"

    # Step 6 — Patient reads Hospital A.
    patient_read = client.get(f"/api/hospitals/{hosp_a.id}/beds", headers=patient_headers)
    assert patient_read.status_code == 200, patient_read.text

    # Step 7 — Patient sees the updated value.
    patient_bed = next(b for b in patient_read.json()["items"] if b["id"] == bed_a["id"])
    assert patient_bed["status"] == "MAINTENANCE"

    # Step 8 — Staff attempts Hospital B update.
    hosp_b = _seed_hospital(db, "hosp-b", "Hospital B")
    bed_b = _seed_room_bed(db, hosp_b.id, "ER-201", "B-201")
    forbidden = client.put(
        f"/api/staff/beds/{bed_b.id}",
        json={"status": "OCCUPIED"},
        headers=staff_headers,
    )

    # Step 9 — Verify 403/authorization failure.
    assert forbidden.status_code == 403, forbidden.text
    assert forbidden.json()["error"]["code"] == "forbidden"
    # and the Hospital B bed was NOT modified
    assert db.get(Bed, bed_b.id).status.value == "AVAILABLE"

    # Step 10 — Patient creates emergency case.
    case_resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Severe chest pain and shortness of breath",
            "age": 47,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "severity": "HIGH",
        },
        headers=patient_headers,
    )
    assert case_resp.status_code == 201, case_resp.text
    case = case_resp.json()
    assert case["severity"] == "HIGH"
    assert case["priority_score"] == 80.0

    # Step 11 — Emergency case is stored.
    from app.models import EmergencyCase

    case_rows = db.scalars(
        select(EmergencyCase).where(EmergencyCase.id == case["id"])
    ).all()
    assert len(case_rows) == 1
    assert case_rows[0].patient_id == case["patient_id"]
    stored = client.get(
        f"/api/emergency-cases/{case['id']}", headers=patient_headers
    )
    assert stored.status_code == 200

    # Step 12 — Hospital selection is stored.
    selection = client.post(
        f"/api/emergency-cases/{case['id']}/hospital-selection",
        json={"hospital_id": hosp_a.id},
        headers=patient_headers,
    )
    assert selection.status_code == 201, selection.text
    token = selection.json()
    assert token["hospital_id"] == hosp_a.id

    # Step 13 — Queue token is created.
    tokens = db.scalars(
        select(QueueToken).where(
            QueueToken.hospital_id == hosp_a.id,
            QueueToken.emergency_case_id == case["id"],
        )
    ).all()
    assert len(tokens) == 1
    assert tokens[0].token_number == "TOK-0001"
    assert tokens[0].priority_level == 3
    assert tokens[0].status == QueueStatus.WAITING

    # Step 14 — Staff views hospital queue.
    staff_queue = client.get(f"/api/queue/{hosp_a.id}", headers=staff_headers)
    assert staff_queue.status_code == 200, staff_queue.text
    assert staff_queue.json()["view"] == "staff"
    staff_items = staff_queue.json()["items"]
    assert len(staff_items) == 1
    assert staff_items[0]["token_number"] == "TOK-0001"
    assert staff_items[0]["queue_position"] == 1

    # Step 15 — Patient views their queue.
    patient_queue = client.get(f"/api/queue/{hosp_a.id}", headers=patient_headers)
    assert patient_queue.status_code == 200, patient_queue.text
    assert patient_queue.json()["view"] == "patient"
    patient_items = patient_queue.json()["items"]
    assert len(patient_items) == 1
    assert patient_items[0]["id"] == tokens[0].id
    assert patient_items[0]["queue_position"] == 1


# ─── Database state persistence (Scenario step 5 deep check) ─────────────────


def test_writes_persist_durably_to_database_file(client, db, user_factory, auth_headers) -> None:
    """A staff bed write is durable in the backing database, not just in memory."""
    hosp = _seed_hospital(db, "hosp-durable", "Durable Hospital")
    staff = User(
        email="durable-staff@test.com",
        password_hash="$2b$12$durableplaceholderhash000000000000000000000000000000",
        full_name="Durable Staff",
        role=UserRole.HOSPITAL_STAFF,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    db.add(
        HospitalStaff(
            user_id=staff.id, hospital_id=hosp.id, staff_role="Nurse"
        )
    )
    db.commit()

    headers = auth_headers(staff)

    room = client.post(
        "/api/staff/rooms",
        json={"room_number": "DR-01", "room_type": "Ward"},
        headers=headers,
    )
    assert room.status_code == 201
    bed = client.post(
        "/api/staff/beds",
        json={"bed_number": "D-01", "bed_type": "General", "room_id": room.json()["id"]},
        headers=headers,
    )
    assert bed.status_code == 201
    update = client.put(
        f"/api/staff/beds/{bed.json()['id']}",
        json={"status": "RESERVED"},
        headers=headers,
    )
    assert update.status_code == 200

    rows = db.scalars(select(Bed).where(Bed.hospital_id == hosp.id)).all()
    assert len(rows) == 1
    assert rows[0].status.value == "RESERVED"


# ─── Duplicate seed execution ────────────────────────────────────────────────


def test_seed_execution_is_idempotent() -> None:
    """Running the seed twice must not duplicate hospitals/users/beds.

    Each count set is read from a freshly opened session (started and committed
    after each seed run) so the second seed run's writes on its own connection
    are observable and a false equality cannot hide duplication.
    """
    import os

    from app.core.database import SessionLocal
    from app.seed.seed_database import seed_database

    def _counts() -> dict[str, int]:
        session = SessionLocal()
        try:
            counts = {
                "hospitals": _row_count(session, Hospital),
                "users": _row_count(session, User),
                "beds": _row_count(session, Bed),
            }
            session.commit()
            return counts
        finally:
            session.close()

    previous = (
        os.environ.get("MEDIFLOW_SEED_PASSWORD"),
        os.environ.get("MEDIFLOW_SEED_ADMIN_PASSWORD"),
    )
    os.environ["MEDIFLOW_SEED_PASSWORD"] = "phase7-test-seed-password"
    os.environ["MEDIFLOW_SEED_ADMIN_PASSWORD"] = "phase7-test-admin-password"
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            seed_database(drop_first=False)
            counts_first = _counts()
            seed_database(drop_first=False)
            counts_second = _counts()
    finally:
        for key, value in zip(
            ("MEDIFLOW_SEED_PASSWORD", "MEDIFLOW_SEED_ADMIN_PASSWORD"), previous
        ):
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    assert counts_first == counts_second, f"{counts_first} != {counts_second}"
    assert counts_first["hospitals"] == 6
    assert counts_first["users"] == 3
    assert counts_first["beds"] == 244


# ─── API health ──────────────────────────────────────────────────────────────


def test_api_health_endpoints(client) -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert body["version"]

    db_health = client.get("/api/health/db")
    assert db_health.status_code == 200
    assert db_health.json() == {"status": "ok"}

    ready = client.get("/api/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert ready.json()["checks"]["database"] == "connected"


# ─── CORS ────────────────────────────────────────────────────────────────────


def test_cors_allows_frontend_origins(client) -> None:
    for origin in ("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"):
        resp = client.options(
            "/api/hospitals",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_rejects_unknown_origin(client) -> None:
    resp = client.options(
        "/api/hospitals",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers.get("access-control-allow-origin") is None


# ─── Invalid input ───────────────────────────────────────────────────────────


def test_invalid_input_rejected(client) -> None:
    short_password = _register(client, "short@test.com", "short", "Short Password")
    assert short_password.status_code == 422
    assert short_password.json()["error"]["code"] == "validation_error"

    bad_email = _register(client, "not-an-email", "password123", "Bad Email")
    assert bad_email.status_code == 422

    user = client.post(
        "/api/auth/register",
        json={
            "email": "wrongpass@test.com",
            "password": "password123",
            "full_name": "Wrong Pass",
        },
    )
    assert user.status_code == 201
    wrong_login = _login(client, "wrongpass@test.com", "definitely-wrong")
    assert wrong_login.status_code == 401
    assert wrong_login.json()["error"]["code"] == "unauthorized"

    unexpected_field = client.post(
        "/api/auth/register",
        json={
            "email": "extra@test.com",
            "password": "password123",
            "full_name": "Extra Field",
            "role": "ADMIN",
        },
    )
    assert unexpected_field.status_code == 422


# ─── Missing required fields ─────────────────────────────────────────────────


def test_missing_required_fields_return_422(client, user_factory, auth_headers) -> None:
    missing = client.post("/api/auth/register", json={})
    assert missing.status_code == 422
    assert missing.json()["error"]["code"] == "validation_error"
    fields = {d["field"] for d in missing.json()["error"]["details"]}
    assert {"email", "password", "full_name"} <= fields

    patient = user_factory(role=UserRole.PATIENT)
    headers = auth_headers(patient)
    case_missing = client.post(
        "/api/emergency-cases",
        json={"age": 40, "latitude": 0, "longitude": 0, "severity": "LOW"},
        headers=headers,
    )
    assert case_missing.status_code == 422


# ─── Invalid hospital IDs ────────────────────────────────────────────────────


def test_invalid_hospital_ids(client, user_factory, auth_headers) -> None:
    missing = client.get("/api/hospitals/does-not-exist")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"

    patient = user_factory(role=UserRole.PATIENT)
    headers = auth_headers(patient)
    case = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Pain",
            "age": 30,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "LOW",
        },
        headers=headers,
    )
    assert case.status_code == 201
    bad_selection = client.post(
        f"/api/emergency-cases/{case.json()['id']}/hospital-selection",
        json={"hospital_id": "no-such-hospital"},
        headers=headers,
    )
    assert bad_selection.status_code == 404
    assert bad_selection.json()["error"]["code"] == "not_found"


# ─── Unauthorized requests ───────────────────────────────────────────────────


def test_unauthorized_requests(client, user_factory, auth_headers) -> None:
    no_token_staff = client.get("/api/staff/my-hospital")
    assert no_token_staff.status_code == 401

    patient = user_factory(role=UserRole.PATIENT)
    staff_endpoint = client.get("/api/staff/my-hospital", headers=auth_headers(patient))
    assert staff_endpoint.status_code == 403
    assert staff_endpoint.json()["error"]["code"] == "forbidden"

    no_token_queue = client.get("/api/queue/whatever-hospital")
    assert no_token_queue.status_code == 401

    admin_route = client.get("/api/admin/users")
    assert admin_route.status_code == 401
    assert client.get("/api/admin/users", headers=auth_headers(patient)).status_code == 403

    garbage_token = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )
    assert garbage_token.status_code == 401