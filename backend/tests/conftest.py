"""Shared pytest fixtures for API tests.

The engine is configured against a throwaway SQLite file BEFORE `app.main` is
imported so the app binds to a real, isolated database for the whole session.

Auth helpers let tests mint real JWT access tokens for users created inline,
so every test exercises the same dependency chain as production.
"""

import os
import tempfile

_scratch_dir = tempfile.mkdtemp(prefix="mediflow_tests_")
_db_path = os.path.join(_scratch_dir, "test.db").replace(os.sep, "/")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
# Tests always get a private signing key; an env value (or .env) wins via
# setdefault semantics, and the app's insecure-production fail-fast never
# fires under pytest even when backend/.env is absent.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models  # noqa: E402, F401  (registers every table on Base)
from app.core.database import SessionLocal, engine  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models import UserRole  # noqa: E402

# Models register on app.models.base.Base (a separate declarative base from the
# one defined in app.core.database). Use the models' metadata for DDL.
from app.models import Base as ModelsBase  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database_schema():
    ModelsBase.metadata.create_all(bind=engine)
    yield
    ModelsBase.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Start every test from an empty database."""
    with engine.begin() as conn:
        for table in reversed(ModelsBase.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture()
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def user_factory(db):
    """Create a user row with a real bcrypt hash and return the ORM object."""

    def _create(
        email: str = "user@test.com",
        password: str = "password123",
        role: UserRole = UserRole.PATIENT,
        full_name: str = "Test User",
        phone: str | None = None,
    ):
        from app.models import User

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            phone=phone,
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _create


@pytest.fixture()
def auth_headers():
    """Return an Authorization header dict for a user's fresh access token."""

    def _headers(user, expires_minutes: int | None = None) -> dict[str, str]:
        token = create_access_token(
            subject=user.id,
            email=user.email,
            role=user.role.value,
            expires_minutes=expires_minutes,
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers