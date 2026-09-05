"""Doctor, Room, Bed, ICU Unit, Emergency Room models."""

import enum
import uuid

from sqlalchemy import (
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class DoctorStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFF_DUTY = "OFF_DUTY"


class Doctor(TimestampMixin, Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str] = mapped_column(String(128), nullable=False)
    registration_number: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[DoctorStatus] = mapped_column(
        Enum(DoctorStatus, name="doctor_status", native_enum=False),
        nullable=False,
        server_default="AVAILABLE",
    )

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="doctors")  # noqa: F821


class RoomStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    RESERVED = "RESERVED"
    MAINTENANCE = "MAINTENANCE"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    room_number: Mapped[str] = mapped_column(String(32), nullable=False)
    room_type: Mapped[str] = mapped_column(String(64), nullable=False)
    floor: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[RoomStatus] = mapped_column(
        Enum(RoomStatus, name="room_status", native_enum=False),
        nullable=False,
        server_default="AVAILABLE",
    )

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="rooms")  # noqa: F821
    beds: Mapped[list["Bed"]] = relationship(  # noqa: F821
        "Bed", back_populates="room", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("hospital_id", "room_number", name="uq_room_hospital_number"),
    )


class BedStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    RESERVED = "RESERVED"
    MAINTENANCE = "MAINTENANCE"


class Bed(TimestampMixin, Base):
    __tablename__ = "beds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    room_id: Mapped[str | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    bed_number: Mapped[str] = mapped_column(String(32), nullable=False)
    bed_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[BedStatus] = mapped_column(
        Enum(BedStatus, name="bed_status", native_enum=False),
        nullable=False,
        server_default="AVAILABLE",
    )

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="beds")  # noqa: F821
    room: Mapped["Room | None"] = relationship("Room", back_populates="beds")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("hospital_id", "bed_number", name="uq_bed_hospital_number"),
        Index("ix_beds_status", "status"),
    )


class ICUUnit(TimestampMixin, Base):
    __tablename__ = "icu_units"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    total_beds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_beds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    occupied_beds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="icu_units")  # noqa: F821


class EmergencyRoomStatus(str, enum.Enum):
    OPEN = "OPEN"
    FULL = "FULL"
    CLOSED = "CLOSED"


class EmergencyRoom(TimestampMixin, Base):
    __tablename__ = "emergency_rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[EmergencyRoomStatus] = mapped_column(
        Enum(EmergencyRoomStatus, name="emergency_room_status", native_enum=False),
        nullable=False,
        server_default="OPEN",
    )
    current_patients: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="emergency_rooms")  # noqa: F821