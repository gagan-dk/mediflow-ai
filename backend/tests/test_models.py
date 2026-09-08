"""Tests for the SQLAlchemy models and schema metadata."""

import pytest

from app.models import (
    Ambulance,
    Bed,
    Doctor,
    EmergencyCase,
    EmergencyRoom,
    Hospital,
    HospitalOperation,
    HospitalStaff,
    ICUUnit,
    Patient,
    QueueToken,
    Room,
    User,
)

EXPECTED_TABLES = {
    "users",
    "hospitals",
    "hospital_staff",
    "doctors",
    "rooms",
    "beds",
    "icu_units",
    "emergency_rooms",
    "ambulances",
    "patients",
    "emergency_cases",
    "queue_tokens",
    "hospital_operations",
}

MODELS = [
    User,
    Hospital,
    HospitalStaff,
    Doctor,
    Room,
    Bed,
    ICUUnit,
    EmergencyRoom,
    Ambulance,
    Patient,
    EmergencyCase,
    QueueToken,
    HospitalOperation,
]


@pytest.mark.parametrize("model", MODELS)
def test_model_has_table(model) -> None:
    assert model.__tablename__ in EXPECTED_TABLES


def test_all_entities_present() -> None:
    from app.models import Base

    tables = set(Base.metadata.tables.keys())
    assert EXPECTED_TABLES <= tables


def test_hospital_staff_foreign_keys() -> None:
    fks = {
        (fk.parent.name, fk.column.table.name)
        for fk in HospitalStaff.__table__.foreign_keys
    }
    assert ("user_id", "users") in fks
    assert ("hospital_id", "hospitals") in fks


def test_patient_user_unique() -> None:
    assert Patient.__table__.columns["user_id"].unique


def test_emergency_case_foreign_keys() -> None:
    fks = {
        (fk.parent.name, fk.column.table.name)
        for fk in EmergencyCase.__table__.foreign_keys
    }
    assert ("patient_id", "patients") in fks


def test_queue_token_foreign_keys() -> None:
    fks = {
        (fk.parent.name, fk.column.table.name)
        for fk in QueueToken.__table__.foreign_keys
    }
    assert ("hospital_id", "hospitals") in fks
    assert ("emergency_case_id", "emergency_cases") in fks


def test_bed_room_foreign_key() -> None:
    fks = {
        (fk.parent.name, fk.column.table.name)
        for fk in Bed.__table__.foreign_keys
    }
    assert ("room_id", "rooms") in fks


def test_unique_constraints() -> None:
    assert "uq_staff_user_hospital" in {
        c.name for c in HospitalStaff.__table__.constraints
    }
    assert "uq_room_hospital_number" in {c.name for c in Room.__table__.constraints}
    assert "uq_bed_hospital_number" in {c.name for c in Bed.__table__.constraints}
    assert "uq_queue_token_hospital_number" in {
        c.name for c in QueueToken.__table__.constraints
    }
    assert "uq_hospital_operations_hospital" in {
        c.name for c in HospitalOperation.__table__.constraints
    }
    assert Hospital.__table__.columns["registration_number"].unique


def test_relationship_configuration() -> None:
    rels = Hospital.__mapper__.relationships
    assert rels
    assert rels["queue_tokens"].direction.name == "ONETOMANY"
    assert rels["beds"].direction.name == "ONETOMANY"


def test_timestamps_present() -> None:
    for model in (User, Hospital, Patient, Ambulance, EmergencyCase):
        assert "created_at" in model.__table__.columns
        assert "updated_at" in model.__table__.columns


def test_provider_ids_are_metadata_not_keys() -> None:
    pk_cols = set(Hospital.__table__.primary_key.columns.keys())
    assert "geoapify_place_id" not in pk_cols
    assert "locationiq_place_id" not in pk_cols