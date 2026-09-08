"""Password hashing and JWT token utilities.

Passwords are hashed with bcrypt (never stored in plaintext) and access tokens
are signed JWTs with a configurable expiration. All secrets come from the
environment via Settings.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"
_TOKEN_TYPE = "access"

# Claims
_SUBJECT = "sub"
_EMAIL = "email"
_ROLE = "role"
_TYPE = "type"
_EXPIRES = "exp"
_ISSUED_AT = "iat"


def hash_password(password: str) -> str:
    """Return a bcrypt hash for `password`."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when `password` matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def create_access_token(
    subject: str,
    email: str,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT access token for a user.

    Only non-sensitive identity claims are embedded; expirations are configurable
    through Settings and can be overridden per call (used by tests).
    """
    expire_minutes = (
        expires_minutes
        if expires_minutes is not None
        else settings.access_token_expire_minutes
    )
    now = datetime.now(timezone.utc)
    payload = {
        _SUBJECT: subject,
        _EMAIL: email,
        _ROLE: role,
        _TYPE: _TOKEN_TYPE,
        _ISSUED_AT: now,
        _EXPIRES: now + timedelta(minutes=expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token.

    Raises `jwt.PyJWTError` for any invalid/expired/tampered token.
    """
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])