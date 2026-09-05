"""User model."""

import enum
import uuid

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    HOSPITAL_STAFF = "HOSPITAL_STAFF"
    ADMIN = "ADMIN"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        server_default="PATIENT",
    )

    staff_profiles: Mapped[list["HospitalStaff"]] = relationship(  # noqa: F821
        "HospitalStaff", back_populates="user", cascade="all, delete-orphan"
    )
    patient_profile: Mapped["Patient | None"] = relationship(  # noqa: F821
        "Patient", back_populates="user", uselist=False
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email} ({self.role.value if self.role else '?'})>"