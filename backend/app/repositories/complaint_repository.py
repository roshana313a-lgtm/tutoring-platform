import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import COMPLAINT_STATUS_OPEN, Complaint
from app.models.user import User


class ComplaintRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: uuid.UUID, subject: str, description: str) -> Complaint:
        complaint = Complaint(user_id=user_id, subject=subject, description=description)
        self.db.add(complaint)
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def list_with_users(self) -> list[tuple[Complaint, User]]:
        """Every complaint with its submitter, newest first."""
        result = await self.db.execute(
            select(Complaint, User)
            .join(User, Complaint.user_id == User.id)
            .order_by(Complaint.created_at.desc())
        )
        return [(complaint, user) for complaint, user in result.all()]

    async def get_by_id(self, complaint_id: uuid.UUID) -> Complaint | None:
        return await self.db.get(Complaint, complaint_id)

    async def count_open(self) -> int:
        return int(
            await self.db.scalar(
                select(func.count())
                .select_from(Complaint)
                .where(Complaint.status == COMPLAINT_STATUS_OPEN)
            )
            or 0
        )

    async def update_status(self, complaint: Complaint, status: str) -> Complaint:
        complaint.status = status
        self.db.add(complaint)
        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint
