"""Tests for real authentication and authorization (Phase 4).

Covers registration, role-specific login, safe credential handling, JWT
expiry/invalidity, staff hospital ownership enforcement, patient isolation from
staff/admin endpoints, admin-only management operations, and CORS restrictions.
"""

from app.core.security import hash_password
from app.models import (
    Doctor,
    DoctorStatus,
    Hospital,
    HospitalStaff,
    HospitalStatus,
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


def _connect_staff(db, user_id: str, hospital_id: str) -> None:
    db.add(HospitalStaff(user_id=user_id, hospital_id=hospital_id, staff_role="Nurse"))
    db.commit()


def _login(client, email: str, password: str):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )


# ─── Registration ────────────────────────────────────────────────────────────


def test_register_patient_success(client) -> None:
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "new.patient@mediflow.ai",
            "password": "securepass123",
            "full_name": "Sara Patient",
            "phone": "+91 90000 00000",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new.patient@mediflow.ai"
    assert body["role"] == "PATIENT"
    assert "password_hash" not in resp.text
    assert "password" not in resp.text


def test_register_rejects_role_assignment(client) -> None:
    resp = client.post(
        "/api/auth/register",
        json={
            "email": "sneaky@mediflow.ai",
            "password": "securepass123",
            "full_name": "Sneaky User",
            "role": "ADMIN",
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_register_duplicate_email_returns_409(client) -> None:
    payload = {
        "email": "dup@mediflow.ai",
        "password": "securepass123",
        "full_name": "Dup User",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 201
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "conflict"


def test_register_short_password_rejected(client) -> None:
    resp = client.post(
        "/api/auth/register",
        json={"email": "weak@mediflow.ai", "password": "short", "full_name": "Weak"},
    )
    assert resp.status_code == 422


def test_register_stored_hash_not_plaintext(db, client) -> None:
    client.post(
        "/api/auth/register",
        json={
            "email": "check@mediflow.ai",
            "password": "securepass123",
            "full_name": "Check",
        },
    )
    from sqlalchemy import select

    from app.models import User

    user = db.scalar(select(User).where(User.email == "check@mediflow.ai"))
    assert user.password_hash != "securepass123"
    assert user.password_hash.startswith("$2")


# ─── Login per role ──────────────────────────────────────────────────────────


def test_login_patient(client, user_factory) -> None:
    user_factory(email="patient@test.com", role=UserRole.PATIENT)
    resp = _login(client, "patient@test.com", "password123")
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] > 0
    assert body["user"]["email"] == "patient@test.com"
    assert body["user"]["role"] == "PATIENT"
    assert "password_hash" not in resp.text


def test_login_staff(client, user_factory) -> None:
    user_factory(email="staff@test.com", role=UserRole.HOSPITAL_STAFF)
    resp = _login(client, "staff@test.com", "password123")
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "HOSPITAL_STAFF"


def test_login_admin(client, user_factory) -> None:
    user_factory(email="admin@test.com", role=UserRole.ADMIN)
    resp = _login(client, "admin@test.com", "password123")
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "ADMIN"


def test_login_email_is_case_insensitive(client, user_factory) -> None:
    user_factory(email="case@test.com", role=UserRole.ADMIN)
    resp = _login(client, "CASE@TEST.COM", "password123")
    assert resp.status_code == 200


# ─── Invalid credentials and safe errors ─────────────────────────────────────


def test_login_invalid_password_returns_401(client, user_factory) -> None:
    user_factory(email="patient@test.com", role=UserRole.PATIENT)
    resp = _login(client, "patient@test.com", "wrong-password")
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "unauthorized"
    assert body["error"]["message"] == "Invalid email or password"


def test_login_unknown_email_returns_same_401(client) -> None:
    resp = _login(client, "nobody@test.com", "password123")
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Invalid email or password"


def test_login_user_not_found_by_unverified_password_algorithm(client, user_factory) -> None:
    user_factory(email="patient@test.com", role=UserRole.PATIENT)
    resp = _login(client, "patient@test.com", "password123 ").status_code
    assert resp == 401


# ─── /api/auth/me ────────────────────────────────────────────────────────────


def test_me_returns_current_user(client, user_factory, auth_headers) -> None:
    user = user_factory(email="me@test.com", role=UserRole.ADMIN)
    resp = client.get("/api/auth/me", headers=auth_headers(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == user.id
    assert body["email"] == "me@test.com"
    assert body["role"] == "ADMIN"
    assert "password_hash" not in resp.text


def test_me_without_token_returns_401(client) -> None:
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_me_with_invalid_token_returns_401(client) -> None:
    resp = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer garbage.token.value"}
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_me_with_expired_token_returns_401(client, user_factory, auth_headers) -> None:
    user = user_factory(email="old@test.com", role=UserRole.PATIENT)
    resp = client.get("/api/auth/me", headers=auth_headers(user, expires_minutes=-1))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_me_after_user_deleted_returns_401(client, db, user_factory, auth_headers) -> None:
    user = user_factory(email="ghost@test.com", role=UserRole.PATIENT)
    headers = auth_headers(user)
    db.delete(user)
    db.commit()

    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 401


# ─── Staff hospital ownership ────────────────────────────────────────────────


def test_staff_accesses_own_hospital(client, db, user_factory, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = user_factory(email="own@test.com", role=UserRole.HOSPITAL_STAFF)
    _connect_staff(db, staff.id, hospital.id)

    resp = client.get("/api/staff/my-hospital", headers=auth_headers(staff))
    assert resp.status_code == 200
    assert resp.json()["hospital"]["id"] == hospital.id


def test_staff_cannot_modify_another_hospital(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    doctor_hosp_a = Doctor(
        id="doc-a",
        hospital_id="hosp-a",
        name="Dr. A",
        specialty="Cardiology",
        status=DoctorStatus.AVAILABLE,
    )
    db.add(doctor_hosp_a)
    db.commit()

    staff_b = user_factory(email="boss@test.com", role=UserRole.HOSPITAL_STAFF)
    _connect_staff(db, staff_b.id, "hosp-b")

    resp = client.put(
        "/api/staff/doctors/doc-a",
        json={"status": "BUSY"},
        headers=auth_headers(staff_b),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_patient_cannot_access_staff_endpoint(client, db, user_factory, auth_headers) -> None:
    hospital = _seed_hospital(db)
    patient = user_factory(email="patient@own.com", role=UserRole.PATIENT)

    resp = client.get("/api/staff/my-hospital", headers=auth_headers(patient))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_patient_cannot_update_staff_operations(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db)
    patient = user_factory(email="p2@own.com", role=UserRole.PATIENT)

    resp = client.put(
        "/api/staff/operations",
        json={"current_er_load": 1},
        headers=auth_headers(patient),
    )
    assert resp.status_code == 403


def test_staff_hospital_never_taken_from_body(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    staff = user_factory(email="owning@test.com", role=UserRole.HOSPITAL_STAFF)
    _connect_staff(db, staff.id, "hosp-a")

    resp = client.post(
        "/api/staff/doctors",
        json={
            "name": "Dr. Sneaky",
            "specialty": "Ortho",
            "hospital_id": "hosp-b",
        },
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    assert resp.json()["hospital_id"] == "hosp-a"
    assert resp.json()["hospital_id"] != "hosp-b"


# ─── Admin-only management operations ────────────────────────────────────────


def test_admin_can_list_users(client, db, user_factory, auth_headers) -> None:
    user_factory(email="u1@test.com", role=UserRole.PATIENT)
    user_factory(email="u2@test.com", role=UserRole.HOSPITAL_STAFF)
    admin = user_factory(email="admin@test.com", role=UserRole.ADMIN)

    resp = client.get("/api/admin/users", headers=auth_headers(admin))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    roles = {item["role"] for item in body["items"]}
    assert roles == {"PATIENT", "HOSPITAL_STAFF", "ADMIN"}


def test_admin_can_assign_staff_role(client, db, user_factory, auth_headers) -> None:
    user = user_factory(email="promote@test.com", role=UserRole.PATIENT)
    admin = user_factory(email="the-admin@test.com", role=UserRole.ADMIN)

    resp = client.patch(
        f"/api/admin/users/{user.id}/role",
        json={"role": "HOSPITAL_STAFF"},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "HOSPITAL_STAFF"


def test_admin_cannot_change_own_role(client, user_factory, auth_headers) -> None:
    admin = user_factory(email="solo-admin@test.com", role=UserRole.ADMIN)
    resp = client.patch(
        f"/api/admin/users/{admin.id}/role",
        json={"role": "PATIENT"},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 400


def test_patient_cannot_access_admin_endpoints(client, user_factory, auth_headers) -> None:
    patient = user_factory(role=UserRole.PATIENT)
    resp = client.get("/api/admin/users", headers=auth_headers(patient))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_staff_cannot_access_admin_endpoints(client, user_factory, auth_headers) -> None:
    staff = user_factory(role=UserRole.HOSPITAL_STAFF)
    resp = client.get("/api/admin/users", headers=auth_headers(staff))
    assert resp.status_code == 403


def test_admin_cannot_access_staff_endpoints(client, db, user_factory, auth_headers) -> None:
    _seed_hospital(db)
    admin = user_factory(role=UserRole.ADMIN)
    resp = client.get("/api/staff/my-hospital", headers=auth_headers(admin))
    assert resp.status_code == 403


# ─── CORS restriction ────────────────────────────────────────────────────────


def test_cors_allows_known_frontend_origin(client) -> None:
    resp = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_rejects_unknown_origin(client) -> None:
    resp = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in resp.headers