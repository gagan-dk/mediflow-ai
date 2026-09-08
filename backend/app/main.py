"""MediFlow AI Backend — FastAPI application entry point."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging

# Install the structured logger class and handlers BEFORE any router module
# creates its logger, so every `mediflow.*` logger is a StructuredLogger that
# accepts `extra={...}` structured fields.
setup_logging(debug=settings.debug)
logger = logging.getLogger("mediflow")

from app.api.admin import router as admin_router  # noqa: E402
from app.api.auth import router as auth_router  # noqa: E402
from app.api.emergencies import router as emergencies_router  # noqa: E402
from app.api.hospitals import router as hospitals_router  # noqa: E402
from app.api.staff import router as staff_router  # noqa: E402
from app.core.database import check_database_connectivity  # noqa: E402
from app.schemas.common import ErrorPayload  # noqa: E402

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the MediFlow emergency triage platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hospitals_router)
app.include_router(staff_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(emergencies_router)

if not settings.debug and settings.secret_key == "change-me-in-production":
    raise RuntimeError(
        "Refusing to start: SECRET_KEY is the insecure default "
        "'change-me-in-production'. Set a strong random SECRET_KEY via the "
        "environment before starting in non-debug mode."
    )


# ─── Consistent error format ─────────────────────────────────────────────────

_STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    500: "internal_error",
    503: "service_unavailable",
}


def _error_envelope(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    code = _STATUS_CODES.get(exc.status_code, "error")
    logger.info("http error", extra={"path": request.url.path, "status": exc.status_code, "code": code})
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_envelope(code, detail, None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []) if part != "body")
        details.append({"field": loc or None, "message": err.get("msg", "Invalid value"), "type": err.get("type")})
    logger.info("validation error", extra={"path": request.url.path, "count": len(details)})
    return JSONResponse(
        status_code=422,
        content=_error_envelope("validation_error", "Request validation failed", details),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, IntegrityError):
        logger.info("integrity conflict", extra={"path": request.url.path})
        return JSONResponse(
            status_code=409,
            content=_error_envelope("conflict", "Record conflicts with existing data", None),
        )
    logger.exception("unhandled error", extra={"path": request.url.path})
    return JSONResponse(
        status_code=500,
        content=_error_envelope("internal_error", "An unexpected error occurred", None),
    )


# ─── Health & readiness ──────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Liveness response: the process is up and reports database reachability."""

    status: str
    database: str
    version: str


class ReadinessResponse(BaseModel):
    """Readiness response: the service is ready to handle traffic."""

    status: str
    database: str
    version: str
    checks: dict[str, str]


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["system"],
    summary="Liveness probe",
    description=(
        "Returns 200 as long as the process is running. `database` reflects the "
        "last connectivity check; a degraded value does not change the HTTP status."
    ),
)
def health_check() -> HealthResponse:
    """Return service health and database connectivity status."""
    db_ok = check_database_connectivity()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        database="connected" if db_ok else "unavailable",
        version=settings.app_version,
    )


@app.get(
    "/api/health/db",
    tags=["system"],
    summary="Database connectivity probe",
    description="Return database connectivity status only (200 always).",
)
def database_connectivity() -> dict[str, str]:
    """Return database connectivity status only."""
    db_ok = check_database_connectivity()
    return {"status": "ok" if db_ok else "unavailable"}


@app.get(
    "/api/health/ready",
    response_model=ReadinessResponse,
    tags=["system"],
    summary="Readiness probe",
    description=(
        "Returns 200 only when every required dependency (database) is reachable; "
        "otherwise returns 503 with the standard error envelope. Orchestrators "
        "should route traffic to this endpoint."
    ),
    responses={503: {"description": "Not ready (dependency unavailable)", "model": ErrorPayload}},
)
def readiness_check() -> JSONResponse:
    """Return 200 when the service is ready to serve traffic, else 503."""
    db_ok = check_database_connectivity()
    if not db_ok:
        logger.warning("readiness failed", extra={"database": "unavailable"})
        return JSONResponse(
            status_code=503,
            content=_error_envelope("service_unavailable", "Service is not ready", None),
        )
    return JSONResponse(
        status_code=200,
        content={
            "status": "ready",
            "database": "connected",
            "version": settings.app_version,
            "checks": {"database": "connected"},
        },
    )


# ─── OpenAPI customization ───────────────────────────────────────────────────

# Register the shared error schemas once so the generated OpenAPI document
# references one canonical definition for every error response.

