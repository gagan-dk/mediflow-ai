"""Phase 6 hardening tests.

Covers the behaviours added for frontend integration:
- readiness endpoint (and unchanged liveness/db contracts)
- transaction rollback on failures (including a real HTTP conflict)
- structured logging that never leaks passwords/tokens
- OpenAPI document accuracy (error schemas, per-operation error responses,
  request bodies, response models, summaries)
- CORS on the frontend development origin
- the consistent error envelope
"""

import io
import logging

import pytest

from app.core.database import get_db
from app.core.logging import RedactingFilter
from app.models import Doctor, DoctorStatus, Hospital, HospitalStatus, User, UserRole
from app.core.security import hash_password


def _seed_hospital(db, hospital_id: str = "hosp-a", name: str = "Hospital A") -> Hospital:
    hospital = Hospital(
        id=hospital_id,
        name=name,
        address=f"{name} Address",
        city="Bangalore",
        state="Karnataka",
        latitude=12.9716,
        longitude=77.5946,
        phone="+91 80 0000 0000",
        email=f"contact@{hospital_id}.test",
        emergency_available=True,
        status=HospitalStatus.ACTIVE,
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


def _seed_staff(db, hospital_id: str, email: str = "staff@test.com") -> User:
    from app.models import HospitalStaff

    staff = User(
        email=email,
        password_hash=hash_password("password123"),
        full_name="Staff User",
        role=UserRole.HOSPITAL_STAFF,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    db.add(
        HospitalStaff(
            user_id=staff.id,
            hospital_id=hospital_id,
            staff_role="Emergency Physician",
        )
    )
    db.commit()
    return staff


# ─── Health & readiness ──────────────────────────────────────────────────────


def test_readiness_returns_200_when_ready(client) -> None:
    resp = client.get("/api/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ready"
    assert body["database"] == "connected"
    assert body["version"]
    assert body["checks"]["database"] == "connected"


def test_liveness_contract_unchanged(client) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"status", "database", "version"}


def test_db_connectivity_contract_unchanged(client) -> None:
    resp = client.get("/api/health/db")
    assert resp.status_code == 200
    assert set(resp.json()) == {"status"}


# ─── Transaction handling & rollback ─────────────────────────────────────────


def test_get_db_rolls_back_on_exception() -> None:
    """A raised error inside the request rolls back pending writes."""
    from sqlalchemy import func, select

    from app.models import User as UserModel

    gen = get_db()
    session = next(gen)
    session.add(
        UserModel(
            email="rollback@test.com",
            password_hash="hash",
            full_name="Rollback",
            role=UserRole.PATIENT,
        )
    )
    with pytest.raises(RuntimeError):
        gen.throw(RuntimeError("boom"))

    from app.core.database import SessionLocal

    fresh = SessionLocal()
    try:
        count = fresh.scalar(select(func.count()).select_from(UserModel))
    finally:
        fresh.close()
    assert count == 0


def test_http_conflict_leaves_no_partial_row(client, db, auth_headers) -> None:
    """A unique-constraint conflict returns 409 and persists nothing."""
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    db.add(
        Doctor(
            id="doc-keep",
            hospital_id=hospital.id,
            name="Dr. Keep",
            specialty="Cardiology",
            registration_number="REG-1",
            status=DoctorStatus.AVAILABLE,
        )
    )
    db.commit()

    resp = client.post(
        "/api/staff/doctors",
        json={
            "name": "Dr. Clone",
            "specialty": "Cardiology",
            "registration_number": "REG-1",
        },
        headers=auth_headers(staff),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "conflict"

    from sqlalchemy import select

    doctors = db.scalars(select(Doctor)).all()
    assert [d.id for d in doctors] == ["doc-keep"]


def test_error_envelope_is_consistent(client, db, auth_headers) -> None:
    """Validation errors and missing resources share one envelope shape."""
    hospital = _seed_hospital(db)
    staff = _seed_staff(db, hospital.id)

    validation = client.post(
        "/api/staff/doctors", json={"specialty": "No name"}, headers=auth_headers(staff)
    )
    assert validation.status_code == 422
    assert set(validation.json()) == {"error"}
    err = validation.json()["error"]
    assert set(err) == {"code", "message", "details"}
    assert err["code"] == "validation_error"
    assert isinstance(err["details"], list)
    assert "field" in err["details"][0]

    missing = client.put(
        "/api/staff/doctors/ghost", json={"status": "BUSY"}, headers=auth_headers(staff)
    )
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"
    assert missing.json()["error"]["details"] is None


# ─── Structured logging safety ───────────────────────────────────────────────


def _capture_logger(lines: "list[str]"):
    handler = logging.StreamHandler(io.StringIO())
    stream = handler.stream

    def _sink(record: logging.LogRecord) -> None:
        lines.append(record.getMessage())

    handler.emit = _sink  # type: ignore[method-assign, assignment]
    logger = logging.getLogger("mediflow")
    logger.addHandler(handler)
    return handler


def test_redacting_filter_masks_password_and_tokens() -> None:
    record = logging.LogRecord(
        name="mediflow",
        level=logging.WARNING,
        pathname=__file__,
        lineno=1,
        msg="failed password=sup3rs3cret and access_token=eyJ.x.y",
        args=(),
        exc_info=None,
    )
    assert RedactingFilter().filter(record) is True
    out = record.getMessage()
    assert "sup3rs3cret" not in out
    assert "eyJ.x.y" not in out
    assert "[REDACTED]" in out


def test_redacting_filter_masks_bearer_tokens() -> None:
    record = logging.LogRecord(
        name="mediflow",
        level=logging.WARNING,
        pathname=__file__,
        lineno=1,
        msg="Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def",
        args=(),
        exc_info=None,
    )
    assert RedactingFilter().filter(record) is True
    out = record.getMessage()
    assert "eyJhbGciOiJIUzI1NiJ9" not in out
    assert "[REDACTED]" in out


def test_failed_login_logs_no_password_or_email(client, db) -> None:
    from app.models import User, UserRole
    from app.core.security import hash_password

    secret = "hunter2secretword"
    user = User(
        email="target@test.com",
        password_hash=hash_password(secret),
        full_name="Target Patient",
        role=UserRole.PATIENT,
    )
    db.add(user)
    db.commit()

    lines: list[str] = []
    handler = _capture_logger(lines)
    try:
        resp = client.post(
            "/api/auth/login",
            json={"email": "target@test.com", "password": "definitely-wrong"},
        )
    finally:
        handler.close()
        logging.getLogger("mediflow").removeHandler(handler)

    assert resp.status_code == 401
    captured = "\n".join(lines)
    assert "definitely-wrong" not in captured
    assert secret not in captured
    assert "target@test.com" not in captured


def test_successful_login_logs_ids_not_secrets(client, db) -> None:
    secret = "password123"
    user = User(
        email="happy@test.com",
        password_hash=hash_password(secret),
        full_name="Happy Patient",
        role=UserRole.PATIENT,
    )
    db.add(user)
    db.commit()

    lines: list[str] = []
    handler = _capture_logger(lines)
    try:
        resp = client.post(
            "/api/auth/login",
            json={"email": "happy@test.com", "password": secret},
        )
    finally:
        handler.close()
        logging.getLogger("mediflow").removeHandler(handler)

    assert resp.status_code == 200
    captured = "\n".join(lines)
    assert str(user.id) in captured
    assert secret not in captured
    assert "happy@test.com" not in captured


# ─── OpenAPI accuracy ────────────────────────────────────────────────────────


def _openapi(client) -> dict:
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    return resp.json()


def test_openapi_defines_canonical_error_schemas(client) -> None:
    schemas = _openapi(client)["components"]["schemas"]
    assert "ErrorPayload" in schemas
    assert "ErrorDetail" in schemas
    assert "code" in schemas["ErrorPayload"]["properties"]
    assert "details" in schemas["ErrorPayload"]["properties"]


def test_openapi_documents_auth_errors_for_staff(client) -> None:
    op = _openapi(client)["paths"]["/api/staff/my-hospital"]["get"]
    assert "401" in op["responses"]
    assert "403" in op["responses"]
    for code in ("401", "403"):
        ref = op["responses"][code]["content"]["application/json"]["schema"]["$ref"]
        assert ref.endswith("/ErrorPayload")


def test_openapi_documents_404_for_path_params(client) -> None:
    op = _openapi(client)["paths"]["/api/hospitals/{hospital_id}"]["get"]
    assert "404" in op["responses"]
    ref = op["responses"]["404"]["content"]["application/json"]["schema"]["$ref"]
    assert ref.endswith("/ErrorPayload")


def test_openapi_documents_409_for_token_status_transition(client) -> None:
    op = _openapi(client)["paths"]["/api/queue/tokens/{token_id}/status"]["put"]
    assert "409" in op["responses"]
    ref = op["responses"]["409"]["content"]["application/json"]["schema"]["$ref"]
    assert ref.endswith("/ErrorPayload")


def test_openapi_documents_request_bodies(client) -> None:
    op = _openapi(client)["paths"]["/api/staff/doctors"]["post"]
    assert "requestBody" in op
    ref = op["requestBody"]["content"]["application/json"]["schema"]["$ref"]
    assert ref.endswith("/DoctorCreate")


def test_openapi_documents_success_response_models(client) -> None:
    paths = _openapi(client)["paths"]
    assert "OperationRead" in paths["/api/hospitals/{hospital_id}/operations"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    page_ref = paths["/api/hospitals"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    assert "Page_HospitalRead_" in page_ref


def test_every_operation_has_summary_and_description(client) -> None:
    schema = _openapi(client)
    for path, item in schema["paths"].items():
        for method, op in item.items():
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            assert op.get("summary"), f"{method.upper()} {path} missing summary"
            assert op.get("description"), f"{method.upper()} {path} missing description"
            assert "responses" in op


# ─── CORS for the frontend development origin ────────────────────────────────


def test_cors_allows_frontend_dev_origin(client) -> None:
    resp = client.options(
        "/api/hospitals",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_allows_alt_local_host_origin(client) -> None:
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"