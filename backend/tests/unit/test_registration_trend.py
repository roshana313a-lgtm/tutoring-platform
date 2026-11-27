"""Contract tests for the admin registration-trend endpoint."""

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User

PASSWORD = "correct horse battery staple"
UserFactory = Callable[[str, str], Awaitable[User]]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def error_code(body: dict[str, object]) -> str:
    error = body["error"]
    assert isinstance(error, dict)
    code = error["code"]
    assert isinstance(code, str)
    return code


async def register(client: AsyncClient, email: str, role: str) -> dict:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    return response.json()


async def admin_token(user_factory: UserFactory) -> str:
    admin = await user_factory("trend-admin@example.com", "admin")
    return create_access_token(str(admin.id), admin.role)


@pytest.mark.asyncio
async def test_registration_trend_returns_seven_zero_filled_days(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))

    response = await client.get("/api/v1/admin/stats/registrations", headers=headers)

    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 7
    assert [day["date"] for day in days] == sorted(day["date"] for day in days)

    today = datetime.now(UTC).date()
    assert days[-1]["date"] == today.isoformat()
    assert days[0]["date"] == (today - timedelta(days=6)).isoformat()
    # Only the admin created for this test exists, and only on today's bucket.
    assert [day["count"] for day in days[:-1]] == [0] * 6
    assert days[-1]["count"] == 1


@pytest.mark.asyncio
async def test_registration_trend_counts_accounts_in_the_window(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))
    baseline = await client.get("/api/v1/admin/stats/registrations", headers=headers)
    before = baseline.json()["days"][-1]["count"]

    await register(client, "trend-one@example.com", "student")
    await register(client, "trend-two@example.com", "instructor")

    response = await client.get("/api/v1/admin/stats/registrations", headers=headers)

    assert response.status_code == 200
    days = response.json()["days"]
    assert days[-1]["count"] == before + 2
    assert [day["count"] for day in days[:-1]] == [0] * 6


@pytest.mark.asyncio
async def test_registration_trend_requires_admin(client: AsyncClient) -> None:
    student = await register(client, "trend-student-caller@example.com", "student")

    response = await client.get(
        "/api/v1/admin/stats/registrations",
        headers=auth_headers(student["access_token"]),
    )

    assert response.status_code == 403
    assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_registration_trend_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/admin/stats/registrations")

    assert response.status_code == 401
    assert error_code(response.json()) == "INVALID_TOKEN"
