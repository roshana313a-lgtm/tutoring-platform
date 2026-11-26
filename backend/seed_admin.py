"""Create the first admin account.

Public registration only allows students and instructors, so the initial admin
has to be seeded directly:

    cd backend
    python seed_admin.py

The script is idempotent: it exits without changes when an admin already exists.
The schema must be up to date first (`alembic upgrade head`).
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.db import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.user import User

ADMIN_EMAIL = "admin@institute.com"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_FULL_NAME = "System Administrator"
ADMIN_ROLE = "admin"


async def seed_admin(
    session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal,
) -> bool:
    """Create the default admin unless one already exists.

    Returns True when the account was created, False when it already existed.
    """
    async with session_factory() as session:
        existing_admin = await session.scalar(
            select(User).where(User.role == ADMIN_ROLE).limit(1)
        )
        if existing_admin is not None:
            print(f"An admin account already exists ({existing_admin.email}); nothing to do.")
            return False

        taken_email = await session.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if taken_email is not None:
            print(
                f"{ADMIN_EMAIL} is already used by a {taken_email.role} account; "
                "refusing to overwrite it."
            )
            return False

        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=ADMIN_ROLE,
            full_name=ADMIN_FULL_NAME,
        )
        session.add(admin)
        await session.commit()

    print(f"Admin account created: {ADMIN_EMAIL} (role: {ADMIN_ROLE})")
    return True


async def main() -> None:
    await seed_admin()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
