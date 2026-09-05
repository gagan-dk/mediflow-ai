"""Emergency case and hospital queue APIs.

Phase 5 wires the `emergency_cases` and `queue_tokens` models to HTTP:

- Patients report emergency cases and direct them to a destination hospital.
  Every case is owned by the authenticating patient; a case belonging to
  another patient is treated as not found so existence is never leaked.
- Hospital staff manage the queue of their own hospital only (resolved
  server-side from `hospital_staff`); cross-hospital access is rejected.
- Prioritization is always server-derived: an emergency case carries an
  AI-assisted `priority_score`, and queue tokens carry a `priority_level`
  computed from the linked case severity. Clients can never reorder
  critical/high priority cases or set priority values themselves.

Wording note: the score is an *AI-assisted prioritization* value (a "priority
score"), never an AI diagnosis.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import (
    CurrentUser,
    Db,
    Pagination,
    PatientUser,
    StaffHospitalId,
    check_hospital_exists,
    get_current_staff_hospital,
    paginate,
)
from app.core.database import commit_and_refresh
from app.models import (
    EmergencyCase,
    Patient,
    QueueStatus,
    QueueToken,
    Severity,
    UserRole,
)
from app.schemas.common import Page
from app.schemas.emergency import (
    EmergencyCaseCreate,
    EmergencyCaseRead,
    HospitalSelectionRequest,
    QueueResponse,
    QueueTokenCreate,
    QueueTokenStatusUpdate,
    QueueTokenView,
)

logger = logging.getLogger("mediflow.api.emergencies")

router = APIRouter(prefix="/api", tags=["emergency"])

# Severity -> queue priority level (higher = more urgent). Server-side only.
_SEVERITY_PRIORITY_LEVEL = {
    Severity.CRITICAL: 4,
    Severity.HIGH: 3,
    Severity.MODERATE: 2,
    Severity.LOW: 1,
}

# Severity -> AI-assisted prioritization value. This is a prioritization
# signal for ordering, not a clinical diagnosis.
_SEVERITY_PRIORITY_SCORE = {
    Severity.CRITICAL: 100.0,
    Severity.HIGH: 80.0,
    Severity.MODERATE: 55.0,
    Severity.LOW: 30.0,
}

_ACTIVE_STATUSES = (
    QueueStatus.WAITING,
    QueueStatus.CALLED,
    QueueStatus.IN_PROGRESS,
)

# Valid queue token status transitions; terminal states have no transitions.
_ALLOWED_TRANSITIONS = {
    QueueStatus.WAITING: {QueueStatus.CALLED, QueueStatus.CANCELLED},
    QueueStatus.CALLED: {QueueStatus.IN_PROGRESS, QueueStatus.CANCELLED},
    QueueStatus.IN_PROGRESS: {QueueStatus.COMPLETED, QueueStatus.CANCELLED},
    QueueStatus.COMPLETED: set(),
    QueueStatus.CANCELLED: set(),
}


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_patient(db: Db, user_id: str) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.user_id == user_id))


def _get_or_create_patient(db: Db, user) -> Patient:
    """Return the patient profile for `user`, creating it if absent."""
    patient = _get_patient(db, user.id)
    if patient is not None:
        return patient
    patient = Patient(user_id=user.id, name=user.full_name)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def _commit(db: Db, obj) -> None:
    commit_and_refresh(db, obj)


def _owned_case_or_404(db: Db, case_id: str, patient: Patient | None) -> EmergencyCase:
    """Return `case_id` only if it belongs to `patient`, else 404.

    A 404 (rather than 403) keeps the existence of other patients' cases
    private.
    """
    case = db.get(EmergencyCase, case_id)
    if case is None or patient is None or case.patient_id != patient.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency case not found",
        )
    return case


def _ordered_active_tokens(db: Db, hospital_id: str) -> list[QueueToken]:
    """Active queue tokens in the canonical deterministic order.

    Ordering is priority_level descending (higher urgency first), then
    created_at ascending, then id as a final tiebreaker — never influenced by
    any client-supplied value.
    """
    return list(
        db.scalars(
            select(QueueToken)
            .options(
                selectinload(QueueToken.emergency_case).selectinload(EmergencyCase.patient)
            )
            .where(
                QueueToken.hospital_id == hospital_id,
                QueueToken.status.in_(_ACTIVE_STATUSES),
            )
            .order_by(
                QueueToken.priority_level.desc(),
                QueueToken.created_at.asc(),
                QueueToken.id.asc(),
            )
        )
    )


_MAX_TOKEN_NUMBER_ATTEMPTS = 10


def _next_token_number(db: Db, hospital_id: str) -> str:
    count = (
        db.scalar(
            select(func.count())
            .select_from(QueueToken)
            .where(QueueToken.hospital_id == hospital_id)
        )
        or 0
    )
    return f"TOK-{count + 1:04d}"


def _token_view(token: QueueToken, position: int | None = None) -> QueueTokenView:
    case = token.emergency_case
    patient_name = case_age = case_severity = symptoms = None
    if case is not None:
        case_severity = case.severity
        case_age = case.age
        symptoms = case.reported_symptoms
        if case.patient is not None:
            patient_name = case.patient.name
    return QueueTokenView(
        id=token.id,
        hospital_id=token.hospital_id,
        emergency_case_id=token.emergency_case_id,
        token_number=token.token_number,
        priority_level=token.priority_level,
        queue_position=position if position is not None else token.queue_position,
        status=token.status,
        patient_name=patient_name,
        case_severity=case_severity,
        case_age=case_age,
        reported_symptoms=symptoms,
        called_at=token.called_at,
        completed_at=token.completed_at,
        created_at=token.created_at,
        updated_at=token.updated_at,
    )


def _create_token(db: Db, hospital_id: str, emergency_case: EmergencyCase | None) -> QueueToken:
    """Create a queue token with a purely server-derived priority.

    The priority level comes from the linked case severity (or LOW for a
    walk-in with no case). Neither priority nor position is taken from the
    client, so a critical/high priority case cannot be reordered arbitrarily.

    Token issuance is concurrency-safe: a collision on the per-hospital token
    number (or on the case-per-hospital unique constraint) triggers a rollback
    and retry with a freshly computed number. A case that already holds a
    token at this hospital returns the existing token.
    """
    severity = emergency_case.severity if emergency_case else Severity.LOW
    priority_level = _SEVERITY_PRIORITY_LEVEL[severity]
    active = _ordered_active_tokens(db, hospital_id)
    position = len(active) + 1

    for _ in range(_MAX_TOKEN_NUMBER_ATTEMPTS):
        token = QueueToken(
            hospital_id=hospital_id,
            emergency_case_id=emergency_case.id if emergency_case else None,
            token_number=_next_token_number(db, hospital_id),
            priority_level=priority_level,
            queue_position=position,
            status=QueueStatus.WAITING,
        )
        db.add(token)
        try:
            db.commit()
            db.refresh(token)
            return token
        except IntegrityError:
            db.rollback()
            if emergency_case is not None:
                existing = db.scalar(
                    select(QueueToken).where(
                        QueueToken.emergency_case_id == emergency_case.id,
                        QueueToken.hospital_id == hospital_id,
                    )
                )
                if existing is not None:
                    return existing

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Unable to allocate a queue token number, please retry",
    )


# ─── Emergency cases ─────────────────────────────────────────────────────────


@router.post(
    "/emergency-cases",
    response_model=EmergencyCaseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Report an emergency case",
)
def create_emergency_case(
    payload: EmergencyCaseCreate, db: Db, user: PatientUser
) -> EmergencyCaseRead:
    """Report a new emergency case for the authenticated patient.

    The AI-assisted prioritization value (`priority_score`) is computed
    server-side from the reported severity; it is never supplied by the client.
    """
    patient = _get_or_create_patient(db, user)
    case = EmergencyCase(
        patient_id=patient.id,
        reported_symptoms=payload.reported_symptoms,
        age=payload.age,
        latitude=payload.latitude,
        longitude=payload.longitude,
        severity=payload.severity,
        priority_score=_SEVERITY_PRIORITY_SCORE[payload.severity],
    )
    _commit(db, case)
    logger.info("emergency.created id=%s severity=%s score=%s", case.id, case.severity.value, case.priority_score)
    return EmergencyCaseRead.model_validate(case)


@router.get(
    "/emergency-cases/{case_id}",
    response_model=EmergencyCaseRead,
    summary="Get an emergency case by id (owner only)",
)
def get_emergency_case(case_id: str, db: Db, user: PatientUser) -> EmergencyCaseRead:
    """Return one emergency case owned by the authenticated patient."""
    patient = _get_patient(db, user.id)
    case = _owned_case_or_404(db, case_id, patient)
    return EmergencyCaseRead.model_validate(case)


@router.get(
    "/patients/me/emergency-cases",
    response_model=Page[EmergencyCaseRead],
    summary="List the current patient's emergency cases",
)
def list_my_emergency_cases(
    db: Db, user: PatientUser, pagination: Pagination
) -> Page[EmergencyCaseRead]:
    """List the authenticated patient's own emergency cases."""
    page, size = pagination
    patient = _get_patient(db, user.id)
    if patient is None:
        return Page(items=[], total=0, page=page, size=size, pages=0)
    query = (
        select(EmergencyCase)
        .where(EmergencyCase.patient_id == patient.id)
        .order_by(EmergencyCase.created_at.desc(), EmergencyCase.id.desc())
    )
    items, total, pages = paginate(db, query, page, size)
    return Page(
        items=[EmergencyCaseRead.model_validate(c) for c in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "/emergency-cases/{case_id}/hospital-selection",
    response_model=QueueTokenView,
    status_code=status.HTTP_201_CREATED,
    summary="Select a destination hospital for an emergency case",
)
def select_hospital(
    case_id: str, payload: HospitalSelectionRequest, db: Db, user: PatientUser
) -> QueueTokenView:
    """Direct the patient's emergency case to a destination hospital.

    Placement in the hospital queue is server-determined by the case's
    severity-based priority; the patient only chooses the destination.
    """
    patient = _get_patient(db, user.id)
    case = _owned_case_or_404(db, case_id, patient)
    check_hospital_exists(db, payload.hospital_id)

    existing = db.scalar(
        select(QueueToken).where(
            QueueToken.emergency_case_id == case.id,
            QueueToken.hospital_id == payload.hospital_id,
        )
    )
    if existing is not None:
        logger.info("emergency.hospital-selection existing case=%s hospital=%s", case.id, payload.hospital_id)
        return _token_view(existing)

    token = _create_token(db, hospital_id=payload.hospital_id, emergency_case=case)
    logger.info("emergency.hospital-selection token=%s case=%s hospital=%s", token.id, case.id, payload.hospital_id)
    return _token_view(token)


# ─── Queue ───────────────────────────────────────────────────────────────────


@router.post(
    "/queue/{hospital_id}/tokens",
    response_model=QueueTokenView,
    status_code=status.HTTP_201_CREATED,
    summary="Issue a queue token for my hospital (staff)",
)
def issue_queue_token(
    hospital_id: str,
    payload: QueueTokenCreate,
    db: Db,
    user: CurrentUser,
    staff_hospital: StaffHospitalId,
) -> QueueTokenView:
    """Issue a queue token for the staff member's own hospital only.

    The path hospital must match the staff member's server-resolved hospital,
    otherwise access is denied.
    """
    if staff_hospital != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resource belongs to another hospital",
        )
    check_hospital_exists(db, hospital_id)

    case = None
    if payload.emergency_case_id:
        case = db.get(EmergencyCase, payload.emergency_case_id)
        if case is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency case not found",
            )

    token = _create_token(db, hospital_id=hospital_id, emergency_case=case)
    logger.info("queue.token issued id=%s hospital=%s level=%s", token.id, hospital_id, token.priority_level)
    return _token_view(token)


