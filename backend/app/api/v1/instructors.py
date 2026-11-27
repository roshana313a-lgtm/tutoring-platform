from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.dashboard import InstructorListItem

router = APIRouter(prefix="/instructors", tags=["instructors"])


@router.get("", response_model=list[InstructorListItem])
async def list_instructors(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[InstructorListItem]:
    """Approved, active instructors. Pending and suspended profiles stay hidden."""
    instructors = await UserRepository(db).list_approved_instructors()
    return [InstructorListItem.model_validate(instructor) for instructor in instructors]
