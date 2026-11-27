from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class AdminDashboardStats(BaseModel):
    pending_instructors: int
    total_users: int
    active_classes: int


class InstructorDashboardStats(BaseModel):
    today_classes: int
    pending_grading: int
    total_students: int


class StudentDashboardStats(BaseModel):
    upcoming_classes: int
    pending_homework: int
    average_grade: float


class ServiceQualityStats(BaseModel):
    """Admin service-quality metrics.

    `total_classes` and `average_rating` read 0 until the classes and reviews
    tables exist; they are counted from the database, never hardcoded.
    """

    total_classes: int
    average_rating: float
    suspended_users: int


class RegistrationDay(BaseModel):
    """How many accounts were created on one calendar day (UTC)."""

    date: date
    count: int


class RegistrationTrend(BaseModel):
    """Oldest-to-newest registration counts; days without signups report 0."""

    days: list[RegistrationDay]


class InstructorListItem(BaseModel):
    """Instructor summary shown in discovery and on the student dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr
    short_summary: str
    teaching_languages: list[str]
    hourly_rate: int
    education_level: str
    avatar_url: str
