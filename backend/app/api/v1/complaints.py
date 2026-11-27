"""Support tickets any signed-in student or instructor can open.

Admins read and triage them through the `/admin/complaints` routes in
`app.api.v1.admin`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.complaint import ComplaintCreate, ComplaintResponse

router = APIRouter(prefix="/complaints", tags=["complaints"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ComplaintResponse:
    """Open a ticket on behalf of the signed-in user."""
    complaint = await ComplaintRepository(db).create(
        user_id=current_user.id,
        subject=data.subject,
        description=data.description,
    )
    return ComplaintResponse.model_validate(complaint)
