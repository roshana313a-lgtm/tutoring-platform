from collections.abc import Callable

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import verify_password
from app.models.user import User
from seed_admin import ADMIN_EMAIL, ADMIN_FULL_NAME, ADMIN_PASSWORD, seed_admin


async def _users(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[User]:
    async with session_factory() as session:
        result = await session.execute(select(User))
        return list(result.scalars().all())


async def test_seed_admin_creates_the_default_admin(
    session_factory: async_sessionmaker[AsyncSession],
    capsys: pytest.CaptureFixture[str],
) -> None:
    created = await seed_admin(session_factory=session_factory)

    assert created is True
    users = await _users(session_factory)
    assert len(users) == 1

    admin = users[0]
    assert admin.email == ADMIN_EMAIL
    assert admin.role == "admin"
    assert admin.full_name == ADMIN_FULL_NAME
    assert admin.hashed_password != ADMIN_PASSWORD
    assert verify_password(ADMIN_PASSWORD, admin.hashed_password)

    assert f"Admin account created: {ADMIN_EMAIL}" in capsys.readouterr().out


async def test_seed_admin_is_idempotent(
    session_factory: async_sessionmaker[AsyncSession],
    user_factory: Callable[[str, str], object],
    capsys: pytest.CaptureFixture[str],
) -> None:
    await user_factory("existing-admin@example.com", "admin")

    created = await seed_admin(session_factory=session_factory)

    assert created is False
    users = await _users(session_factory)
    assert len(users) == 1
    assert users[0].email == "existing-admin@example.com"
    assert "already exists" in capsys.readouterr().out


async def test_seed_admin_does_not_take_an_email_owned_by_another_role(
    session_factory: async_sessionmaker[AsyncSession],
    user_factory: Callable[[str, str], object],
    capsys: pytest.CaptureFixture[str],
) -> None:
    await user_factory(ADMIN_EMAIL, "student")

    created = await seed_admin(session_factory=session_factory)

    assert created is False
    users = await _users(session_factory)
    assert len(users) == 1
    assert users[0].role == "student"
    assert "refusing to overwrite" in capsys.readouterr().out
