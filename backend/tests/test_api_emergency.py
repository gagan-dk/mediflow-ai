"""Tests for the emergency case APIs.

Covers the patient-facing emergency workflow: reporting a case, patient
ownership enforcement, listing one's own cases, and directing a case to a
destination hospital (which places it on the hospital queue).
"""

from app.models import (
    EmergencyCase,
    EmergencyCaseStatus,
    Hospital,
    HospitalStatus,
    Patient,
    Severity,
    UserRole,
)


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


# ─── Unauthorized access ─────────────────────────────────────────────────────


def test_create_emergency_without_token_returns_401(client, db) -> None:
    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Chest pain",
            "age": 40,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "HIGH",
        },
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


# ─── Create emergency case ───────────────────────────────────────────────────


def test_create_emergency_case_success(client, db, user_factory, auth_headers) -> None:
    user = user_factory(role=UserRole.PATIENT)

    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Chest pain and shortness of breath",
            "age": 45,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "severity": "HIGH",
        },
        headers=auth_headers(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["reported_symptoms"] == "Chest pain and shortness of breath"
    assert body["severity"] == "HIGH"
    assert body["priority_score"] == 80.0
    assert body["status"] == EmergencyCaseStatus.REPORTED.value
    assert body["patient_id"]


def test_create_emergency_case_derives_priority_score(client, db, user_factory, auth_headers) -> None:
    """The AI-assisted prioritization score is server-derived, not client-set."""
    user = user_factory(role=UserRole.PATIENT)

    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Unresponsive",
            "age": 70,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "CRITICAL",
        },
        headers=auth_headers(user),
    )
    assert resp.status_code == 201
    assert resp.json()["priority_score"] == 100.0


def test_create_emergency_case_rejects_priority_score(client, db, user_factory, auth_headers) -> None:
    """Clients cannot inject priority_score or priority_level."""
    user = user_factory(role=UserRole.PATIENT)

    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Chest pain",
            "age": 40,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "LOW",
            "priority_score": 999,
        },
        headers=auth_headers(user),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_create_emergency_case_invalid_severity_returns_422(
    client, db, user_factory, auth_headers
) -> None:
    user = user_factory(role=UserRole.PATIENT)
    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Chest pain",
            "age": 40,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "CRITICAL_BUT_FAKE",
        },
        headers=auth_headers(user),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_create_emergency_case_requires_symptoms(client, db, user_factory, auth_headers) -> None:
    user = user_factory(role=UserRole.PATIENT)
    resp = client.post(
        "/api/emergency-cases",
        json={"age": 40, "latitude": 12.97, "longitude": 77.59, "severity": "LOW"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 422


def test_non_patient_role_cannot_create_emergency_case(
    client, db, user_factory, auth_headers
) -> None:
    staff = user_factory(role=UserRole.HOSPITAL_STAFF)
    resp = client.post(
        "/api/emergency-cases",
        json={
            "reported_symptoms": "Pain",
            "age": 40,
            "latitude": 12.97,
            "longitude": 77.59,
            "severity": "LOW",
        },
        headers=auth_headers(staff),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


# ─── Patient ownership ───────────────────────────────────────────────────────


def test_get_emergency_case_owner_only(client, db, user_factory, auth_headers) -> None:
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "case-owner")

    resp = client.get("/api/emergency-cases/case-owner", headers=auth_headers(user))
    assert resp.status_code == 200
    assert resp.json()["id"] == "case-owner"


def test_get_emergency_case_other_patient_returns_404(
    client, db, user_factory, auth_headers
) -> None:
    owner = _seed_patient(db, "user-owner")
    _seed_emergency(db, owner.id, "case-secret")
    other = user_factory(role=UserRole.PATIENT)

    resp = client.get("/api/emergency-cases/case-secret", headers=auth_headers(other))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_get_missing_emergency_case_returns_404(client, db, user_factory, auth_headers) -> None:
    user = user_factory(role=UserRole.PATIENT)
    resp = client.get("/api/emergency-cases/ghost", headers=auth_headers(user))
    assert resp.status_code == 404


def test_hospital_selection_other_patient_returns_404(
    client, db, user_factory, auth_headers
) -> None:
    _seed_hospital(db)
    owner = _seed_patient(db, "user-owner")
    _seed_emergency(db, owner.id, "case-secret")
    other = user_factory(role=UserRole.PATIENT)

    resp = client.post(
        "/api/emergency-cases/case-secret/hospital-selection",
        json={"hospital_id": "hosp-a"},
        headers=auth_headers(other),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


# ─── List my emergency cases ─────────────────────────────────────────────────


def test_list_my_emergency_cases(client, db, user_factory, auth_headers) -> None:
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "case-1", Severity.HIGH)
    _seed_emergency(db, patient.id, "case-2", Severity.LOW)

    resp = client.get("/api/patients/me/emergency-cases", headers=auth_headers(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    ids = {item["id"] for item in body["items"]}
    assert ids == {"case-1", "case-2"}


def test_list_my_emergency_cases_excludes_other_patients(
    client, db, user_factory, auth_headers
) -> None:
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "mine")
    other = _seed_patient(db, "other-user")
    _seed_emergency(db, other.id, "theirs")

    resp = client.get("/api/patients/me/emergency-cases", headers=auth_headers(user))
    body = resp.json()
    ids = {item["id"] for item in body["items"]}
    assert ids == {"mine"}


def test_list_my_emergency_cases_empty_when_no_profile(
    client, db, user_factory, auth_headers
) -> None:
    user = user_factory(role=UserRole.PATIENT)
    resp = client.get("/api/patients/me/emergency-cases", headers=auth_headers(user))
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_list_my_emergency_cases_requires_patient_role(
    client, db, user_factory, auth_headers
) -> None:
    staff = user_factory(role=UserRole.HOSPITAL_STAFF)
    resp = client.get("/api/patients/me/emergency-cases", headers=auth_headers(staff))
    assert resp.status_code == 403


# ─── Hospital selection ──────────────────────────────────────────────────────


def test_hospital_selection_success(client, db, user_factory, auth_headers) -> None:
    hospital = _seed_hospital(db)
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "case-a", Severity.HIGH)

    resp = client.post(
        "/api/emergency-cases/case-a/hospital-selection",
        json={"hospital_id": hospital.id},
        headers=auth_headers(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["hospital_id"] == hospital.id
    assert body["emergency_case_id"] == "case-a"
    assert body["priority_level"] == 3
    assert body["token_number"].startswith("TOK-")


def test_hospital_selection_unknown_hospital_returns_404(
    client, db, user_factory, auth_headers
) -> None:
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "case-a")

    resp = client.post(
        "/api/emergency-cases/case-a/hospital-selection",
        json={"hospital_id": "no-such-hospital"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_hospital_selection_is_idempotent(client, db, user_factory, auth_headers) -> None:
    hospital = _seed_hospital(db)
    user = user_factory(role=UserRole.PATIENT)
    patient = _seed_patient(db, user.id)
    _seed_emergency(db, patient.id, "case-a", Severity.HIGH)

    headers = auth_headers(user)
    first = client.post(
        "/api/emergency-cases/case-a/hospital-selection",
        json={"hospital_id": hospital.id},
        headers=headers,
    )
    second = client.post(
        "/api/emergency-cases/case-a/hospital-selection",
        json={"hospital_id": hospital.id},
        headers=headers,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
