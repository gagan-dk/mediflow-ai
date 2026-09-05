"""Staff write/management APIs.

Every endpoint resolves the acting hospital exclusively from the authenticated
staff member's server-side assignment (`get_current_staff_hospital`, backed by
the `hospital_staff` table). The request body never carries `hospital_id` and
cross-hospital access is rejected with 403.
"""

import logging

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import Db, StaffHospitalId
from app.core.database import commit_and_refresh
from app.models import (
    Ambulance,
    Bed,
    Doctor,
    Hospital,
    HospitalOperation,
    Room,
)
from app.schemas.hospital import (
    AmbulanceRead,
    BedRead,
    DoctorRead,
    HospitalRead,
    OperationRead,
    RoomRead,
)
from app.schemas.staff import (
    AmbulanceCreate,
    AmbulanceUpdate,
    BedCreate,
    BedUpdate,
    DoctorCreate,
    DoctorUpdate,
    MyHospitalResponse,
    MyHospitalUpdate,
    OperationUpdate,
    RoomCreate,
    RoomUpdate,
)

logger = logging.getLogger("mediflow.api.staff")

router = APIRouter(prefix="/api/staff", tags=["staff"])


def _owned_or_403(db: Db, model, obj_id: str, hospital_id: str):
    """Fetch a staff-managed record and verify it belongs to `hospital_id`."""
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__name__} not found",
        )
    if obj.hospital_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resource belongs to another hospital",
        )
    return obj


def _my_hospital(db: Db, hospital_id: str) -> Hospital:
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found",
        )
    return hospital


def _my_operations(db: Db, hospital_id: str) -> HospitalOperation | None:
    return db.scalar(
        select(HospitalOperation).where(HospitalOperation.hospital_id == hospital_id)
    )


def _my_hospital_response(db: Db, hospital_id: str) -> MyHospitalResponse:
    hospital = _my_hospital(db, hospital_id)
    operation = _my_operations(db, hospital_id)
    return MyHospitalResponse(
        hospital=HospitalRead.model_validate(hospital),
        operations=OperationRead.model_validate(operation) if operation else None,
    )


def _commit_and_refresh(db: Db, obj) -> None:
    try:
        commit_and_refresh(db, obj)
    except IntegrityError:
        # Constraint violations (unique numbers, registration numbers, etc.)
        # are conflicts, not internal errors. Roll back before responding so a
        # failed write never leaks into the next request.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Record conflicts with existing data",
        )


def _apply_updates(obj, payload) -> None:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)


# ─── My hospital ─────────────────────────────────────────────────────────────


@router.get("/my-hospital", response_model=MyHospitalResponse, summary="Get my hospital snapshot")
def get_my_hospital(db: Db, hospital_id: StaffHospitalId) -> MyHospitalResponse:
    logger.info("staff.my-hospital get hospital=%s", hospital_id)
    return _my_hospital_response(db, hospital_id)


@router.put("/my-hospital", response_model=MyHospitalResponse, summary="Update my hospital profile")
def update_my_hospital(
    payload: MyHospitalUpdate, db: Db, hospital_id: StaffHospitalId
) -> MyHospitalResponse:
    hospital = _my_hospital(db, hospital_id)
    _apply_updates(hospital, payload)
    _commit_and_refresh(db, hospital)
    logger.info("staff.my-hospital updated hospital=%s", hospital_id)
    return _my_hospital_response(db, hospital_id)


# ─── Doctors ─────────────────────────────────────────────────────────────────


@router.post(
    "/doctors",
    response_model=DoctorRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a doctor to my hospital",
)
def create_doctor(
    payload: DoctorCreate, db: Db, hospital_id: StaffHospitalId
) -> DoctorRead:
    doctor = Doctor(**payload.model_dump(), hospital_id=hospital_id)
    _commit_and_refresh(db, doctor)
    logger.info("staff.doctor created id=%s hospital=%s", doctor.id, hospital_id)
    return DoctorRead.model_validate(doctor)


@router.put("/doctors/{doctor_id}", response_model=DoctorRead, summary="Update a doctor")
def update_doctor(
    doctor_id: str, payload: DoctorUpdate, db: Db, hospital_id: StaffHospitalId
) -> DoctorRead:
    doctor = _owned_or_403(db, Doctor, doctor_id, hospital_id)
    _apply_updates(doctor, payload)
    _commit_and_refresh(db, doctor)
    logger.info("staff.doctor updated id=%s", doctor_id)
    return DoctorRead.model_validate(doctor)


