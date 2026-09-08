"""Hospital model — the central entity."""

import enum
import uuid

from sqlalchemy import Enum, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class HospitalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    UNDER_REVIEW = "UNDER_REVIEW"


class Hospital(TimestampMixin, Base):
    __tablename__ = "hospitals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    registration_number: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(128), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_available: Mapped[bool] = mapped_column(default=True)
    status: Mapped[HospitalStatus] = mapped_column(
        Enum(HospitalStatus, name="hospital_status", native_enum=False),
        nullable=False,
        server_default="ACTIVE",
    )
    geoapify_place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    locationiq_place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    staff: Mapped[list["HospitalStaff"]] = relationship(  # noqa: F821
        "HospitalStaff", back_populates="hospital", cascade="all, delete-orphan"
    )
    doctors: Mapped[list["Doctor"]] = relationship(  # noqa: F821
        "Doctor", back_populates="hospital", cascade="all, delete-orphan"
    )
    rooms: Mapped[list["Room"]] = relationship(  # noqa: F821
        "Room", back_populates="hospital", cascade="all, delete-orphan"
    )
    beds: Mapped[list["Bed"]] = relationship(  # noqa: F821
        "Bed", back_populates="hospital", cascade="all, delete-orphan"
    )
    icu_units: Mapped[list["ICUUnit"]] = relationship(  # noqa: F821
        "ICUUnit", back_populates="hospital", cascade="all, delete-orphan"
    )
    emergency_rooms: Mapped[list["EmergencyRoom"]] = relationship(  # noqa: F821
        "EmergencyRoom", back_populates="hospital", cascade="all, delete-orphan"
    )
    ambulances: Mapped[list["Ambulance"]] = relationship(  # noqa: F821
        "Ambulance", back_populates="hospital", cascade="all, delete-orphan"
    )
    queue_tokens: Mapped[list["QueueToken"]] = relationship(  # noqa: F821
        "QueueToken", back_populates="hospital", cascade="all, delete-orphan"
    )
    operations: Mapped["HospitalOperation | None"] = relationship(  # noqa: F821
        "HospitalOperation", back_populates="hospital", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_hospitals_coords", "latitude", "longitude"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Hospital {self.name}>"