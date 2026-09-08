"""Pydantic schemas for hospital domain read operations.

Reuses the model enums so validation and serialization stay in sync with the
database layer. Provider place IDs and any credential-like data are excluded
from every publicly readable schema.

Email addresses are serialized as plain strings: reads must never fail because
a legacy or hand-entered value does not match a strict email format.
"""

from datetime import datetime

from pydantic import Field

from app.models import (
    AmbulanceStatus,
    AmbulanceType,
    BedStatus,
    DoctorStatus,
    EmergencyRoomStatus,
    HospitalStatus,
    RoomStatus,
)
from app.schemas.common import APIModel


class HospitalRead(APIModel):
    id: str
    name: str
    registration_number: str | None = None
    address: str
    city: str
    state: str
    postal_code: str | None = None
    latitude: float
    longitude: float
    phone: str | None = None
    email: str | None = Field(default=None, max_length=255)
    emergency_available: bool
    status: HospitalStatus
    created_at: datetime
    updated_at: datetime


class DoctorRead(APIModel):
    id: str
    hospital_id: str
    name: str
    specialty: str
    registration_number: str | None = None
    phone: str | None = None
    email: str | None = Field(default=None, max_length=255)
    status: DoctorStatus
    created_at: datetime
    updated_at: datetime


class RoomRead(APIModel):
    id: str
    hospital_id: str
    room_number: str
    room_type: str
    floor: str | None = None
    status: RoomStatus


class BedRead(APIModel):
    id: str
    hospital_id: str
    room_id: str | None = None
    bed_number: str
    bed_type: str
    status: BedStatus
    created_at: datetime
    updated_at: datetime


class ICURead(APIModel):
    id: str
    hospital_id: str
    name: str
    total_beds: int
    available_beds: int
    occupied_beds: int
    created_at: datetime
    updated_at: datetime


class EmergencyRoomRead(APIModel):
    id: str
    hospital_id: str
    name: str
    status: EmergencyRoomStatus
    current_patients: int
    capacity: int
    created_at: datetime
    updated_at: datetime


class AmbulanceRead(APIModel):
    id: str
    hospital_id: str
    vehicle_number: str
    type: AmbulanceType
    status: AmbulanceStatus
    latitude: float | None = None
    longitude: float | None = None
    current_assignment: str | None = None
    created_at: datetime
    updated_at: datetime


class OperationRead(APIModel):
    id: str
    hospital_id: str
    current_er_load: int
    estimated_wait_minutes: int
    available_ambulances: int
    created_at: datetime
    updated_at: datetime