"""Hospital operations model."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class HospitalOperation(TimestampMixin, Base):
    __tablename__ = "hospital_operations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False
    )
    current_er_load: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_wait_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_ambulances: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="operations")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("hospital_id", name="uq_hospital_operations_hospital"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<HospitalOperation hospital={self.hospital_id} er_load={self.current_er_load}>"