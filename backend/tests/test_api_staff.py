"""Tests for the staff write/management APIs.

Every test exercises real authentication: staff users are created with hashed
passwords, assigned to a hospital via `hospital_staff`, and call the API with a
valid JWT access token. Coverage includes unauthorized access (no/invalid
token), success paths, validation failures, and cross-hospital denial (403).
"""

from app.models import (
    Doctor,
    DoctorStatus,
    Hospital,
    HospitalOperation,
    HospitalStaff,
    HospitalStatus,
    Room,
    RoomStatus,
    User,
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


def _seed_operation(db, hospital_id: str) -> None:
    db.add(
        HospitalOperation(
            id=f"op-{hospital_id}",
            hospital_id=hospital_id,
            current_er_load=10,
            estimated_wait_minutes=5,
            available_ambulances=1,
        )
    )
    db.commit()


def _seed_doctor(db, hospital_id: str, doctor_id: str = "doc-a") -> Doctor:
    doctor = Doctor(
        id=doctor_id,
        hospital_id=hospital_id,
        name="Dr. Test",
        specialty="Cardiology",
        status=DoctorStatus.AVAILABLE,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def _seed_staff(db, hospital_id: str, email: str = "staff@test.com") -> User:
    """Create a HOSPITAL_STAFF user assigned to `hospital_id`."""
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


# ─── Unauthorized access ─────────────────────────────────────────────────────


def test_staff_endpoint_without_token_returns_401(client, db) -> None:
    hospital = _seed_hospital(db)
    _seed_operation(db, hospital.id)
    resp = client.get("/api/staff/my-hospital")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_staff_write_without_token_returns_401(client, db) -> None:
    _seed_hospital(db)
    resp = client.post("/api/staff/doctors", json={"name": "Dr. X", "specialty": "Ortho"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_staff_write_with_garbage_token_returns_401(client, db) -> None:
    _seed_hospital(db)
    resp = client.post(
        "/api/staff/doctors",
        json={"name": "Dr. X", "specialty": "Ortho"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


# ─── My hospital ─────────────────────────────────────────────────────────────


def test_get_my_hospital_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    _seed_operation(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.get("/api/staff/my-hospital", headers=auth_headers(staff))
    assert resp.status_code == 200
    body = resp.json()
    assert body["hospital"]["id"] == hospital.id
    assert body["operations"]["current_er_load"] == 10


def test_put_my_hospital_updates_profile(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    _seed_operation(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/my-hospital",
        json={"name": "Hospital A Renamed", "emergency_available": False},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["hospital"]["name"] == "Hospital A Renamed"
    assert body["hospital"]["emergency_available"] is False


def test_put_my_hospital_rejects_unknown_fields(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/my-hospital",
        json={"id": "hosp-a"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_staff_with_missing_hospital_returns_404(client, db, auth_headers) -> None:
    staff = _seed_staff(db, "hosp-missing")
    resp = client.get("/api/staff/my-hospital", headers=auth_headers(staff))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_staff_without_assignment_returns_403(client, db, user_factory, auth_headers) -> None:
    staff = user_factory(email="lonely-staff@test.com", role=UserRole.HOSPITAL_STAFF)
    resp = client.get("/api/staff/my-hospital", headers=auth_headers(staff))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


# ─── Doctors ─────────────────────────────────────────────────────────────────


def test_create_doctor_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/doctors",
        json={"name": "Dr. Priya", "specialty": "Neurology", "status": "AVAILABLE"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Dr. Priya"
    assert body["specialty"] == "Neurology"
    assert body["hospital_id"] == hospital.id


def test_create_doctor_validation_failure(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/doctors",
        json={"specialty": "Neurology"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]


def test_update_doctor_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    doctor = _seed_doctor(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        f"/api/staff/doctors/{doctor.id}",
        json={"status": "BUSY", "specialty": "Cardiology"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "BUSY"
    assert body["specialty"] == "Cardiology"


def test_update_doctor_invalid_id_returns_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/doctors/not-real",
        json={"status": "BUSY"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_cross_hospital_doctor_update_returns_403(client, db, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    doctor = _seed_doctor(db, "hosp-a", "doc-a")
    staff = _seed_staff(db, "hosp-b", "staff-b@test.com")

    resp = client.put(
        f"/api/staff/doctors/{doctor.id}",
        json={"status": "BUSY"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"


def test_delete_doctor_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    doctor = _seed_doctor(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.delete(f"/api/staff/doctors/{doctor.id}", headers=auth_headers(staff))
    assert resp.status_code == 204


# ─── Rooms ───────────────────────────────────────────────────────────────────


def test_create_room_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/rooms",
        json={"room_number": "ER-10", "room_type": "Emergency Room", "floor": "Ground Floor"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["room_number"] == "ER-10"
    assert body["hospital_id"] == hospital.id


def test_update_room_invalid_id_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/rooms/ghost",
        json={"status": "OCCUPIED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404


def test_update_room_validation_failure(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    room = Room(
        id="room-1", hospital_id=hospital.id, room_number="ER-01",
        room_type="Emergency Room", status=RoomStatus.AVAILABLE,
    )
    db.add(room)
    db.commit()
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/rooms/room-1",
        json={"status": "NOT_A_STATUS"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


# ─── Beds ────────────────────────────────────────────────────────────────────


def test_create_bed_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/beds",
        json={"bed_number": "B-99", "bed_type": "ICU", "status": "AVAILABLE"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["bed_number"] == "B-99"
    assert body["hospital_id"] == hospital.id


def test_create_bed_room_from_another_hospital_rejected(client, db, auth_headers) -> None:
    _seed_hospital(db, "hosp-a", "Hospital A")
    _seed_hospital(db, "hosp-b", "Hospital B")
    other_room = Room(
        id="room-b", hospital_id="hosp-b", room_number="W-1",
        room_type="Ward", status=RoomStatus.AVAILABLE,
    )
    db.add(other_room)
    db.commit()
    staff = _seed_staff(db, "hosp-a")

    resp = client.post(
        "/api/staff/beds",
        json={"bed_number": "B-01", "bed_type": "General", "room_id": "room-b"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


# ─── Ambulances ──────────────────────────────────────────────────────────────


def test_create_ambulance_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/ambulances",
        json={"vehicle_number": "KA-01-XX", "type": "BLS"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["vehicle_number"] == "KA-01-XX"
    assert body["type"] == "BLS"


def test_update_ambulance_invalid_id_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/ambulances/none",
        json={"status": "DISPATCHED"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404


# ─── Operations ──────────────────────────────────────────────────────────────


def test_update_operations_success(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    _seed_operation(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/operations",
        json={"current_er_load": 55, "estimated_wait_minutes": 15, "available_ambulances": 4},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["current_er_load"] == 55
    assert body["estimated_wait_minutes"] == 15
    assert body["available_ambulances"] == 4


def test_update_operations_validation_failure(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    _seed_operation(db, hospital.id)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/operations",
        json={"current_er_load": 250},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_error"


def test_update_operations_missing_record_404(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.put(
        "/api/staff/operations",
        json={"current_er_load": 20},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_doctor_created_hospital_never_from_client(client, db, auth_headers) -> None:
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    resp = client.post(
        "/api/staff/doctors",
        json={"name": "Dr. X", "specialty": "Ortho", "hospital_id": "hosp-sneaky"},
        headers=auth_headers(staff),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["hospital_id"] == hospital.id