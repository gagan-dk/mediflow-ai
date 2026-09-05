"""
Seed the MediFlow database with operational data from the frontend demo records.

This script is IDEMPOTENT — running it multiple times will not create duplicate
records. It uses deterministic UUIDs (uuid5) and safe matching (UPSERT logic)
to ensure stable behavior across runs.

Usage (from backend/):
    python -m app.seed.seed_database          # seed + verify
    python -m app.seed.seed_database --drop   # drop all data and re-seed

Data sourced from:
    src/services/mockData.ts   (hospitals, doctors, rooms, ambulances, queue, pre-alerts)
    src/context/AppContext.tsx  (demo credentials, user profiles)
    src/types/hospital.ts       (bed/room/doctor type definitions)
"""

from __future__ import annotations

import argparse
import os
import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password

# Dialect-aware insert: PostgreSQL and SQLite both support
# on_conflict_do_update (UPSERT); pick at runtime.
_INSERT = pg_insert if engine.dialect.name == "postgresql" else sqlite_insert
from app.models import (
    Ambulance,
    AmbulanceStatus,
    AmbulanceType,
    Base,
    Bed,
    BedStatus,
    Doctor,
    DoctorStatus,
    EmergencyRoom,
    EmergencyRoomStatus,
    Hospital,
    HospitalOperation,
    HospitalStaff,
    HospitalStatus,
    ICUUnit,
    Patient,
    Room,
    RoomStatus,
    User,
    UserRole,
)

# ─── Deterministic UUID generation ───────────────────────────────────────────
# Uses uuid5 (SHA-1) with a fixed namespace so the same input always produces
# the same UUID, making the seed idempotent.

_SEED_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # NAMESPACE_DNS as anchor


def _stable_uuid(namespace: str, *parts: str) -> str:
    """Return a deterministic UUID5 string for the given namespace + parts."""
    key = f"mediflow:{namespace}:" + "|".join(str(p) for p in parts)
    return str(uuid.uuid5(_SEED_NS, key))


# ─── Hospital data (from mockData.ts INITIAL_HOSPITALS) ──────────────────────

