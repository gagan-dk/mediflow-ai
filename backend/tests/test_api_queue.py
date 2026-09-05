"""Tests for the hospital queue APIs.

Covers staff queue access, cross-hospital access denial, deterministic queue
ordering, patient view of their own queue info, and invalid token operations.
"""

from app.models import (
    EmergencyCase,
    Hospital,
    HospitalStaff,
    HospitalStatus,
    Patient,
    QueueStatus,
    QueueToken,
    Severity,
    UserRole,
)
from app.core.security import hash_password


def _seed_hospital(db, hospital_id: str = "hosp-a", name: str = "Hospital A") -> Hospital:
    hospital = Hospital(
        id=hospital_id,
        name=name,
        address=f"{name} Address",
        city="Bangalore",
        state="Karnataka",
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


def _seed_staff(db, hospital_id: str, email: str = "staff@test.com"):
    from app.models import User

    staff = User(
        email=email,
        password_hash=hash_password("password123"),
        full_name="Staff User",
        role=UserRole.HOSPITAL_STAFF,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    db.add(
        HospitalStaff(
            user_id=staff.id,
            hospital_id=hospital_id,
            staff_role="Emergency Physician",
        )
    )
    db.commit()
    return staff


def _seed_patient(db, user_id: str, name: str = "Test Patient") -> Patient:
    patient = Patient(user_id=user_id, name=name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def _seed_emergency(
    db, patient_id: str, case_id: str = "case-a", severity: Severity = Severity.HIGH
) -> EmergencyCase:
    case = EmergencyCase(
        id=case_id,
        patient_id=patient_id,
        reported_symptoms="Chest pain",
        age=45,
        latitude=12.97,
        longitude=77.59,
        severity=severity,
        priority_score=80.0,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def _seed_token(
    db,
    hospital_id: str,
    case_id: str | None = None,
    token_id: str = "tok-a",
    token_number: str = "TOK-0001",
    priority_level: int = 3,
    queue_position: int = 1,
    status: QueueStatus = QueueStatus.WAITING,
) -> QueueToken:
    token = QueueToken(
        id=token_id,
        hospital_id=hospital_id,
        emergency_case_id=case_id,
        token_number=token_number,
        priority_level=priority_level,
        queue_position=queue_position,
        status=status,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


# ─── Unauthorized access ─────────────────────────────────────────────────────


def test_queue_view_without_token_returns_401(client, db) -> None:
    _seed_hospital(db)
    resp = client.get("/api/queue/hosp-a")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


# ─── Staff queue access ──────────────────────────────────────────────────────


def test_staff_queue_access_own_hospital(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    _seed_token(db, hospital.id, status=QueueStatus.WAITING)

    resp = client.get("/api/queue/hosp-a", headers=auth_headers(staff))
    assert resp.status_code == 200
    body = resp.json()
    assert body["view"] == "staff"
    assert body["hospital_id"] == hospital.id
    assert len(body["items"]) == 1


def test_cross_hospital_queue_access_denied(client, db, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    staff = _seed_staff(db, "hosp-b", "staff-b@test.com")

    resp = client.get("/api/queue/hosp-a", headers=auth_headers(staff))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_staff_without_assignment_queue_denied(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db)
    staff = user_factory(role=UserRole.HOSPITAL_STAFF)
    resp = client.get("/api/queue/hosp-a", headers=auth_headers(staff))
    assert resp.status_code == 403


# ─── Issue queue token (staff) ───────────────────────────────────────────────


def test_issue_queue_token_cross_hospital_denied(client, db, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    staff = _seed_staff(db, "hosp-b", "staff-b@test.com")

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_issue_queue_token_from_case_severity(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    patient = _seed_patient(db, "user-p")
    _seed_emergency(db, patient.id, "case-critical", Severity.CRITICAL)

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={"emergency_case_id": "case-critical"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["priority_level"] == 4
    assert body["hospital_id"] == hospital.id


def test_issue_queue_token_walk_in_uses_low_priority(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    assert resp.json()["priority_level"] == 1


def test_issue_queue_token_unknown_case_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={"emergency_case_id": "ghost"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_issue_queue_token_duplicate_case_returns_existing_token(
    client, db, auth_headers
) -> None:
    """A case may hold only one token per hospital (unique constraint)."""
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    patient = _seed_patient(db, "user-p")
    case = _seed_emergency(db, patient.id, "case-a", Severity.HIGH)
    _seed_token(db, hospital.id, case.id, "tok-a", "TOK-0001", priority_level=3, queue_position=1)

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={"emergency_case_id": "case-a"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    assert resp.json()["id"] == "tok-a"
    assert resp.json()["token_number"] == "TOK-0001"


# ─── Deterministic queue ordering ────────────────────────────────────────────


def test_queue_orders_by_priority_desc_then_created(client, db, auth_headers) -> None:
    """Critical/HIGH cases sort ahead of MODERATE/LOW deterministically."""
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    patient = _seed_patient(db, "user-p")

    low = _seed_emergency(db, patient.id, "case-low", Severity.LOW)
    critical = _seed_emergency(db, patient.id, "case-critical", Severity.CRITICAL)
    _seed_token(db, hospital.id, low.id, "tok-low", "TOK-0001", priority_level=1, queue_position=1)
    _seed_token(db, hospital.id, critical.id, "tok-crit", "TOK-0002", priority_level=4, queue_position=2)

    resp = client.get("/api/queue/hosp-a", headers=auth_headers(staff))
    body = resp.json()
    levels = [item["priority_level"] for item in body["items"]]
    positions = [item["queue_position"] for item in body["items"]]
    assert levels == [4, 1]
    assert positions == [1, 2]


def test_client_cannot_reorder_critical_priority(
    client, db, user_factory, auth_headers
) -> None:
    """A client cannot inject a priority_level to reorder the queue."""
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/queue/hosp-a/tokens",
        json={"emergency_case_id": None, "priority_level": 4},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


# ─── Patient queue view ──────────────────────────────────────────────────────


def test_patient_sees_only_own_queue_info(client, db, user_factory, auth_headers) -> None:
    hospital = _seed_hospital(db)
    me = user_factory(role=UserRole.PATIENT)
    me_patient = _seed_patient(db, me.id, "Me")
    other_patient = _seed_patient(db, "other-user", "Other")

    my_case = _seed_emergency(db, me_patient.id, "case-mine", Severity.HIGH)
    other_case = _seed_emergency(db, other_patient.id, "case-theirs", Severity.CRITICAL)
    _seed_token(db, hospital.id, my_case.id, "tok-mine", "TOK-0001", priority_level=3, queue_position=1)
    _seed_token(db, hospital.id, other_case.id, "tok-theirs", "TOK-0002", priority_level=4, queue_position=2)

    resp = client.get("/api/queue/hosp-a", headers=auth_headers(me))
    assert resp.status_code == 200
    body = resp.json()
    assert body["view"] == "patient"
    token_ids = [item["id"] for item in body["items"]]
    assert token_ids == ["tok-mine"]
    # Other patient's data must not leak
    for item in body["items"]:
        assert "Theirs" not in (item["patient_name"] or "")


def test_patient_without_token_sees_empty_queue(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db)
    me = user_factory(role=UserRole.PATIENT)
    _seed_patient(db, me.id)
    resp = client.get("/api/queue/hosp-a", headers=auth_headers(me))
    assert resp.status_code == 200
    assert resp.json()["items"] == []


# ─── Invalid token operations ────────────────────────────────────────────────


def test_update_token_status_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    _seed_token(db, hospital.id, status=QueueStatus.WAITING)

    resp = client.put(
        "/api/queue/tokens/tok-a/status",
        json={"status": "CALLED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CALLED"
    assert resp.json()["called_at"] is not None


def test_update_token_status_cross_hospital_denied(client, db, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    staff = _seed_staff(db, "hosp-b", "staff-b@test.com")
    _seed_token(db, "hosp-a", status=QueueStatus.WAITING)

    resp = client.put(
        "/api/queue/tokens/tok-a/status",
        json={"status": "CALLED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_update_token_status_invalid_transition(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    _seed_token(db, hospital.id, status=QueueStatus.WAITING)

    resp = client.put(
        "/api/queue/tokens/tok-a/status",
        json={"status": "COMPLETED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "conflict"


def test_update_token_status_invalid_value_422(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    _seed_token(db, hospital.id, status=QueueStatus.WAITING)

    resp = client.put(
        "/api/queue/tokens/tok-a/status",
        json={"status": "NOT_A_STATUS"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_update_token_status_unknown_token_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/queue/tokens/ghost/status",
        json={"status": "CALLED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_full_transition_flow(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)
    _seed_token(db, hospital.id, status=QueueStatus.WAITING)

    headers = auth_headers(staff)
    resp = client.put("/api/queue/tokens/tok-a/status", json={"status": "CALLED"}, headers=headers)
    assert resp.json()["status"] == "CALLED"
    resp = client.put("/api/queue/tokens/tok-a/status", json={"status": "IN_PROGRESS"}, headers=headers)
    assert resp.json()["status"] == "IN_PROGRESS"
    resp = client.put("/api/queue/tokens/tok-a/status", json={"status": "COMPLETED"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "COMPLETED"
    assert resp.json()["completed_at"] is not None

    # Terminal: no further transitions allowed
    resp = client.put("/api/queue/tokens/tok-a/status", json={"status": "CANCELLED"}, headers=headers)
    assert resp.status_code == 409
