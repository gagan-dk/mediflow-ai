"""Public (read-only) hospital and operational APIs.

These endpoints are intentionally free of authentication: they power the
patient-facing discovery/status screens and expose only non-sensitive
operational data. No credentials, provider API keys, or provider place IDs
are ever serialized.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import Db, Pagination, check_hospital_exists, paginate
from app.models import (
    Ambulance,
    Bed,
    Doctor,
    EmergencyRoom,
    Hospital,
    HospitalOperation,
    ICUUnit,
    Room,
)
from app.schemas.common import Page
from app.schemas.hospital import (
    AmbulanceRead,
    BedRead,
    DoctorRead,
    EmergencyRoomRead,
    HospitalRead,
    ICURead,
    OperationRead,
    RoomRead,
)

logger = logging.getLogger("mediflow.api.hospitals")

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


def _get_hospital(db: Db, hospital_id: str) -> Hospital:
    check_hospital_exists(db, hospital_id)
    return db.get(Hospital, hospital_id)


@router.get("", response_model=Page[HospitalRead], summary="List hospitals")
def list_hospitals(db: Db, pagination: Pagination) -> Page[HospitalRead]:
    page, size = pagination
    query = select(Hospital).order_by(Hospital.name)
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.list page=%d size=%d total=%d", page, size, total)
    return Page(items=[HospitalRead.model_validate(h) for h in rows], total=total, page=page, size=size, pages=pages)


@router.get(
    "/{hospital_id}",
    response_model=HospitalRead,
    summary="Get one hospital",
    responses={404: {"description": "Hospital not found"}},
)
def get_hospital(hospital_id: str, db: Db) -> HospitalRead:
    hospital = _get_hospital(db, hospital_id)
    return HospitalRead.model_validate(hospital)


@router.get(
    "/{hospital_id}/doctors",
    response_model=Page[DoctorRead],
    summary="List a hospital's doctors",
)
def list_hospital_doctors(hospital_id: str, db: Db, pagination: Pagination) -> Page[DoctorRead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(Doctor)
        .where(Doctor.hospital_id == hospital_id)
        .order_by(Doctor.name)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.doctors hospital=%s total=%d", hospital_id, total)
    return Page(items=[DoctorRead.model_validate(d) for d in rows], total=total, page=page, size=size, pages=pages)


@router.get(
    "/{hospital_id}/rooms",
    response_model=Page[RoomRead],
    summary="List a hospital's rooms",
)
def list_hospital_rooms(hospital_id: str, db: Db, pagination: Pagination) -> Page[RoomRead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(Room)
        .where(Room.hospital_id == hospital_id)
        .order_by(Room.room_number)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.rooms hospital=%s total=%d", hospital_id, total)
    return Page(items=[RoomRead.model_validate(r) for r in rows], total=total, page=page, size=size, pages=pages)


@router.get(
    "/{hospital_id}/beds",
    response_model=Page[BedRead],
    summary="List a hospital's beds",
)
def list_hospital_beds(hospital_id: str, db: Db, pagination: Pagination) -> Page[BedRead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(Bed)
        .where(Bed.hospital_id == hospital_id)
        .order_by(Bed.bed_number)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.beds hospital=%s total=%d", hospital_id, total)
    return Page(items=[BedRead.model_validate(b) for b in rows], total=total, page=page, size=size, pages=pages)


@router.get(
    "/{hospital_id}/icu",
    response_model=Page[ICURead],
    summary="List a hospital's ICU units",
)
def list_hospital_icu(hospital_id: str, db: Db, pagination: Pagination) -> Page[ICURead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(ICUUnit)
        .where(ICUUnit.hospital_id == hospital_id)
        .order_by(ICUUnit.name)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.icu hospital=%s total=%d", hospital_id, total)
    return Page(items=[ICURead.model_validate(u) for u in rows], total=total, page=page, size=size, pages=pages)


@router.get(
    "/{hospital_id}/emergency-rooms",
    response_model=Page[EmergencyRoomRead],
    summary="List a hospital's emergency rooms",
)
def list_hospital_emergency_rooms(
    hospital_id: str, db: Db, pagination: Pagination
) -> Page[EmergencyRoomRead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(EmergencyRoom)
        .where(EmergencyRoom.hospital_id == hospital_id)
        .order_by(EmergencyRoom.name)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.emergency-rooms hospital=%s total=%d", hospital_id, total)
    return Page(
        items=[EmergencyRoomRead.model_validate(er) for er in rows],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/{hospital_id}/ambulances",
    response_model=Page[AmbulanceRead],
    summary="List a hospital's ambulances",
)
def list_hospital_ambulances(
    hospital_id: str, db: Db, pagination: Pagination
) -> Page[AmbulanceRead]:
    _get_hospital(db, hospital_id)
    page, size = pagination
    query = (
        select(Ambulance)
        .where(Ambulance.hospital_id == hospital_id)
        .order_by(Ambulance.vehicle_number)
    )
    rows, total, pages = paginate(db, query, page, size)
    logger.info("hospitals.ambulances hospital=%s total=%d", hospital_id, total)
    return Page(
        items=[AmbulanceRead.model_validate(a) for a in rows],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/{hospital_id}/operations",
    response_model=OperationRead,
    summary="Get a hospital's live operational metrics",
)
def get_hospital_operations(hospital_id: str, db: Db) -> OperationRead:
    _get_hospital(db, hospital_id)
    operation = db.scalar(
        select(HospitalOperation).where(HospitalOperation.hospital_id == hospital_id)
    )
    if operation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operational data not found for the hospital",
        )
    return OperationRead.model_validate(operation)