@router.delete(
    "/doctors/{doctor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a doctor",
)
def delete_doctor(
    doctor_id: str, db: Db, hospital_id: StaffHospitalId
) -> Response:
    doctor = _owned_or_403(db, Doctor, doctor_id, hospital_id)
    db.delete(doctor)
    db.commit()
    logger.info("staff.doctor deleted id=%s", doctor_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Rooms ───────────────────────────────────────────────────────────────────


@router.post(
    "/rooms",
    response_model=RoomRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a room to my hospital",
)
def create_room(payload: RoomCreate, db: Db, hospital_id: StaffHospitalId) -> RoomRead:
    room = Room(**payload.model_dump(), hospital_id=hospital_id)
    _commit_and_refresh(db, room)
    logger.info("staff.room created id=%s hospital=%s", room.id, hospital_id)
    return RoomRead.model_validate(room)


@router.put("/rooms/{room_id}", response_model=RoomRead, summary="Update a room")
def update_room(
    room_id: str, payload: RoomUpdate, db: Db, hospital_id: StaffHospitalId
) -> RoomRead:
    room = _owned_or_403(db, Room, room_id, hospital_id)
    _apply_updates(room, payload)
    _commit_and_refresh(db, room)
    logger.info("staff.room updated id=%s", room_id)
    return RoomRead.model_validate(room)


# ─── Beds ────────────────────────────────────────────────────────────────────


def _validate_bed_room(db: Db, room_id: str | None, hospital_id: str) -> None:
    if room_id is None:
        return
    room = db.get(Room, room_id)
    if room is None or room.hospital_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="room_id does not belong to this hospital",
        )


@router.post(
    "/beds",
    response_model=BedRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a bed to my hospital",
)
def create_bed(payload: BedCreate, db: Db, hospital_id: StaffHospitalId) -> BedRead:
    _validate_bed_room(db, payload.room_id, hospital_id)
    bed = Bed(**payload.model_dump(), hospital_id=hospital_id)
    _commit_and_refresh(db, bed)
    logger.info("staff.bed created id=%s hospital=%s", bed.id, hospital_id)
    return BedRead.model_validate(bed)


@router.put("/beds/{bed_id}", response_model=BedRead, summary="Update a bed")
def update_bed(
    bed_id: str, payload: BedUpdate, db: Db, hospital_id: StaffHospitalId
) -> BedRead:
    bed = _owned_or_403(db, Bed, bed_id, hospital_id)
    _validate_bed_room(db, payload.room_id, hospital_id)
    _apply_updates(bed, payload)
    _commit_and_refresh(db, bed)
    logger.info("staff.bed updated id=%s", bed_id)
    return BedRead.model_validate(bed)


# ─── Ambulances ──────────────────────────────────────────────────────────────


@router.post(
    "/ambulances",
    response_model=AmbulanceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add an ambulance to my hospital",
)
def create_ambulance(
    payload: AmbulanceCreate, db: Db, hospital_id: StaffHospitalId
) -> AmbulanceRead:
    ambulance = Ambulance(**payload.model_dump(), hospital_id=hospital_id)
    _commit_and_refresh(db, ambulance)
    logger.info("staff.ambulance created id=%s hospital=%s", ambulance.id, hospital_id)
    return AmbulanceRead.model_validate(ambulance)


@router.put("/ambulances/{ambulance_id}", response_model=AmbulanceRead, summary="Update an ambulance")
def update_ambulance(
    ambulance_id: str,
    payload: AmbulanceUpdate,
    db: Db,
    hospital_id: StaffHospitalId,
) -> AmbulanceRead:
    ambulance = _owned_or_403(db, Ambulance, ambulance_id, hospital_id)
    _apply_updates(ambulance, payload)
    _commit_and_refresh(db, ambulance)
    logger.info("staff.ambulance updated id=%s", ambulance_id)
    return AmbulanceRead.model_validate(ambulance)


# ─── Operations ──────────────────────────────────────────────────────────────


@router.put("/operations", response_model=OperationRead, summary="Update my hospital's live metrics")
def update_operations(
    payload: OperationUpdate, db: Db, hospital_id: StaffHospitalId
) -> OperationRead:
    operation = _my_operations(db, hospital_id)
    if operation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operational data not found for the hospital",
        )
    _apply_updates(operation, payload)
    _commit_and_refresh(db, operation)
    logger.info("staff.operations updated hospital=%s", hospital_id)
    return OperationRead.model_validate(operation)