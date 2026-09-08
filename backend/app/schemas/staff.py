"""Pydantic schemas for staff write operations.

Request schemas carry only the fields staff members are allowed to change.
The acting hospital is resolved server-side from the staff member's context and
is never taken from the request body.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    AmbulanceStatus,
    AmbulanceType,
    BedStatus,
    DoctorStatus,
    HospitalStatus,
    RoomStatus,
)
from app.schemas.hospital import (
    AmbulanceRead,
    HospitalRead,
    OperationRead,
)


class DoctorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    specialty: str = Field(min_length=1, max_length=128)
    registration_number: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    status: DoctorStatus = DoctorStatus.AVAILABLE


class DoctorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    specialty: str | None = Field(default=None, min_length=1, max_length=128)
    registration_number: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    status: DoctorStatus | None = None


class RoomCreate(BaseModel):
    room_number: str = Field(min_length=1, max_length=32)
    room_type: str = Field(min_length=1, max_length=64)
    floor: str | None = Field(default=None, max_length=32)
    status: RoomStatus = RoomStatus.AVAILABLE


class RoomUpdate(BaseModel):
    room_number: str | None = Field(default=None, min_length=1, max_length=32)
    room_type: str | None = Field(default=None, min_length=1, max_length=64)
    floor: str | None = Field(default=None, max_length=32)
    status: RoomStatus | None = None


class BedCreate(BaseModel):
    bed_number: str = Field(min_length=1, max_length=32)
    bed_type: str = Field(min_length=1, max_length=64)
    room_id: str | None = None
    status: BedStatus = BedStatus.AVAILABLE


class BedUpdate(BaseModel):
    bed_number: str | None = Field(default=None, min_length=1, max_length=32)
    bed_type: str | None = Field(default=None, min_length=1, max_length=64)
    room_id: str | None = None
    status: BedStatus | None = None


class AmbulanceCreate(BaseModel):
    vehicle_number: str = Field(min_length=1, max_length=32)
    type: AmbulanceType = AmbulanceType.ALS
    status: AmbulanceStatus = AmbulanceStatus.AVAILABLE
    latitude: float | None = None
    longitude: float | None = None
    current_assignment: str | None = Field(default=None, max_length=255)


class AmbulanceUpdate(BaseModel):
    vehicle_number: str | None = Field(default=None, min_length=1, max_length=32)
    type: AmbulanceType | None = None
    status: AmbulanceStatus | None = None
    latitude: float | None = None
    longitude: float | None = None
    current_assignment: str | None = Field(default=None, max_length=255)


class OperationUpdate(BaseModel):
    current_er_load: int | None = Field(default=None, ge=0, le=100)
    estimated_wait_minutes: int | None = Field(default=None, ge=0)
    available_ambulances: int | None = Field(default=None, ge=0)


class MyHospitalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, min_length=1)
    city: str | None = Field(default=None, min_length=1, max_length=128)
    state: str | None = Field(default=None, min_length=1, max_length=128)
    postal_code: str | None = Field(default=None, max_length=16)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    emergency_available: bool | None = None
    status: HospitalStatus | None = None


class MyHospitalResponse(BaseModel):
    hospital: HospitalRead
    operations: OperationRead | None = None