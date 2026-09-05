"""Tests for the FastAPI application and health endpoints."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_scratch.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_health_endpoint_returns_200() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["version"] == "0.1.0"
    assert body["status"] in {"ok", "degraded"}
    assert body["database"] in {"connected", "unavailable"}


def test_db_connectivity_endpoint_returns_200() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/health/db")
    assert resp.status_code == 200
    assert resp.json()["status"] in {"ok", "unavailable"}


def test_openapi_schema_available() -> None:
    with TestClient(app) as client:
        resp = client.get("/openapi.json")
    assert resp.status_code == 200
    assert "/api/health" in resp.json()["paths"]