"""Pydantic schemas for authentication.

Request schemas never accept a role or a hospital id: self-registration always
creates `PATIENT` accounts and `HOSPITAL_STAFF` / `ADMIN` roles are assigned
server-side by an admin. Login uses a generic, safe error message. Token
responses carry a short-lived access token and never expose `password_hash`.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import UserRole

# bcrypt processes at most 72 bytes and rejects NUL bytes outright; validate
# server-side so hashing never silently truncates a credential.
_BCRYPT_MAX_BYTES = 72


def _validate_password_bytes(password: str) -> str:
    if "\x00" in password:
        raise ValueError("Password must not contain NUL bytes")
    if len(password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise ValueError("Password is too long (max 72 bytes)")
    return password


class RegisterRequest(BaseModel):
    """Self-service registration payload (patient accounts only)."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    _validate_password = field_validator("password")(_validate_password_bytes)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    _validate_password = field_validator("password")(_validate_password_bytes)


class UserRead(BaseModel):
    """Public user representation; `password_hash` is never included."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    phone: str | None = None
    role: UserRole
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class UpdateRoleRequest(BaseModel):
    """Admin payload to assign a role to an existing user."""

    role: UserRole


class AdminUserListRead(BaseModel):
    """Admin user listing (no password data)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime