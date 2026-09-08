"""Tests for the public hospital read APIs.

Covers success, pagination, invalid hospital ids, consistent error format, and
the no-credentials/no-provider-keys guarantee.
"""

from app.models import (
    Ambulance,
    AmbulanceStatus,
    AmbulanceType,
    Bed,
    BedStatus,
    Doctor,
    DoctorStatus,
    EmergencyRoom,
    EmergencyRoomStatus,
    Hospital,
    HospitalOperation,
    HospitalStatus,
    ICUUnit,
    Room,
    RoomStatus,
)


def _seed_hospital(db, hospital_id: str = "hosp-a", name: str = "Hospital A") -> Hospital:
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
        geoapify_place_id=f"geoapify-{hospital_id}",
        locationiq_place_id=f"locationiq-{hospital_id}",
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


def test_list_hospitals_returns_paginated_page(client, db) -> None:
    _seed_hospital(db, "hosp-a", "Alpha Hospital")
    _seed_hospital(db, "hosp-b", "Beta Hospital")

    resp = client.get("/api/hospitals?page=1&size=1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert body["pages"] == 2
    assert body["page"] == 1
    assert body["size"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["name"] == "Alpha Hospital"


def test_get_hospital_success(client, db) -> None:
    hospital = _seed_hospital(db)
    resp = client.get(f"/api/hospitals/{hospital.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == hospital.id
    assert body["name"] == "Hospital A"
    assert body["emergency_available"] is True


def test_get_hospital_invalid_id_returns_consistent_error(client, db) -> None:
    _seed_hospital(db)
    resp = client.get("/api/hospitals/does-not-exist")
    assert resp.status_code == 404
    body = resp.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "not_found"
    assert "Hospital not found" in body["error"]["message"]


def test_response_contains_no_credentials_or_provider_keys(client, db) -> None:
    hospital = _seed_hospital(db)
    resp = client.get(f"/api/hospitals/{hospital.id}")
    assert resp.status_code == 200
    raw = resp.text.lower()
    for forbidden in ("api_key", "apikey", "secret", "password", "place_id", "geocoding"):
        assert forbidden not in raw, f"response leaked: {forbidden}"


def _seed_children(db, hospital: Hospital) -> None:
    doctor = Doctor(
        id=f"doc-{hospital.id}",
        hospital_id=hospital.id,
        name="Dr. Test",
        specialty="Cardiology",
        status=DoctorStatus.AVAILABLE,
    )
    room = Room(
        id=f"room-{hospital.id}",
        hospital_id=hospital.id,
        room_number="ER-01",
        room_type="Emergency Room",
        floor="Ground Floor",
        status=RoomStatus.AVAILABLE,
    )
    bed = Bed(
        id=f"bed-{hospital.id}",
        hospital_id=hospital.id,
        bed_number="B-01",
        bed_type="General",
        status=BedStatus.AVAILABLE,
    )
    icu = ICUUnit(
        id=f"icu-{hospital.id}",
        hospital_id=hospital.id,
        name="Test ICU",
        total_beds=10,
        available_beds=2,
        occupied_beds=8,
    )
    er = EmergencyRoom(
        id=f"er-{hospital.id}",
        hospital_id=hospital.id,
        name="Test Emergency",
        status=EmergencyRoomStatus.OPEN,
        capacity=20,
        current_patients=5,
    )
    ambulance = Ambulance(
        id=f"amb-{hospital.id}",
        hospital_id=hospital.id,
        vehicle_number=f"KA-{hospital.id}",
        type=AmbulanceType.ALS,
        status=AmbulanceStatus.AVAILABLE,
    )
    operation = HospitalOperation(
        id=f"op-{hospital.id}",
        hospital_id=hospital.id,
        current_er_load=30,
        estimated_wait_minutes=10,
        available_ambulances=2,
    )
    db.add_all([doctor, room, bed, icu, er, ambulance, operation])
    db.commit()


def test_child_list_endpoints(client, db) -> None:
    hospital = _seed_hospital(db)
    _seed_children(db, hospital)

    for path, key in [
        ("doctors", "id"),
        ("rooms", "id"),
        ("beds", "id"),
        ("icu", "id"),
        ("emergency-rooms", "id"),
        ("ambulances", "id"),
    ]:
        resp = client.get(f"/api/hospitals/{hospital.id}/{path}")
        assert resp.status_code == 200, f"{path} returned {resp.status_code}"
        body = resp.json()
        assert len(body["items"]) == 1
        assert body["items"][0][key]


def test_operations_endpoint_success(client, db) -> None:
    hospital = _seed_hospital(db)
    _seed_children(db, hospital)
    resp = client.get(f"/api/hospitals/{hospital.id}/operations")
    assert resp.status_code == 200
    body = resp.json()
    assert body["current_er_load"] == 30
    assert body["estimated_wait_minutes"] == 10
    assert body["available_ambulances"] == 2


def test_child_endpoint_invalid_hospital_returns_404(client, db) -> None:
    resp = client.get("/api/hospitals/nope/doctors")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_operations_missing_record_returns_404(client, db) -> None:
    hospital = _seed_hospital(db)
    resp = client.get(f"/api/hospitals/{hospital.id}/operations")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


def test_read_endpoints_do_not_expose_internal_ids_or_metadata(client, db) -> None:
    hospital = _seed_hospital(db)
    body = client.get(f"/api/hospitals/{hospital.id}").json()
    for key in ("geoapify_place_id", "locationiq_place_id"):
        assert key not in body