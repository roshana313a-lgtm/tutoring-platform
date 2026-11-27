import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, email: str, hashed_password: str, role: str) -> User:
        user = User(email=email, hashed_password=hashed_password, role=role)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def list_unapproved(self, role: str) -> list[User]:
        """Users of `role` that are still waiting for admin approval."""
        result = await self.db.execute(
            select(User)
            .where(User.role == role, User.is_approved.is_(False))
            .order_by(User.created_at)
        )
        return list(result.scalars().all())

    async def count_all(self) -> int:
        return int(await self.db.scalar(select(func.count()).select_from(User)) or 0)

    async def count_by_role(self, role: str) -> int:
        return int(
            await self.db.scalar(
                select(func.count()).select_from(User).where(User.role == role)
            )
            or 0
        )

    async def count_unapproved(self, role: str) -> int:
        return int(
            await self.db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.role == role, User.is_approved.is_(False))
            )
            or 0
        )

    async def list_approved_instructors(self) -> list[User]:
        """Approved, active instructors — the only ones allowed in discovery."""
        result = await self.db.execute(
            select(User)
            .where(
                User.role == "instructor",
                User.is_approved.is_(True),
                User.is_active.is_(True),
            )
            .order_by(User.full_name, User.email)
        )
        return list(result.scalars().all())

    async def list_role(self, role: str) -> list[User]:
        """Every account holding `role`, newest first (approved, pending, suspended)."""
        result = await self.db.execute(
            select(User).where(User.role == role).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_suspended(self, roles: list[str]) -> int:
        """Accounts in `roles` whose access is currently suspended."""
        return int(
            await self.db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.role.in_(roles), User.is_active.is_(False))
            )
            or 0
        )

    async def list_by_roles(self, roles: list[str]) -> list[User]:
        """All users holding one of `roles`, newest first."""
        result = await self.db.execute(
            select(User)
            .where(User.role.in_(roles))
            .order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete(self, user: User) -> None:
        await self.db.delete(user)
        await self.db.commit()

    async def update(self, user: User, fields: dict[str, object]) -> User:
        for name, value in fields.items():
            if value is not None:
                setattr(user, name, value)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
