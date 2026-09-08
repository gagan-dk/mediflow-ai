"""Authentication endpoints: register, login, current user.

Passwords are hashed with bcrypt before storage and never returned by any
response. Login uses a generic error message to avoid leaking whether an email
is registered. Access tokens are short-lived JWTs with configurable expiry.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, Db
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead

logger = logging.getLogger("mediflow.api.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a patient account",
)
def register(payload: RegisterRequest, db: Db) -> UserRead:
    """Create a patient account.

    Self-service registration only creates `PATIENT` accounts; staff and admin
    roles are assigned by an administrator.
    """
    email = payload.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=UserRole.PATIENT,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )
    db.refresh(user)
    logger.info("auth.register user=%s", user.id)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Exchange credentials for an access token",
)
def login(payload: LoginRequest, db: Db) -> TokenResponse:
    """Validate credentials server-side and issue a JWT access token."""
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        logger.warning("auth.login failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        subject=user.id,
        email=user.email,
        role=user.role.value,
    )
    logger.info("auth.login success user=%s role=%s", user.id, user.role.value)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserRead.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get the current authenticated user",
)
def me(user: CurrentUser) -> UserRead:
    """Return the identity of the bearer token's owner."""
    return UserRead.model_validate(user)