@router.get(
    "/queue/{hospital_id}",
    response_model=QueueResponse,
    summary="View a hospital queue",
)
def get_queue(hospital_id: str, db: Db, user: CurrentUser) -> QueueResponse:
    """Return a hospital queue filtered by the viewer's role.

    - Hospital staff see the full queue of their own hospital.
    - Patients see only their own tokens in the requested hospital.
    """
    check_hospital_exists(db, hospital_id)

    if user.role == UserRole.HOSPITAL_STAFF:
        staff_hospital = get_current_staff_hospital(db, user)
        if staff_hospital != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Resource belongs to another hospital",
            )
        ordered = _ordered_active_tokens(db, hospital_id)
        items = [_token_view(t, i + 1) for i, t in enumerate(ordered)]
        logger.info("queue.view hospital=%s viewer=staff tokens=%d", hospital_id, len(items))
        return QueueResponse(hospital_id=hospital_id, view="staff", items=items)

    if user.role == UserRole.PATIENT:
        patient = _get_patient(db, user.id)
        ordered = _ordered_active_tokens(db, hospital_id)
        items = []
        if patient is not None:
            for i, token in enumerate(ordered):
                case = token.emergency_case
                if case is not None and case.patient_id == patient.id:
                    items.append(_token_view(token, i + 1))
        logger.info("queue.view hospital=%s viewer=patient tokens=%d", hospital_id, len(items))
        return QueueResponse(hospital_id=hospital_id, view="patient", items=items)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Queue access not permitted for your role.",
    )