_HOSPITALS = [
    {
        "seed_id": "hosp-citycare",
        "name": "CityCare Medical Center",
        "registration_number": "REG-CC-001",
        "address": "84 Metro Health Blvd, Central District",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560001",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "phone": "+91 80 4120 5500",
        "email": "info@citycare.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
    {
        "seed_id": "hosp-metro-trauma",
        "name": "Metro Trauma & Apex Institute",
        "registration_number": "REG-MT-002",
        "address": "12 Expressway Junction, North Ring Rd",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560024",
        "latitude": 12.9850,
        "longitude": 77.6050,
        "phone": "+91 80 2299 8800",
        "email": "admin@metrotrauma.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
    {
        "seed_id": "hosp-lifeline",
        "name": "LifeLine Super Specialty Hospital",
        "registration_number": "REG-LL-003",
        "address": "405 Tech Park East Corridor",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560100",
        "latitude": 12.9560,
        "longitude": 77.6250,
        "phone": "+91 80 6700 1122",
        "email": "contact@lifeline.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
    {
        "seed_id": "hosp-st-jude",
        "name": "St. Jude Memorial Hospital",
        "registration_number": "REG-SJ-004",
        "address": "19 Heritage Road, West Extension",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560053",
        "latitude": 12.9420,
        "longitude": 77.5800,
        "phone": "+91 80 2555 4321",
        "email": "info@stjude.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
    {
        "seed_id": "hosp-apollo-apex",
        "name": "Apex Heart & Vascular Institute",
        "registration_number": "REG-AH-005",
        "address": "100 South Boulevard, Medical Square",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560070",
        "latitude": 12.9250,
        "longitude": 77.5920,
        "phone": "+91 80 4999 0000",
        "email": "admin@apexheart.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
    {
        "seed_id": "hosp-community-west",
        "name": "Westside Community Hospital",
        "registration_number": "REG-WC-006",
        "address": "56 Green Avenue, West Park",
        "city": "Bangalore",
        "state": "Karnataka",
        "postal_code": "560060",
        "latitude": 12.9600,
        "longitude": 77.5450,
        "phone": "+91 80 2341 9090",
        "email": "hello@westsidecommunity.org",
        "emergency_available": True,
        "status": HospitalStatus.ACTIVE,
    },
]

# ─── Doctor data (from mockData.ts INITIAL_DOCTORS — CityCare only) ─────────

_DOCTORS = [
    {
        "seed_id": "doc-1",
        "hospital_seed_id": "hosp-citycare",
        "name": "Dr. Anil Kumar",
        "specialty": "Cardiology",
        "registration_number": "DOC-CC-001",
        "phone": "+91 9876543210",
        "email": "anil.kumar@hospital.com",
        "status": DoctorStatus.AVAILABLE,
    },
    {
        "seed_id": "doc-2",
        "hospital_seed_id": "hosp-citycare",
        "name": "Dr. Priya Sharma",
        "specialty": "Neurology",
        "registration_number": "DOC-CC-002",
        "phone": "+91 9876543211",
        "email": "priya.sharma@hospital.com",
        "status": DoctorStatus.BUSY,
    },
    {
        "seed_id": "doc-3",
        "hospital_seed_id": "hosp-citycare",
        "name": "Dr. Rohit Sen",
        "specialty": "Emergency Medicine",
        "registration_number": "DOC-CC-003",
        "phone": "+91 9876543212",
        "email": "rohit.sen@hospital.com",
        "status": DoctorStatus.AVAILABLE,
    },
    {
        "seed_id": "doc-4",
        "hospital_seed_id": "hosp-citycare",
        "name": "Dr. Kavitha Nair",
        "specialty": "Pulmonology",
        "registration_number": "DOC-CC-004",
        "phone": "+91 9876543213",
        "email": "kavitha.nair@hospital.com",
        "status": DoctorStatus.AVAILABLE,
    },
    {
        "seed_id": "doc-5",
        "hospital_seed_id": "hosp-citycare",
        "name": "Dr. Meera Iyer",
        "specialty": "Internal Medicine",
        "registration_number": "DOC-CC-005",
        "phone": "+91 9876543214",
        "email": "meera.iyer@hospital.com",
        "status": DoctorStatus.AVAILABLE,
    },
]

# ─── Room data (from mockData.ts INITIAL_ROOMS — CityCare only) ──────────────

_ROOMS = [
    {
        "seed_id": "room-1",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "ER-01",
        "room_type": "Emergency Room",
        "floor": "Ground Floor",
        "status": RoomStatus.OCCUPIED,
    },
    {
        "seed_id": "room-2",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "ER-02",
        "room_type": "Emergency Room",
        "floor": "Ground Floor",
        "status": RoomStatus.AVAILABLE,
    },
    {
        "seed_id": "room-3",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "ER-03",
        "room_type": "Emergency Room",
        "floor": "Ground Floor",
        "status": RoomStatus.AVAILABLE,
    },
    {
        "seed_id": "room-4",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "ICU-01",
        "room_type": "ICU",
        "floor": "First Floor",
        "status": RoomStatus.AVAILABLE,
    },
    {
        "seed_id": "room-5",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "ICU-02",
        "room_type": "ICU",
        "floor": "First Floor",
        "status": RoomStatus.OCCUPIED,
    },
    {
        "seed_id": "room-6",
        "hospital_seed_id": "hosp-citycare",
        "room_number": "W-101",
        "room_type": "General Ward",
        "floor": "Second Floor",
        "status": RoomStatus.AVAILABLE,
    },
]

# ─── Ambulance data (from mockData.ts INITIAL_AMBULANCES) ────────────────────

_AMBULANCES = [
    {
        "seed_id": "amb-1",
        "hospital_seed_id": "hosp-citycare",
        "vehicle_number": "KA-01-A17",
        "type": AmbulanceType.ALS,
        "status": AmbulanceStatus.AVAILABLE,
        "latitude": 12.9680,
        "longitude": 77.5900,
        "current_assignment": None,
    },
    {
        "seed_id": "amb-2",
        "hospital_seed_id": "hosp-citycare",
        "vehicle_number": "KA-01-A22",
        "type": AmbulanceType.BLS,
        "status": AmbulanceStatus.AVAILABLE,
        "latitude": 12.9550,
        "longitude": 77.6100,
        "current_assignment": None,
    },
    {
        "seed_id": "amb-3",
        "hospital_seed_id": "hosp-metro-trauma",
        "vehicle_number": "KA-01-A09",
        "type": AmbulanceType.ALS,
        "status": AmbulanceStatus.EN_ROUTE,
        "latitude": 12.9810,
        "longitude": 77.6020,
        "current_assignment": "En route to Metro Trauma",
    },
    {
        "seed_id": "amb-4",
        "hospital_seed_id": "hosp-citycare",
        "vehicle_number": "KA-01-A35",
        "type": AmbulanceType.ALS,
        "status": AmbulanceStatus.AVAILABLE,
        "latitude": 12.9300,
        "longitude": 77.5850,
        "current_assignment": None,
    },
    {
        "seed_id": "amb-5",
        "hospital_seed_id": "hosp-citycare",
        "vehicle_number": "KA-01-A44",
        "type": AmbulanceType.BLS,
        "status": AmbulanceStatus.AT_HOSPITAL,
        "latitude": 12.9716,
        "longitude": 77.5946,
        "current_assignment": "CityCare ER Bay 1",
    },
]

# ─── ICU Unit data (from mockData.ts hospital ICU capacity values) ───────────

_ICU_UNITS = [
    {
        "hospital_seed_id": "hosp-citycare",
        "name": "CityCare ICU",
        "total_beds": 24,
        "available_beds": 5,
        "occupied_beds": 19,
    },
    {
        "hospital_seed_id": "hosp-metro-trauma",
        "name": "Metro Trauma ICU",
        "total_beds": 30,
        "available_beds": 0,
        "occupied_beds": 30,
    },
    {
        "hospital_seed_id": "hosp-lifeline",
        "name": "LifeLine ICU",
        "total_beds": 18,
        "available_beds": 4,
        "occupied_beds": 14,
    },
    {
        "hospital_seed_id": "hosp-st-jude",
        "name": "St. Jude ICU",
        "total_beds": 12,
        "available_beds": 2,
        "occupied_beds": 10,
    },
    {
        "hospital_seed_id": "hosp-apollo-apex",
        "name": "Apex Cardiac ICU",
        "total_beds": 20,
        "available_beds": 6,
        "occupied_beds": 14,
    },
    {
        "hospital_seed_id": "hosp-community-west",
        "name": "Westside ICU",
        "total_beds": 6,
        "available_beds": 1,
        "occupied_beds": 5,
    },
]

# ─── Emergency Room data (from mockData.ts hospital ER capacity values) ──────

_EMERGENCY_ROOMS = [
    {
        "hospital_seed_id": "hosp-citycare",
        "name": "CityCare Emergency Department",
        "status": EmergencyRoomStatus.OPEN,
        "capacity": 35,
        "current_patients": 26,
    },
    {
        "hospital_seed_id": "hosp-metro-trauma",
        "name": "Metro Trauma Emergency",
        "status": EmergencyRoomStatus.FULL,
        "capacity": 45,
        "current_patients": 43,
    },
    {
        "hospital_seed_id": "hosp-lifeline",
        "name": "LifeLine Emergency",
        "status": EmergencyRoomStatus.OPEN,
        "capacity": 25,
        "current_patients": 18,
    },
    {
        "hospital_seed_id": "hosp-st-jude",
        "name": "St. Jude Emergency",
        "status": EmergencyRoomStatus.OPEN,
        "capacity": 20,
        "current_patients": 15,
    },
    {
        "hospital_seed_id": "hosp-apollo-apex",
        "name": "Apex Cardiac Emergency",
        "status": EmergencyRoomStatus.OPEN,
        "capacity": 22,
        "current_patients": 16,
    },
    {
        "hospital_seed_id": "hosp-community-west",
        "name": "Westside Emergency",
        "status": EmergencyRoomStatus.OPEN,
        "capacity": 14,
        "current_patients": 10,
    },
]

# ─── Hospital Operation data (from mockData.ts operational metrics) ──────────

_HOSPITAL_OPERATIONS = [
    {
        "hospital_seed_id": "hosp-citycare",
        "current_er_load": 42,
        "estimated_wait_minutes": 8,
        "available_ambulances": 3,
    },
    {
        "hospital_seed_id": "hosp-metro-trauma",
        "current_er_load": 94,
        "estimated_wait_minutes": 38,
        "available_ambulances": 1,
    },
    {
        "hospital_seed_id": "hosp-lifeline",
        "current_er_load": 48,
        "estimated_wait_minutes": 11,
        "available_ambulances": 3,
    },
    {
        "hospital_seed_id": "hosp-st-jude",
        "current_er_load": 62,
        "estimated_wait_minutes": 16,
        "available_ambulances": 2,
    },
    {
        "hospital_seed_id": "hosp-apollo-apex",
        "current_er_load": 51,
        "estimated_wait_minutes": 10,
        "available_ambulances": 2,
    },
    {
        "hospital_seed_id": "hosp-community-west",
        "current_er_load": 71,
        "estimated_wait_minutes": 20,
        "available_ambulances": 1,
    },
]

# ─── Demo User data (from AppContext.tsx DEMO_CREDENTIALS) ───────────────────
# Passwords are stored as bcrypt hashes at seed time (never plaintext) and are
# resolved at runtime via `_resolve_seed_passwords()`:
#   - MEDIFLOW_SEED_PASSWORD          -> all demo accounts
#   - MEDIFLOW_SEED_ADMIN_PASSWORD    -> the ADMIN account only (takes priority)
#   - otherwise, DEBUG=true dev fallbacks only; outside debug an explicit
#     password is REQUIRED so a deployment can never install a well-known
#     default password (especially the ADMIN account).

_DEMO_USERS = [
    {
        "seed_id": "usr-patient",
        "email": "patient@mediflow.ai",
        "full_name": "Rohan Verma",
        "phone": "+91 98765 43210",
        "role": UserRole.PATIENT,
    },
    {
        "seed_id": "usr-staff",
        "email": "staff@mediflow.ai",
        "full_name": "Dr. Priya Rao",
        "phone": "+91 80 4120 5501",
        "role": UserRole.HOSPITAL_STAFF,
    },
    {
        "seed_id": "usr-admin",
        "email": "admin@mediflow.ai",
        "full_name": "Director S. Menon",
        "phone": "+91 80 4120 5500",
        "role": UserRole.ADMIN,
    },
]

# Documented local-development-only passwords, used ONLY when DEBUG=true.
_DEV_DEFAULT_PASSWORDS = {
    "usr-patient": "patient123",
    "usr-staff": "staff123",
    "usr-admin": "admin123",
}

_SEED_PASSWORD_ENV = "MEDIFLOW_SEED_PASSWORD"
_SEED_ADMIN_PASSWORD_ENV = "MEDIFLOW_SEED_ADMIN_PASSWORD"
_ALLOW_DROP_ENV = "MEDIFLOW_ALLOW_DROP"


def _resolve_seed_passwords() -> dict[str, str]:
    """Return {seed_id: password} with secrets sourced from the environment.

    Never falls back to a committed default password outside debug mode.
    """
    resolved: dict[str, str] = {}
    common = os.environ.get(_SEED_PASSWORD_ENV)
    admin_specific = os.environ.get(_SEED_ADMIN_PASSWORD_ENV)
    for seed_id, dev_password in _DEV_DEFAULT_PASSWORDS.items():
        explicit = admin_specific if seed_id == "usr-admin" else common
        if explicit:
            resolved[seed_id] = explicit
        elif settings.debug:
            resolved[seed_id] = dev_password
        else:
            hint = (
                f" or {_SEED_ADMIN_PASSWORD_ENV}"
                if seed_id == "usr-admin"
                else ""
            )
            raise RuntimeError(
                f"Refusing to seed '{seed_id}' without an explicit password: "
                f"set {_SEED_PASSWORD_ENV}{hint} or run with DEBUG=true."
            )
    return resolved


def _drop_allowed() -> bool:
    """Destructive seeding requires an explicit opt-in (env or debug mode)."""
    return settings.debug or os.environ.get(_ALLOW_DROP_ENV, "").lower() in {
        "1",
        "true",
        "yes",
    }

# ─── Hospital Staff assignment (Dr. Priya Rao → CityCare) ───────────────────

_HOSPITAL_STAFF = [
    {
        "user_seed_id": "usr-staff",
        "hospital_seed_id": "hosp-citycare",
        "staff_role": "Emergency Physician",
    },
]

# ─── Patient profile (Rohan Verma) ──────────────────────────────────────────

_PATIENTS = [
    {
        "user_seed_id": "usr-patient",
        "name": "Rohan Verma",
        "date_of_birth": "1978-06-15",
        "phone": "+91 98765 43210",
        "emergency_contact": "+91 98765 00000",
    },
]


# ─── Seed functions ──────────────────────────────────────────────────────────


def _upsert_hospitals(session) -> dict[str, str]:
    """Upsert hospitals and return {seed_id: db_id} mapping."""
    mapping: dict[str, str] = {}
    for h in _HOSPITALS:
        db_id = _stable_uuid("hospital", h["seed_id"])
        stmt = (
            _INSERT(Hospital)
            .values(
                id=db_id,
                name=h["name"],
                registration_number=h["registration_number"],
                address=h["address"],
                city=h["city"],
                state=h["state"],
                postal_code=h["postal_code"],
                latitude=h["latitude"],
                longitude=h["longitude"],
                phone=h["phone"],
                email=h["email"],
                emergency_available=h["emergency_available"],
                status=h["status"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": h["name"],
                    "registration_number": h["registration_number"],
                    "address": h["address"],
                    "city": h["city"],
                    "state": h["state"],
                    "postal_code": h["postal_code"],
                    "latitude": h["latitude"],
                    "longitude": h["longitude"],
                    "phone": h["phone"],
                    "email": h["email"],
                    "emergency_available": h["emergency_available"],
                    "status": h["status"],
                },
            )
        )
        session.execute(stmt)
        mapping[h["seed_id"]] = db_id
    session.flush()
    return mapping


def _upsert_users(session, passwords: dict[str, str]) -> dict[str, str]:
    """Upsert demo users and return {seed_id: db_id} mapping.

    Passwords are hashed with bcrypt on every run; the hash is never stored in
    plaintext anywhere in the codebase. The plaintext comes from the resolved
    environment/dev defaults — never from a hardcoded constant here.
    """
    mapping: dict[str, str] = {}
    for u in _DEMO_USERS:
        db_id = _stable_uuid("user", u["seed_id"])
        password_hash = hash_password(passwords[u["seed_id"]])
        stmt = (
            _INSERT(User)
            .values(
                id=db_id,
                email=u["email"],
                password_hash=password_hash,
                full_name=u["full_name"],
                phone=u["phone"],
                role=u["role"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "email": u["email"],
                    "password_hash": password_hash,
                    "full_name": u["full_name"],
                    "phone": u["phone"],
                    "role": u["role"],
                },
            )
        )
        session.execute(stmt)
        mapping[u["seed_id"]] = db_id
    session.flush()
    return mapping


def _upsert_doctors(session, hospital_map: dict[str, str]) -> None:
    """Upsert demo doctors for CityCare."""
    for d in _DOCTORS:
        db_id = _stable_uuid("doctor", d["seed_id"])
        hosp_db_id = hospital_map[d["hospital_seed_id"]]
        stmt = (
            _INSERT(Doctor)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                name=d["name"],
                specialty=d["specialty"],
                registration_number=d["registration_number"],
                phone=d["phone"],
                email=d["email"],
                status=d["status"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "name": d["name"],
                    "specialty": d["specialty"],
                    "registration_number": d["registration_number"],
                    "phone": d["phone"],
                    "email": d["email"],
                    "status": d["status"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_rooms(session, hospital_map: dict[str, str]) -> dict[str, str]:
    """Upsert demo rooms for CityCare and return {seed_id: db_id} mapping."""
    mapping: dict[str, str] = {}
    for r in _ROOMS:
        db_id = _stable_uuid("room", r["seed_id"])
        hosp_db_id = hospital_map[r["hospital_seed_id"]]
        stmt = (
            _INSERT(Room)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                room_number=r["room_number"],
                room_type=r["room_type"],
                floor=r["floor"],
                status=r["status"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "room_number": r["room_number"],
                    "room_type": r["room_type"],
                    "floor": r["floor"],
                    "status": r["status"],
                },
            )
        )
        session.execute(stmt)
        mapping[r["seed_id"]] = db_id
    session.flush()
    return mapping


def _upsert_beds(session, hospital_map: dict[str, str]) -> None:
    """Seed beds for CityCare exactly as the frontend derives them.

    Reproduces the bed grid produced by `hospitalToBeds()` in
    src/services/mockData.ts for CityCare Medical Center:
      - 24 ICU beds  (citycare-ICU-01..24):   5 AVAILABLE, 19 OCCUPIED
      - 220 general beds (citycare-B01..220): 42 AVAILABLE, 178 OCCUPIED
        (first 35 are Emergency ward, the rest General ward)
    Status assignment mirrors the frontend: beds up to `available` are
    AVAILABLE, the next `occupied` are OCCUPIED.
    """
    CITIES = "citycare"
    icu_total, icu_available = 24, 5
    beds_total, beds_available, er_total = 220, 42, 35

    beds_seen: set[tuple[str, str]] = set()

    def bed_status(idx: int, available: int, total: int):
        if idx <= available:
            return BedStatus.AVAILABLE
        if idx <= total:
            return BedStatus.OCCUPIED
        return BedStatus.MAINTENANCE

    # ICU beds
    icu_items = [
        (
            f"{CITIES}-ICU-{i:02d}",
            "ICU",
            bed_status(i, icu_available, icu_total),
        )
        for i in range(1, icu_total + 1)
    ]
    # General/Emergency beds (first er_total are Emergency ward)
    general_items = [
        (
            f"{CITIES}-B{i:02d}",
            "Emergency" if i <= er_total else "General",
            bed_status(i, beds_available, beds_total),
        )
        for i in range(1, beds_total + 1)
    ]

    hosp_db_id = hospital_map["hosp-citycare"]
    for bed_number, bed_type, status in icu_items + general_items:
        key = (bed_number, bed_type)
        if key in beds_seen:
            continue
        beds_seen.add(key)
        db_id = _stable_uuid("bed", CITIES, bed_number)
        stmt = (
            _INSERT(Bed)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                bed_number=bed_number,
                bed_type=bed_type,
                status=status,
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "bed_number": bed_number,
                    "bed_type": bed_type,
                    "status": status,
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_ambulances(session, hospital_map: dict[str, str]) -> None:
    """Upsert demo ambulances."""
    for a in _AMBULANCES:
        db_id = _stable_uuid("ambulance", a["seed_id"])
        hosp_db_id = hospital_map[a["hospital_seed_id"]]
        stmt = (
            _INSERT(Ambulance)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                vehicle_number=a["vehicle_number"],
                type=a["type"],
                status=a["status"],
                latitude=a["latitude"],
                longitude=a["longitude"],
                current_assignment=a["current_assignment"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "vehicle_number": a["vehicle_number"],
                    "type": a["type"],
                    "status": a["status"],
                    "latitude": a["latitude"],
                    "longitude": a["longitude"],
                    "current_assignment": a["current_assignment"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_icu_units(session, hospital_map: dict[str, str]) -> None:
    """Upsert ICU unit records for all hospitals."""
    for icu in _ICU_UNITS:
        db_id = _stable_uuid("icu", icu["hospital_seed_id"])
        hosp_db_id = hospital_map[icu["hospital_seed_id"]]
        stmt = (
            _INSERT(ICUUnit)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                name=icu["name"],
                total_beds=icu["total_beds"],
                available_beds=icu["available_beds"],
                occupied_beds=icu["occupied_beds"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "name": icu["name"],
                    "total_beds": icu["total_beds"],
                    "available_beds": icu["available_beds"],
                    "occupied_beds": icu["occupied_beds"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_emergency_rooms(session, hospital_map: dict[str, str]) -> None:
    """Upsert emergency room records for all hospitals."""
    for er in _EMERGENCY_ROOMS:
        db_id = _stable_uuid("emergency_room", er["hospital_seed_id"])
        hosp_db_id = hospital_map[er["hospital_seed_id"]]
        stmt = (
            _INSERT(EmergencyRoom)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                name=er["name"],
                status=er["status"],
                capacity=er["capacity"],
                current_patients=er["current_patients"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "name": er["name"],
                    "status": er["status"],
                    "capacity": er["capacity"],
                    "current_patients": er["current_patients"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_hospital_operations(session, hospital_map: dict[str, str]) -> None:
    """Upsert hospital operational metrics for all hospitals."""
    for op in _HOSPITAL_OPERATIONS:
        db_id = _stable_uuid("hospital_operation", op["hospital_seed_id"])
        hosp_db_id = hospital_map[op["hospital_seed_id"]]
        stmt = (
            _INSERT(HospitalOperation)
            .values(
                id=db_id,
                hospital_id=hosp_db_id,
                current_er_load=op["current_er_load"],
                estimated_wait_minutes=op["estimated_wait_minutes"],
                available_ambulances=op["available_ambulances"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "hospital_id": hosp_db_id,
                    "current_er_load": op["current_er_load"],
                    "estimated_wait_minutes": op["estimated_wait_minutes"],
                    "available_ambulances": op["available_ambulances"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_hospital_staff(
    session, user_map: dict[str, str], hospital_map: dict[str, str]
) -> None:
    """Upsert hospital staff assignments."""
    for s in _HOSPITAL_STAFF:
        user_db_id = user_map[s["user_seed_id"]]
        hosp_db_id = hospital_map[s["hospital_seed_id"]]
        db_id = _stable_uuid("hospital_staff", s["user_seed_id"], s["hospital_seed_id"])
        stmt = (
            _INSERT(HospitalStaff)
            .values(
                id=db_id,
                user_id=user_db_id,
                hospital_id=hosp_db_id,
                staff_role=s["staff_role"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "user_id": user_db_id,
                    "hospital_id": hosp_db_id,
                    "staff_role": s["staff_role"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


def _upsert_patients(session, user_map: dict[str, str]) -> None:
    """Upsert patient profiles for demo users."""
    for p in _PATIENTS:
        user_db_id = user_map[p["user_seed_id"]]
        db_id = _stable_uuid("patient", p["user_seed_id"])
        stmt = (
            _INSERT(Patient)
            .values(
                id=db_id,
                user_id=user_db_id,
                name=p["name"],
                date_of_birth=date.fromisoformat(p["date_of_birth"]),
                phone=p["phone"],
                emergency_contact=p["emergency_contact"],
            )
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "user_id": user_db_id,
                    "name": p["name"],
                    "date_of_birth": date.fromisoformat(p["date_of_birth"]),
                    "phone": p["phone"],
                    "emergency_contact": p["emergency_contact"],
                },
            )
        )
        session.execute(stmt)
    session.flush()


# ─── Verification ────────────────────────────────────────────────────────────


def _verify_seeding(session) -> dict[str, int]:
    """Run post-seed verification queries and return row counts."""
    counts: dict[str, int] = {}
    tables = [
        "hospitals",
        "users",
        "doctors",
        "rooms",
        "beds",
        "ambulances",
        "icu_units",
        "emergency_rooms",
        "hospital_operations",
        "hospital_staff",
        "patients",
    ]
    for table in tables:
        result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
        counts[table] = result.scalar()

    print("\n" + "=" * 70)
    print("SEED VERIFICATION RESULTS")
    print("=" * 70)

    # 1. Row counts
    print("\n--- Row Counts ---")
    for table, count in counts.items():
        print(f"  {table:30s} {count:>5d}")

    # 2. Foreign key integrity: every doctor belongs to a hospital
    print("\n--- Foreign Key Integrity Checks ---")
    orphan_doctors = session.execute(
        text(
            """
            SELECT d.id, d.name
            FROM doctors d
            LEFT JOIN hospitals h ON d.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_doctors:
        print(f"  FAIL: {len(orphan_doctors)} doctor(s) without a hospital:")
        for row in orphan_doctors:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every doctor belongs to a hospital.")

    # 3. Every room belongs to a hospital
    orphan_rooms = session.execute(
        text(
            """
            SELECT r.id, r.room_number
            FROM rooms r
            LEFT JOIN hospitals h ON r.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_rooms:
        print(f"  FAIL: {len(orphan_rooms)} room(s) without a hospital:")
        for row in orphan_rooms:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every room belongs to a hospital.")

    # 4. Every bed belongs to a room/hospital
    orphan_beds = session.execute(
        text(
            """
            SELECT b.id, b.bed_number
            FROM beds b
            LEFT JOIN hospitals h ON b.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_beds:
        print(f"  FAIL: {len(orphan_beds)} bed(s) without a hospital:")
        for row in orphan_beds:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every bed belongs to a hospital.")

    beds_with_invalid_rooms = session.execute(
        text(
            """
            SELECT b.id, b.bed_number, b.room_id
            FROM beds b
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE b.room_id IS NOT NULL AND r.id IS NULL
            """
        )
    ).fetchall()
    if beds_with_invalid_rooms:
        print(f"  FAIL: {len(beds_with_invalid_rooms)} bed(s) reference non-existent rooms:")
        for row in beds_with_invalid_rooms:
            print(f"    - {row[1]} ({row[0]}) room_id={row[2]}")
    else:
        print("  PASS: All beds with room references point to valid rooms.")

    # 5. Staff assignments reference valid hospitals + users
    orphan_staff = session.execute(
        text(
            """
            SELECT hs.id, hs.staff_role
            FROM hospital_staff hs
            LEFT JOIN hospitals h ON hs.hospital_id = h.id
            LEFT JOIN users u ON hs.user_id = u.id
            WHERE h.id IS NULL OR u.id IS NULL
            """
        )
    ).fetchall()
    if orphan_staff:
        print(f"  FAIL: {len(orphan_staff)} staff assignment(s) with invalid references:")
        for row in orphan_staff:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every staff assignment references valid hospital and user.")

    # 6. Every ambulance belongs to a hospital
    orphan_ambulances = session.execute(
        text(
            """
            SELECT a.id, a.vehicle_number
            FROM ambulances a
            LEFT JOIN hospitals h ON a.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_ambulances:
        print(f"  FAIL: {len(orphan_ambulances)} ambulance(s) without a hospital:")
        for row in orphan_ambulances:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every ambulance belongs to a hospital.")

    # 7. Every ICU unit belongs to a hospital
    orphan_icu = session.execute(
        text(
            """
            SELECT i.id, i.name
            FROM icu_units i
            LEFT JOIN hospitals h ON i.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_icu:
        print(f"  FAIL: {len(orphan_icu)} ICU unit(s) without a hospital:")
        for row in orphan_icu:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every ICU unit belongs to a hospital.")

    # 8. Every emergency room belongs to a hospital
    orphan_er = session.execute(
        text(
            """
            SELECT er.id, er.name
            FROM emergency_rooms er
            LEFT JOIN hospitals h ON er.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_er:
        print(f"  FAIL: {len(orphan_er)} emergency room(s) without a hospital:")
        for row in orphan_er:
            print(f"    - {row[1]} ({row[0]})")
    else:
        print("  PASS: Every emergency room belongs to a hospital.")

    # 9. Every hospital operation belongs to a hospital
    orphan_ops = session.execute(
        text(
            """
            SELECT ho.id, ho.hospital_id
            FROM hospital_operations ho
            LEFT JOIN hospitals h ON ho.hospital_id = h.id
            WHERE h.id IS NULL
            """
        )
    ).fetchall()
    if orphan_ops:
        print(f"  FAIL: {len(orphan_ops)} operation record(s) without a hospital:")
        for row in orphan_ops:
            print(f"    - {row[0]}")
    else:
        print("  PASS: Every hospital operation belongs to a hospital.")

    # 10. Hospital <-> operation 1:1 constraint
    duplicate_ops = session.execute(
        text(
            """
            SELECT hospital_id, COUNT(*) AS cnt
            FROM hospital_operations
            GROUP BY hospital_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicate_ops:
        print(f"  WARN: {len(duplicate_ops)} hospital(s) have multiple operation records:")
        for row in duplicate_ops:
            print(f"    - hospital {row[0]}: {row[1]} records")
    else:
        print("  PASS: Each hospital has at most one operation record.")

    print("\n" + "=" * 70)
    print("SEED COMPLETE")
    print("=" * 70)

    return counts


# ─── Drop all data ───────────────────────────────────────────────────────────


def _drop_all(session) -> None:
    """Delete all seeded data (ordered by FK dependencies).

    Destructive by design: refuse unless the environment explicitly allows it
    (debug mode or MEDIFLOW_ALLOW_DROP=1). Callers requiring a hard wipe must
    also pass --confirm-drop at the CLI level.
    """
    if not _drop_allowed():
        raise RuntimeError(
            "Cannot drop data: set DEBUG=true or MEDIFLOW_ALLOW_DROP=1 "
            "to allow destructive seed operations."
        )
    tables_in_order = [
        "queue_tokens",
        "emergency_cases",
        "hospital_staff",
        "patients",
        "ambulances",
        "beds",
        "rooms",
        "icu_units",
        "emergency_rooms",
        "doctors",
        "hospital_operations",
        "hospitals",
        "users",
    ]
    if engine.dialect.name == "postgresql":
        for table in tables_in_order:
            session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
    else:
        session.execute(text("PRAGMA foreign_keys = OFF"))
        for table in tables_in_order:
            session.execute(text(f"DELETE FROM {table}"))
        session.execute(text("PRAGMA foreign_keys = ON"))
    session.flush()
    print("All seeded data truncated.")


# ─── Main entry point ────────────────────────────────────────────────────────


def seed_database(drop_first: bool = False) -> None:
    """Seed the database with MediFlow demo operational data."""
    print("=" * 70)
    print("MEDIFLOW — DATABASE SEED")
    print("=" * 70)
    print(f"Database URL: {settings.database_url}")
    print()

    # Resolve demo passwords before touching the database so that a missing
    # secret (e.g. seeding the ADMIN account outside debug) aborts safely.
    passwords = _resolve_seed_passwords()

    session = SessionLocal()
    try:
        if drop_first:
            print("[1/9] Dropping existing seeded data...")
            if not _drop_allowed():
                raise RuntimeError(
                    "Refusing to drop data: set DEBUG=true or "
                    "MEDIFLOW_ALLOW_DROP=1 to allow destructive seeding."
                )
            _drop_all(session)
            session.commit()
        else:
            # Ensure tables exist
            Base.metadata.create_all(bind=engine)

        print("[1/9] Upserting hospitals (6)...")
        hospital_map = _upsert_hospitals(session)
        session.commit()

        print("[2/9] Upserting demo users (3)...")
        user_map = _upsert_users(session, passwords)
        session.commit()

        print("[3/9] Upserting doctors (5 at CityCare)...")
        _upsert_doctors(session, hospital_map)
        session.commit()

        print("[4/9] Upserting rooms (6 at CityCare)...")
        _upsert_rooms(session, hospital_map)
        session.commit()

        print("[5/9] Upserting beds (244 generated at CityCare)...")
        _upsert_beds(session, hospital_map)
        session.commit()

        print("[6/9] Upserting ambulances (5)...")
        _upsert_ambulances(session, hospital_map)
        session.commit()

        print("[7/9] Upserting ICU units (6), emergency rooms (6), operations (6)...")
        _upsert_icu_units(session, hospital_map)
        _upsert_emergency_rooms(session, hospital_map)
        _upsert_hospital_operations(session, hospital_map)
        session.commit()

        print("[8/9] Upserting staff assignments (1) and patient profiles (1)...")
        _upsert_hospital_staff(session, user_map, hospital_map)
        _upsert_patients(session, user_map)
        session.commit()

        print("[9/9] Running verification queries...")
        _verify_seeding(session)

    except Exception as exc:
        session.rollback()
        print(f"\nERROR: Seed failed — {exc}")
        raise
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the MediFlow database with demo operational data."
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop all seeded data before re-seeding (requires --confirm-drop).",
    )
    parser.add_argument(
        "--confirm-drop",
        action="store_true",
        help="Acknowledge the destructive --drop operation.",
    )
    args = parser.parse_args()
    if args.drop and not args.confirm_drop:
        raise SystemExit(
            "Refusing to drop data without --confirm-drop. Destructive seeding "
            "also requires DEBUG=true or MEDIFLOW_ALLOW_DROP=1."
        )
    seed_database(drop_first=args.drop)


if __name__ == "__main__":
    main()
