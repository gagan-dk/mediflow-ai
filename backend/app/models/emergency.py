"""Emergency case and queue token models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class Severity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class EmergencyCaseStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    TREATING = "TREATING"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class EmergencyCase(TimestampMixin, Base):
    __tablename__ = "emergency_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reported_symptoms: Mapped[str] = mapped_column(Text, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[Severity] = mapped_column(
        Enum(Severity, name="severity_level", native_enum=False),
        nullable=False,
    )
    priority_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[EmergencyCaseStatus] = mapped_column(
        Enum(EmergencyCaseStatus, name="emergency_case_status", native_enum=False),
        nullable=False,
        server_default="REPORTED",
    )

    patient: Mapped["Patient"] = relationship("Patient", back_populates="emergency_cases")  # noqa: F821
    queue_tokens: Mapped[list["QueueToken"]] = relationship(  # noqa: F821
        "QueueToken", back_populates="emergency_case", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_emergency_cases_coords", "latitude", "longitude"),
        Index("ix_emergency_cases_severity", "severity"),
        Index("ix_emergency_cases_status", "status"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<EmergencyCase {self.id[:8]} severity={self.severity.value}>"


class QueueStatus(str, enum.Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class QueueToken(TimestampMixin, Base):
    __tablename__ = "queue_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    emergency_case_id: Mapped[str | None] = mapped_column(
        ForeignKey("emergency_cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    token_number: Mapped[str] = mapped_column(String(32), nullable=False)
    priority_level: Mapped[int] = mapped_column(Integer, nullable=False)
    queue_position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[QueueStatus] = mapped_column(
        Enum(QueueStatus, name="queue_status", native_enum=False),
        nullable=False,
        server_default="WAITING",
    )
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="queue_tokens")  # noqa: F821
    emergency_case: Mapped["EmergencyCase | None"] = relationship(  # noqa: F821
        "EmergencyCase", back_populates="queue_tokens"
    )

    __table_args__ = (
        UniqueConstraint("hospital_id", "token_number", name="uq_queue_token_hospital_number"),
        UniqueConstraint(
            "emergency_case_id", "hospital_id", name="uq_queue_token_case_hospital"
        ),
        Index("ix_queue_tokens_hospital_status", "hospital_id", "status"),
        # Covers the common queue query: filter by hospital + active status,
        # ordered by priority level (descending) then creation time.
        Index(
            "ix_queue_tokens_hospital_status_priority",
            "hospital_id",
            "status",
            "priority_level",
            "created_at",
        ),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<QueueToken {self.token_number} pos={self.queue_position}>"
