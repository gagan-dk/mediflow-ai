"""Hospital staff association model."""

import uuid

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class HospitalStaff(TimestampMixin, Base):
    __tablename__ = "hospital_staff"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    staff_role: Mapped[str] = mapped_column(String(100), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="staff_profiles")  # noqa: F821
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="staff")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("user_id", "hospital_id", name="uq_staff_user_hospital"),
    )