@router.put(
    "/queue/tokens/{token_id}/status",
    response_model=QueueTokenView,
    summary="Update a queue token status (staff)",
)
def update_token_status(
    token_id: str,
    payload: QueueTokenStatusUpdate,
    db: Db,
    user: CurrentUser,
    staff_hospital: StaffHospitalId,
) -> QueueTokenView:
    """Advance a queue token through an allowed status transition.

    Tokens may only be updated by staff of the hospital that owns the token.
    Transitions follow a strict state machine; an invalid transition is
    rejected as a conflict.
    """
    token = db.get(QueueToken, token_id)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue token not found",
        )
    if token.hospital_id != staff_hospital:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resource belongs to another hospital",
        )

    new_status = payload.status
    allowed = _ALLOWED_TRANSITIONS[token.status]
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Invalid status transition from {token.status.value} "
                f"to {new_status.value}"
            ),
        )

    now = datetime.now(timezone.utc)
    if new_status == QueueStatus.CALLED:
        token.called_at = now
    elif new_status == QueueStatus.COMPLETED:
        token.completed_at = now
    token.status = new_status
    _commit(db, token)

    logger.info(
        "queue.token status id=%s to=%s hospital=%s",
        token.id,
        new_status.value,
        staff_hospital,
    )
    return _token_view(token)
