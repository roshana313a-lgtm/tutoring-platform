"""Role dashboard statistics.

Counts come from the database. Class sessions, assignments and grades are not
modelled yet (Features 4 and 7), so those counters read zero until the
corresponding tables exist; they are placeholders in the response shape only,
never fabricated numbers.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_role
from app.models.user import User
from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.user_repository import UserRepository
from app.schemas.dashboard import (
    AdminDashboardStats,
    InstructorDashboardStats,
    StudentDashboardStats,
)

INSTRUCTOR_ROLE = "instructor"

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

AdminUser = Annotated[User, Depends(require_role("admin"))]
InstructorUser = Annotated[User, Depends(require_role("instructor"))]
StudentUser = Annotated[User, Depends(require_role("student"))]


@router.get("/admin/stats", response_model=AdminDashboardStats)
async def admin_stats(
    _: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminDashboardStats:
    users = UserRepository(db)
    return AdminDashboardStats(
        pending_instructors=await users.count_unapproved(INSTRUCTOR_ROLE),
        total_users=await users.count_all(),
        active_classes=0,
        open_complaints=await ComplaintRepository(db).count_open(),
    )


@router.get("/instructor/stats", response_model=InstructorDashboardStats)
async def instructor_stats(
    _: InstructorUser,
) -> InstructorDashboardStats:
    # No class-session, assignment or enrolment tables exist yet (Features 4 and
    # 7), so an instructor has no classes, grading queue or linked students.
    return InstructorDashboardStats(
        today_classes=0,
        pending_grading=0,
        total_students=0,
    )


@router.get("/student/stats", response_model=StudentDashboardStats)
async def student_stats(
    _: StudentUser,
) -> StudentDashboardStats:
    # Classes, homework and grades arrive with Features 4/7/8.
    return StudentDashboardStats(
        upcoming_classes=0,
        pending_homework=0,
        average_grade=0.0,
    )
