"""Admin-only management operations.

Every endpoint in this router requires the `ADMIN` role (enforced at the router
level). Admins can list users and assign roles; this is how new `HOSPITAL_STAFF`
and `ADMIN` accounts are onboarded since self-registration only creates patients.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import AdminUser, Db, Pagination, get_object_or_404, paginate, require_role
from app.core.database import commit_and_refresh
from app.models import User, UserRole
from app.schemas.auth import AdminUserListRead, UpdateRoleRequest
from app.schemas.common import Page

logger = logging.getLogger("mediflow.api.admin")

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)


@router.get(
    "/users",
    response_model=Page[AdminUserListRead],
    summary="List all users (admin only)",
)
def list_users(db: Db, pagination: Pagination) -> Page[AdminUserListRead]:
    """Return a paginated list of user accounts."""
    page, size = pagination
    query = select(User).order_by(User.created_at, User.id)
    rows, total, pages = paginate(db, query, page, size)
    return Page(
        items=[AdminUserListRead.model_validate(u) for u in rows],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.patch(
    "/users/{user_id}/role",
    response_model=AdminUserListRead,
    summary="Assign a role to a user (admin only)",
)
def update_user_role(
    user_id: str, payload: UpdateRoleRequest, db: Db, admin: AdminUser
) -> AdminUserListRead:
    """Change a user's role, enabling staff/admin onboarding."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot change their own role.",
        )
    user = get_object_or_404(db, User, user_id)
    user.role = payload.role
    commit_and_refresh(db, user)
    logger.info("admin.role user=%s role=%s actor=%s", user_id, payload.role.value, admin.id)
    return AdminUserListRead.model_validate(user)