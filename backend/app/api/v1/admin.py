import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_role
from app.models.user import User
from app.repositories.setting_repository import SettingsRepository
from app.repositories.user_repository import UserRepository
from app.schemas.admin import PlatformSettingsResponse, PlatformSettingsUpdate
from app.schemas.auth import UserResponse
from app.schemas.dashboard import (
    RegistrationDay,
    RegistrationTrend,
    ServiceQualityStats,
)
from app.services.platform_settings import build_settings

INSTRUCTOR_ROLE = "instructor"
# Roles the admin user-management screen can list and suspend (admins excluded).
MANAGED_ROLES = ["student", "instructor"]

router = APIRouter(prefix="/admin", tags=["admin"])

AdminUser = Annotated[User, Depends(require_role("admin"))]


def _instructor_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"code": "INSTRUCTOR_NOT_FOUND", "message": "Instructor not found"},
    )


async def _get_instructor(repo: UserRepository, instructor_id: uuid.UUID) -> User:
    user = await repo.get_by_id(instructor_id)
    if user is None or user.role != INSTRUCTOR_ROLE:
        raise _instructor_not_found()
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserResponse]:
    """All students and instructors, newest first."""
    users = await UserRepository(db).list_by_roles(MANAGED_ROLES)
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/users/{user_id}/suspend", response_model=UserResponse)
async def toggle_user_suspension(
    user_id: uuid.UUID,
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Suspend an active student/instructor, or reactivate a suspended one."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None or user.role not in MANAGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"},
        )

    updated = await repo.update(user, {"is_active": not user.is_active})
    return UserResponse.model_validate(updated)


@router.get("/settings", response_model=PlatformSettingsResponse)
async def read_settings(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlatformSettingsResponse:
    """Institute-wide settings, falling back to defaults for missing rows."""
    return build_settings(await SettingsRepository(db).get_all())


@router.put("/settings", response_model=PlatformSettingsResponse)
async def update_settings(
    data: PlatformSettingsUpdate,
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlatformSettingsResponse:
    """Update the supplied settings and return the full, merged result."""
    repo = SettingsRepository(db)
    changes = data.model_dump(exclude_none=True)
    if changes:
        await repo.upsert({key: str(value) for key, value in changes.items()})

    return build_settings(await repo.get_all())


@router.get("/instructors", response_model=list[UserResponse])
async def list_instructors(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserResponse]:
    """Every instructor account, including pending and suspended profiles."""
    instructors = await UserRepository(db).list_role(INSTRUCTOR_ROLE)
    return [UserResponse.model_validate(instructor) for instructor in instructors]


# The dashboard chart always shows a full week, including days with no signups.
REGISTRATION_WINDOW_DAYS = 7


@router.get("/stats/registrations", response_model=RegistrationTrend)
async def read_registration_trend(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegistrationTrend:
    """Daily account creations for the last seven days, oldest first."""
    today = datetime.now(UTC).date()
    first_day = today - timedelta(days=REGISTRATION_WINDOW_DAYS - 1)
    counts = await UserRepository(db).count_registrations_by_day(first_day)

    days = [
        RegistrationDay(date=day, count=counts.get(day, 0))
        for day in (
            first_day + timedelta(days=offset) for offset in range(REGISTRATION_WINDOW_DAYS)
        )
    ]
    return RegistrationTrend(days=days)


@router.get("/quality", response_model=ServiceQualityStats)
async def read_service_quality(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ServiceQualityStats:
    """Service-quality metrics computed from the database.

    Classes and reviews have no tables yet, so those two counts are real zeros
    rather than invented numbers; suspended accounts are counted directly.
    """
    suspended_users = await UserRepository(db).count_suspended(MANAGED_ROLES)
    return ServiceQualityStats(
        total_classes=0,
        average_rating=0.0,
        suspended_users=suspended_users,
    )


@router.get("/instructors/pending", response_model=list[UserResponse])
async def list_pending_instructors(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserResponse]:
    """Instructors that are still waiting for approval."""
    users = await UserRepository(db).list_unapproved(INSTRUCTOR_ROLE)
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/instructors/{instructor_id}/approve", response_model=UserResponse)
async def approve_instructor(
    instructor_id: uuid.UUID,
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Approve an instructor so they can appear in discovery."""
    repo = UserRepository(db)
    instructor = await _get_instructor(repo, instructor_id)
    approved = await repo.update(instructor, {"is_approved": True})
    return UserResponse.model_validate(approved)


@router.patch("/instructors/{instructor_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_instructor(
    instructor_id: uuid.UUID,
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Reject an instructor by removing the account."""
    repo = UserRepository(db)
    instructor = await _get_instructor(repo, instructor_id)
    await repo.delete(instructor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
