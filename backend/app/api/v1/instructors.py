import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.dashboard import InstructorListItem, InstructorProfileOut

router = APIRouter(prefix="/instructors", tags=["instructors"])


@router.get("", response_model=list[InstructorListItem])
async def list_instructors(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
) -> list[InstructorListItem]:
    """Approved, active instructors. Pending and suspended profiles stay hidden.

    `search` looks at the name and the teaching languages, `max_price` caps the
    hourly rate; both are optional.
    """
    instructors = await UserRepository(db).list_approved_instructors(
        search=search, max_price=max_price
    )
    return [InstructorListItem.model_validate(instructor) for instructor in instructors]


@router.get("/{instructor_id}", response_model=InstructorProfileOut)
async def get_instructor(
    instructor_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InstructorProfileOut:
    """Full profile of one approved instructor; anything else reads as 404."""
    instructor = await UserRepository(db).get_approved_instructor(instructor_id)
    if instructor is None:
        raise HTTPException(status_code=404, detail="Instructor not found")

    return InstructorProfileOut.model_validate(instructor)
