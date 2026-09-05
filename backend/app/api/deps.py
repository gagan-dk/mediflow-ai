"""Shared FastAPI dependencies.

Phase 4 replaces the Phase 3 auth placeholder with real identity resolution:

- `get_current_user`  — validates the JWT access token and loads the user from
  the database (the DB row is the authority, never the token claims alone).
- `require_role`      — returns a dependency that enforces a specific role.
- `get_current_staff_hospital` — resolves the acting hospital exclusively from
  the `hospital_staff` join table. A hospital id supplied by the frontend is
  never trusted when determining staff ownership.
"""

import jwt
from typing import Annotated, Callable, TypeVar

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Hospital, HospitalStaff, User, UserRole

Db = Annotated[Session, Depends(get_db)]

TModel = TypeVar("TModel")

# Extracts "Authorization: Bearer <token>" and returns 401 when missing.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    db: Db, token: str = Depends(oauth2_scheme)
) -> User:
    """Validate the access token and load the authenticated user.

    Every error path returns the same 401 so attackers cannot distinguish an
    expired token, a tampered token, or a deleted user account.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(required_role: UserRole) -> Callable[[CurrentUser], User]:
    """Return a dependency that only allows `required_role` through."""

    def _dependency(user: CurrentUser) -> User:
        if user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for your role.",
            )
        return user

    return _dependency


AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN))]
StaffUser = Annotated[User, Depends(require_role(UserRole.HOSPITAL_STAFF))]
PatientUser = Annotated[User, Depends(require_role(UserRole.PATIENT))]


def get_current_staff_hospital(db: Db, user: CurrentUser) -> str:
    """Resolve the acting staff member's hospital id from server-side data.

    The `hospital_staff` join table is the only source of truth for ownership.
    Patients and admins never resolve to a hospital (403), staff without an
    assignment are rejected, and any hospital id sent by the frontend is
    ignored entirely.
    """
    if user.role != UserRole.HOSPITAL_STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required.",
        )

    hospital_id = db.scalar(
        select(HospitalStaff.hospital_id)
        .where(HospitalStaff.user_id == user.id)
        .order_by(HospitalStaff.created_at, HospitalStaff.id)
        .limit(1)
    )
    if hospital_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No hospital assignment for this staff account.",
        )
    return hospital_id


StaffHospitalId = Annotated[str, Depends(get_current_staff_hospital)]


def paginate(db: Db, query, page: int, size: int) -> tuple[list[TModel], int, int]:
    """Apply page/size to `query` and return (items, total, pages)."""
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.offset((page - 1) * size).limit(size)).all()
    pages = (total + size - 1) // size if size else 0
    return list(rows), total, pages


def get_object_or_404(db: Db, model: type[TModel], obj_id: str) -> TModel:
    """Fetch an object by primary key or raise a consistent 404."""
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__name__} not found",
        )
    return obj


def check_hospital_exists(db: Db, hospital_id: str) -> None:
    """Raise 404 when the hospital id does not exist."""
    exists = db.scalar(select(Hospital.id).where(Hospital.id == hospital_id))
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found",
        )


def pagination_params(
    page: int = Query(1, ge=1, description="Page number, starting at 1."),
    size: int = Query(20, ge=1, le=100, description="Items per page (max 100)."),
) -> tuple[int, int]:
    """Standard list pagination query parameters."""
    return page, size


Pagination = Annotated[tuple[int, int], Depends(pagination_params)]