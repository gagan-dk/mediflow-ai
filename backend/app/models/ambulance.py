"""Ambulance model."""

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class AmbulanceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    AT_HOSPITAL = "AT_HOSPITAL"
    MAINTENANCE = "MAINTENANCE"


class AmbulanceType(str, enum.Enum):
    BLS = "BLS"
    ALS = "ALS"
    MORTUARY = "MORTUARY"


class Ambulance(TimestampMixin, Base):
    __tablename__ = "ambulances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    vehicle_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    type: Mapped[AmbulanceType] = mapped_column(
        Enum(AmbulanceType, name="ambulance_type", native_enum=False),
        nullable=False,
        server_default="ALS",
    )
    status: Mapped[AmbulanceStatus] = mapped_column(
        Enum(AmbulanceStatus, name="ambulance_status", native_enum=False),
        nullable=False,
        server_default="AVAILABLE",
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_assignment: Mapped[str | None] = mapped_column(String(255), nullable=True)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="ambulances")  # noqa: F821

    __table_args__ = (
        Index("ix_ambulances_status", "status"),
        Index("ix_ambulances_coords", "latitude", "longitude"),
    )