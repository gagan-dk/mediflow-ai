"""Shared Pydantic schemas: pagination envelope and consistent error payloads."""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class APIModel(BaseModel):
    """Base schema that can be built directly from SQLAlchemy rows."""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    """Consistent pagination envelope used by every list endpoint."""

    items: list[T]
    total: int
    page: int
    size: int
    pages: int


class ErrorDetail(BaseModel):
    """A single validation or business-rule error entry."""

    field: str | None = None
    message: str
    type: str | None = None


class ErrorPayload(BaseModel):
    """Consistent error response body.

    The HTTP envelope is `{"error": <ErrorPayload>}`.
    """

    code: str
    message: str
    details: list[ErrorDetail] | None = None