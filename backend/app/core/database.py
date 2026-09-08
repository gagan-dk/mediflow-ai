"""Database engine and session management using SQLAlchemy 2.x.

The engine is created with a short connection timeout so health checks
fail fast when the database is unreachable.

Transaction handling:
- ``get_db`` rolls back any in-flight transaction when a request handler
  raises, so a failed write never leaks a partially-applied change into the
  next request or onto the connection pool.
- ``commit_and_refresh`` is the single canonical way to persist an ORM object
  and return a usable, expired-safe instance.
"""

from collections.abc import Generator
from typing import TypeVar

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

T = TypeVar("T")

connect_args: dict = {}
if settings.database_url.startswith("postgresql"):
    connect_args["connect_timeout"] = 3
    connect_args["attempts"] = 1

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=settings.debug,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session.

    Rollback is guaranteed on every exit path: after a successful commit there
    is nothing pending to roll back, and when a handler fails (whether its
    exception is caught by a FastAPI exception handler or not) any partial
    writes are discarded. The session is always closed afterwards.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


def commit_and_refresh(db: Session, obj: T) -> T:
    """Persist `obj` in one transaction and return it refreshed.

    Commits the current transaction and reloads `obj` so the caller can
    safely serialize it. Raises on failure; callers that need a mapped HTTP
    error catch the exception and use `db.rollback()` before responding.
    """
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def check_database_connectivity() -> bool:
    """Return True if the database is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False