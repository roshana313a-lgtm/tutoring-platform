import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def _matches_term(instructor: User, term: str) -> bool:
    """Case-insensitive substring match on the name or any teaching language."""
    needle = term.casefold()
    if needle in instructor.full_name.casefold():
        return True

    languages = instructor.teaching_languages or []
    return any(needle in str(language).casefold() for language in languages)


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

    async def list_approved_instructors(
        self,
        *,
        search: str | None = None,
        max_price: int | None = None,
    ) -> list[User]:
        """Approved, active instructors — the only ones allowed in discovery.

        `search` matches the full name or any teaching language; `max_price`
        caps the hourly rate. Both are optional and combine with AND.
        """
        statement = select(User).where(
            User.role == "instructor",
            User.is_approved.is_(True),
            User.is_active.is_(True),
        )

        if max_price is not None:
            statement = statement.where(User.hourly_rate <= max_price)

        result = await self.db.execute(statement.order_by(User.full_name, User.email))
        instructors = list(result.scalars().all())

        # The languages sit in a JSON column whose text form escapes non-ASCII
        # characters, so a portable SQL LIKE cannot see them (a Persian language
        # would never match). Matching the short result set here keeps the search
        # dialect-independent, as ADR-005 requires.
        term = (search or "").strip()
        if term:
            instructors = [item for item in instructors if _matches_term(item, term)]

        return instructors

    async def get_approved_instructor(self, instructor_id: uuid.UUID) -> User | None:
        """One approved, active instructor, or None when it is not discoverable."""
        result = await self.db.execute(
            select(User).where(
                User.id == instructor_id,
                User.role == "instructor",
                User.is_approved.is_(True),
                User.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

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

    async def count_registrations_by_day(self, since: date) -> dict[date, int]:
        """Accounts created on or after `since`, grouped by calendar day (UTC)."""
        rows = await self.db.execute(
            select(func.date(User.created_at).label("day"), func.count())
            .where(func.date(User.created_at) >= since)
            .group_by(func.date(User.created_at))
        )
        counts: dict[date, int] = {}
        for day, count in rows.all():
            key = day if isinstance(day, date) else date.fromisoformat(str(day))
            counts[key] = int(count)
        return counts

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
