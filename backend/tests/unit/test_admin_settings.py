"""Contract tests for admin platform settings (Feature 2f)."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User
from app.services.platform_settings import DEFAULT_SETTINGS

UserFactory = Callable[[str, str], Awaitable[User]]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def error_code(body: dict[str, object]) -> str:
    error = body["error"]
    assert isinstance(error, dict)
    code = error["code"]
    assert isinstance(code, str)
    return code


async def admin_headers(user_factory: UserFactory) -> dict[str, str]:
    user = await user_factory("settings-admin@example.com", "admin")
    return auth_headers(create_access_token(str(user.id), user.role))


@pytest.mark.asyncio
async def test_settings_defaults_when_nothing_is_stored(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    response = await client.get("/api/v1/admin/settings", headers=await admin_headers(user_factory))

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "platform_name": DEFAULT_SETTINGS["platform_name"],
        "default_hourly_rate": int(DEFAULT_SETTINGS["default_hourly_rate"]),
        "support_email": DEFAULT_SETTINGS["support_email"],
    }


@pytest.mark.asyncio
async def test_admin_can_update_settings_and_read_them_back(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = await admin_headers(user_factory)
    payload = {
        "platform_name": "آکادمی زبان پارس",
        "default_hourly_rate": 350000,
        "support_email": "help@pars.example.com",
    }

    updated = await client.put("/api/v1/admin/settings", json=payload, headers=headers)

    assert updated.status_code == 200
    assert updated.json() == payload

    fetched = await client.get("/api/v1/admin/settings", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json() == payload


@pytest.mark.asyncio
async def test_partial_settings_update_keeps_the_other_values(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = await admin_headers(user_factory)
    await client.put(
        "/api/v1/admin/settings",
        json={"platform_name": "آکادمی پارس", "default_hourly_rate": 300000},
        headers=headers,
    )

    response = await client.put(
        "/api/v1/admin/settings",
        json={"support_email": "support@pars.example.com"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["platform_name"] == "آکادمی پارس"
    assert body["default_hourly_rate"] == 300000
    assert body["support_email"] == "support@pars.example.com"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"support_email": "not-an-email"},
        {"default_hourly_rate": -1},
        {"platform_name": ""},
        {"unknown_setting": "x"},
    ],
)
async def test_invalid_settings_are_rejected(
    client: AsyncClient,
    user_factory: UserFactory,
    payload: dict[str, object],
) -> None:
    response = await client.put(
        "/api/v1/admin/settings",
        json=payload,
        headers=await admin_headers(user_factory),
    )

    assert response.status_code == 422
    assert error_code(response.json()) == "VALIDATION_ERROR"


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["student", "instructor"])
async def test_only_admin_can_read_or_update_settings(
    client: AsyncClient,
    user_factory: UserFactory,
    role: str,
) -> None:
    user = await user_factory(f"settings-{role}@example.com", role)
    headers = auth_headers(create_access_token(str(user.id), user.role))

    read = await client.get("/api/v1/admin/settings", headers=headers)
    write = await client.put(
        "/api/v1/admin/settings",
        json={"platform_name": "hacked"},
        headers=headers,
    )

    for response in (read, write):
        assert response.status_code == 403
        assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_settings_endpoints_require_authentication(client: AsyncClient) -> None:
    read = await client.get("/api/v1/admin/settings")
    write = await client.put("/api/v1/admin/settings", json={"platform_name": "x"})

    for response in (read, write):
        assert response.status_code == 401
        assert error_code(response.json()) == "INVALID_TOKEN"
