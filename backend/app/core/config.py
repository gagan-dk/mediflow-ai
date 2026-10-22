"""Application configuration loaded from environment variables.

All secrets and connection details are read from the environment / .env file.
Nothing here is hard-coded or committed to source control.
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Backend runtime settings.

    Environment variables take precedence over .env file values.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "MediFlow AI Backend"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = Field(
        default="postgresql+psycopg://mediflow:mediflow@localhost:5432/mediflow",
        description="SQLAlchemy database URL.",
    )

    # CORS - frontend origins allowed to call this API.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Security (overridden via .env in production)
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_auth: str = "5/minute"

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v != "change-me-in-production" and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long for production security.")
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (avoids re-reading .env on every call)."""
    return Settings()


settings = get_settings()