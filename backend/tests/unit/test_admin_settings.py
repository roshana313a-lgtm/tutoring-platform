"""Contract tests for admin platform settings (Feature 2f + settings expansion)."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.security import create_access_token
from app.models.user import User
from app.repositories.setting_repository import SettingsRepository
from app.services.platform_settings import DEFAULT_SETTINGS

UserFactory = Callable[[str, str], Awaitable[User]]
SessionFactory = async_sessionmaker[AsyncSession]

DEFAULT_PAYLOAD = {
    "platform_name": DEFAULT_SETTINGS["platform_name"],
    "support_email": DEFAULT_SETTINGS["support_email"],
    "platform_description": "",
    "default_hourly_rate": int(DEFAULT_SETTINGS["default_hourly_rate"]),
    "currency": DEFAULT_SETTINGS["currency"],
    "min_withdrawal_amount": int(DEFAULT_SETTINGS["min_withdrawal_amount"]),
    "enable_email_notifications": True,
    "maintenance_mode": False,
}


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
    assert response.json() == DEFAULT_PAYLOAD


@pytest.mark.asyncio
async def test_admin_can_update_settings_and_read_them_back(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = await admin_headers(user_factory)
    payload = {
        "platform_name": "آکادمی زبان پارس",
        "support_email": "help@pars.example.com",
        "platform_description": "مرکز آموزش زبان‌های خارجی پارس",
        "default_hourly_rate": 350000,
        "currency": "ریال",
        "min_withdrawal_amount": 150000,
        "enable_email_notifications": False,
        "maintenance_mode": True,
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
        json={
            "platform_name": "آکادمی پارس",
            "default_hourly_rate": 300000,
            "currency": "دلار",
            "maintenance_mode": True,
        },
        headers=headers,
    )

    response = await client.put(
        "/api/v1/admin/settings",
        json={"support_email": "support@pars.example.com", "min_withdrawal_amount": 50000},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["platform_name"] == "آکادمی پارس"
    assert body["default_hourly_rate"] == 300000
    assert body["currency"] == "دلار"
    assert body["maintenance_mode"] is True
    assert body["min_withdrawal_amount"] == 50000
    assert body["support_email"] == "support@pars.example.com"


@pytest.mark.asyncio
async def test_booleans_are_stored_as_settings_strings(
    client: AsyncClient,
    user_factory: UserFactory,
    session_factory: SessionFactory,
) -> None:
    headers = await admin_headers(user_factory)
    await client.put(
        "/api/v1/admin/settings",
        json={"enable_email_notifications": False, "maintenance_mode": True},
        headers=headers,
    )

    async with session_factory() as session:
        stored = await SettingsRepository(session).get_all()

    assert stored["enable_email_notifications"] == "false"
    assert stored["maintenance_mode"] == "true"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"support_email": "not-an-email"},
        {"default_hourly_rate": -1},
        {"min_withdrawal_amount": -1},
        {"platform_name": ""},
        {"platform_name": "   "},
        {"platform_description": "x" * 1001},
        {"currency": ""},
        {"currency": "   "},
        {"currency": "x" * 17},
        {"enable_email_notifications": "yes"},
        {"maintenance_mode": "maybe"},
        {"unknown_setting": "x"},
        # The page must never be able to change the signed-in admin's own identity.
        {"email": "attacker@example.com"},
        {"role": "student"},
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
