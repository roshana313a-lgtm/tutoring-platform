from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.errors import RoleFieldNotAllowedError

# Fields a non-instructor must never send; teaching-catalogue data.
INSTRUCTOR_ONLY_FIELDS = frozenset(
    {
        "bio",
        "years_of_experience",
        "short_summary",
        "hourly_rate",
        "teaching_languages",
    }
)
# Fields a non-student must never send; learning data.
STUDENT_ONLY_FIELDS = frozenset({"current_level", "learning_goal"})

TeachingLanguage = Annotated[str, Field(min_length=1, max_length=64)]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "instructor"]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: str
    created_at: datetime
    full_name: str = ""
    phone_number: str = ""
    avatar_url: str = ""
    timezone: str = "Asia/Tehran"
    bio: str = ""
    years_of_experience: int = 0
    current_level: str = ""
    date_of_birth: date | None = None
    education_level: str = ""
    short_summary: str = ""
    hourly_rate: int = 0
    teaching_languages: list[str] = Field(default_factory=list)
    learning_goal: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class ProfileUpdateRequest(BaseModel):
    """Partial profile update; role-specific fields are checked per user role."""

    model_config = ConfigDict(extra="forbid")

    # Common fields, editable by every role.
    full_name: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=50)
    avatar_url: str | None = Field(default=None, max_length=1024)
    timezone: str | None = Field(default=None, max_length=64)
    date_of_birth: date | None = None
    education_level: str | None = Field(default=None, max_length=64)

    # Instructor-only fields.
    bio: str | None = Field(default=None, max_length=5000)
    years_of_experience: int | None = Field(default=None, ge=0)
    short_summary: str | None = Field(default=None, max_length=200)
    hourly_rate: int | None = Field(default=None, ge=0)
    teaching_languages: list[TeachingLanguage] | None = Field(default=None, max_length=20)

    # Student-only fields.
    current_level: str | None = Field(default=None, max_length=64)
    learning_goal: str | None = Field(default=None, max_length=1000)

    def fields_for_role(self, role: str) -> dict[str, object]:
        """Return the supplied fields, rejecting those owned by another role."""
        supplied = self.model_dump(exclude_unset=True)
        forbidden: set[str] = set()
        if role != "instructor":
            forbidden.update(INSTRUCTOR_ONLY_FIELDS.intersection(supplied))
        if role != "student":
            forbidden.update(STUDENT_ONLY_FIELDS.intersection(supplied))
        if forbidden:
            raise RoleFieldNotAllowedError(sorted(forbidden))
        return supplied
