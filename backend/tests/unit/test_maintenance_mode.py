"""Contract tests for the maintenance-mode middleware."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User

UserFactory = Callable[[str, str], Awaitable[User]]

MAINTENANCE_MESSAGE = "سیستم موقتاً در حال به‌روزرسانی است. لطفاً بعداً مراجعه کنید."
ADMIN_PASSWORD = "correct horse battery staple"


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def headers_for(user_factory: UserFactory, email: str, role: str) -> dict[str, str]:
    user = await user_factory(email, role)
    return auth_headers(create_access_token(str(user.id), user.role))


async def set_maintenance(client: AsyncClient, admin: dict[str, str], enabled: bool) -> None:
    response = await client.put(
        "/api/v1/admin/settings",
        json={"maintenance_mode": enabled},
        headers=admin,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_requests_pass_through_when_maintenance_mode_is_off(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    student = await headers_for(user_factory, "maintenance-student@example.com", "student")

    response = await client.get("/api/v1/auth/me", headers=student)

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_maintenance_mode_returns_503_for_authenticated_non_admins(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    student = await headers_for(user_factory, "maintenance-student@example.com", "student")
    await set_maintenance(client, admin, True)

    response = await client.get("/api/v1/auth/me", headers=student)

    assert response.status_code == 503
    body = response.json()
    assert body["error"]["code"] == "MAINTENANCE_MODE"
    assert body["error"]["message"] == MAINTENANCE_MESSAGE


@pytest.mark.asyncio
async def test_maintenance_mode_also_blocks_anonymous_requests(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    await set_maintenance(client, admin, True)

    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MAINTENANCE_MODE"


@pytest.mark.asyncio
async def test_maintenance_mode_blocks_writes_too(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    await set_maintenance(client, admin, True)

    user = await user_factory("maintenance-register@example.com", "student")
    token = create_access_token(str(user.id), user.role)
    response = await client.post(
        "/api/v1/complaints",
        json={"subject": "کلاس لغو شد", "description": "مدرس کلاس را لغو کرد."},
        headers=auth_headers(token),
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MAINTENANCE_MODE"


@pytest.mark.asyncio
async def test_admins_bypass_maintenance_mode(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    await set_maintenance(client, admin, True)

    settings = await client.get("/api/v1/admin/settings", headers=admin)
    users = await client.get("/api/v1/admin/users", headers=admin)

    assert settings.status_code == 200
    assert settings.json()["maintenance_mode"] is True
    assert users.status_code == 200


@pytest.mark.asyncio
async def test_admin_can_log_in_and_turn_maintenance_mode_off(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    student = await headers_for(user_factory, "maintenance-student@example.com", "student")
    await set_maintenance(client, admin, True)

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "maintenance-admin@example.com", "password": ADMIN_PASSWORD},
    )
    assert login.status_code == 200
    fresh_admin = auth_headers(login.json()["access_token"])

    await set_maintenance(client, fresh_admin, False)

    assert (await client.get("/api/v1/auth/me", headers=student)).status_code == 200


@pytest.mark.asyncio
async def test_health_endpoint_stays_available_during_maintenance(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin = await headers_for(user_factory, "maintenance-admin@example.com", "admin")
    await set_maintenance(client, admin, True)

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
