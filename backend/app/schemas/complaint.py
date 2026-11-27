from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

COMPLAINT_SUBJECT_MAX = 200
COMPLAINT_DESCRIPTION_MAX = 2000

ComplaintStatus = Literal["in_progress", "resolved"]


class ComplaintCreate(BaseModel):
    """Payload a student or instructor submits from the support form."""

    subject: str = Field(min_length=1, max_length=COMPLAINT_SUBJECT_MAX)
    description: str = Field(min_length=1, max_length=COMPLAINT_DESCRIPTION_MAX)

    @field_validator("subject", "description", mode="before")
    @classmethod
    def strip_whitespace(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ComplaintStatusUpdate(BaseModel):
    """The only statuses an admin may move a ticket to."""

    status: ComplaintStatus


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    subject: str
    description: str
    status: str
    created_at: datetime


class AdminComplaintItem(ComplaintResponse):
    """A complaint plus the submitter, as the admin table needs it."""

    user_name: str
    user_email: EmailStr