_STANDARD_ERROR_RESPONSES: dict = {
    401: ("Missing, invalid, or expired access token", ErrorPayload),
    403: ("Authenticated but not permitted for this resource", ErrorPayload),
    404: ("Resource not found", ErrorPayload),
    409: ("Request conflicts with current state", ErrorPayload),
}


def _error_response_spec(status_code: int) -> dict:
    description, model = _STANDARD_ERROR_RESPONSES[status_code]
    return {
        "description": description,
        "content": {
            "application/json": {"schema": {"$ref": f"#/components/schemas/{model.__name__}"}}
        },
    }


def _operation_needs_auth(path: str) -> bool:
    """Return True when the route requires a Bearer token or valid credentials.

    Public read and self-registration routes are intentionally excluded so the
    documented error set matches reality.
    """
    return path.startswith(
        (
            "/api/staff/",
            "/api/admin/",
            "/api/emergency-cases/",
            "/api/patients/me/",
            "/api/queue/",
        )
    ) or path in {"/api/auth/me", "/api/auth/login"}


def _operation_has_path_param(path: str) -> bool:
    return "{" in path


_orig_openapi = app.openapi


def _custom_openapi() -> dict:
    if app.openapi_schema is not None:
        return app.openapi_schema

    schema = _orig_openapi()
    components = schema.setdefault("components", {})
    schemas = components.setdefault("schemas", {})

    schemas["ErrorDetail"] = {
        "type": "object",
        "properties": {
            "field": {"type": "string", "nullable": True, "example": "email"},
            "message": {"type": "string", "example": "Value error, Password is too long"},
            "type": {"type": "string", "nullable": True, "example": "value_error"},
        },
    }

    schemas["ErrorPayload"] = {
        "type": "object",
        "required": ["code", "message"],
        "properties": {
            "code": {"type": "string", "example": "not_found"},
            "message": {"type": "string", "example": "Hospital not found"},
            "details": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/ErrorDetail"},
                "nullable": True,
            },
        },
        "example": {
            "error": ErrorPayload(code="not_found", message="Hospital not found", details=None).model_dump()
        },
    }

    # Every documented error status maps to the canonical envelope schema. The
    # description shown for a code already documented by a route decorator is
    # kept (route-specific descriptions are more useful than generic ones).
    _CANONICAL_ERROR_SCHEMAS: dict[int, tuple[str, type]] = {
        **{code: desc for code, desc in _STANDARD_ERROR_RESPONSES.items()},
        400: ("Bad request", ErrorPayload),
        500: ("Internal server error", ErrorPayload),
        503: ("Service unavailable", ErrorPayload),
    }

    for path, path_item in schema.get("paths", {}).items():
        for method, operation in path_item.items():
            if not isinstance(operation, dict) or "responses" not in operation:
                continue

            documented = {str(code) for code in operation.get("responses", {})}

            # 1. Canonicalize every documented error response to a
            #    $ref on the shared ErrorPayload schema.
            for status_str in list(operation["responses"]):
                if not status_str.isdigit():
                    continue
                status_code = int(status_str)
                if status_code < 400 or status_code not in _CANONICAL_ERROR_SCHEMAS:
                    continue
                description, model = _CANONICAL_ERROR_SCHEMAS[status_code]
                existing = operation["responses"][status_str]
                operation["responses"][status_str] = {
                    "description": existing.get("description", description),
                    "content": {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{model.__name__}"}
                        }
                    },
                }

            # 2. Add the responses that are structurally guaranteed by the
            #    route but were not documented in the decorator.
            additions: dict[str, dict] = {}

            if _operation_needs_auth(path):
                additions["401"] = _error_response_spec(401)
                if path not in {"/api/auth/login", "/api/auth/register", "/api/auth/me"}:
                    additions["403"] = _error_response_spec(403)

            if _operation_has_path_param(path):
                additions["404"] = _error_response_spec(404)

            if path.endswith("/api/auth/register"):
                additions["409"] = _error_response_spec(409)

            # The queue token status endpoint returns 409 on an invalid
            # state-machine transition.
            if path == "/api/queue/tokens/{token_id}/status":
                additions["409"] = _error_response_spec(409)

            for code, spec in additions.items():
                if code not in documented:
                    operation["responses"][code] = spec

            # Every endpoint must be self-describing: operations without an
            # explicit description use their summary.
            if not operation.get("description"):
                operation["description"] = operation.get("summary", "")

    app.openapi_schema = schema
    return schema


app.openapi = _custom_openapi  # type: ignore[method-assign]