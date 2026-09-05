"""Pydantic schemas for emergency case and hospital queue workflows.

The `priority_score` on an emergency case is an AI-assisted prioritization
value derived server-side from the case severity. It is a prioritization
signal used to order queues — it is never treated as, or labelled as, a
clinical diagnosis. Clients cannot set it.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import EmergencyCaseStatus, QueueStatus, Severity
from app.schemas.common import APIModel


class EmergencyCaseCreate(BaseModel):
    """Payload for a patient reporting an emergency case.

    `severity` is the emergency severity enum reported by the patient; the
    platform derives the AI-assisted prioritization value server-side.
    """

    model_config = ConfigDict(extra="forbid")

    reported_symptoms: str = Field(min_length=1, max_length=2000)
    age: int | None = Field(default=None, ge=0, le=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    severity: Severity


class EmergencyCaseRead(APIModel):
    """Emergency case as seen by its owning patient."""

    id: str
    patient_id: str
    reported_symptoms: str
    age: int | None = None
    latitude: float
    longitude: float
    severity: Severity
    priority_score: float | None = None
    status: EmergencyCaseStatus
    created_at: datetime
    updated_at: datetime


class HospitalSelectionRequest(BaseModel):
    """Patient-directed hospital selection for an emergency case."""

    model_config = ConfigDict(extra="forbid")

    hospital_id: str = Field(min_length=1, max_length=36)


class QueueTokenCreate(BaseModel):
    """Staff-issued queue token for a hospital.

    The token's priority is derived server-side from the linked emergency
    case severity (or LOW for a walk-in without a case). Clients cannot
    influence priority ordering of the queue.
    """

    model_config = ConfigDict(extra="forbid")

    emergency_case_id: str | None = Field(default=None, min_length=1, max_length=36)


class QueueTokenStatusUpdate(BaseModel):
    """Staff update of a queue token status within an allowed transition."""

    model_config = ConfigDict(extra="forbid")

    status: QueueStatus


class QueueTokenView(APIModel):
    """A queue token plus the minimal triage context needed to manage it.

    When rendered to a patient, only that patient's own tokens are returned,
    so no other patient's data is exposed.
    """

    id: str
    hospital_id: str
    emergency_case_id: str | None = None
    token_number: str
    priority_level: int
    queue_position: int
    status: QueueStatus
    patient_name: str | None = None
    case_severity: Severity | None = None
    case_age: int | None = None
    reported_symptoms: str | None = None
    called_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class QueueResponse(APIModel):
    """A hospital queue as seen by one viewer role.

    `view` is "staff" (the full queue of the staff member's own hospital) or
    "patient" (only that patient's own tokens in the requested hospital).
    """

    hospital_id: str
    view: str
    items: list[QueueTokenView]
