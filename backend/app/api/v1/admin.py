import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse

INSTRUCTOR_ROLE = "instructor"

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
