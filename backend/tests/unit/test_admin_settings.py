"""Contract tests for admin platform settings (Feature 2f / institute settings)."""

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
    "institute_name": DEFAULT_SETTINGS["institute_name"],
    "support_email": DEFAULT_SETTINGS["support_email"],
    "default_class_duration": 60,
    "min_cancellation_hours": 24,
    "default_hourly_rate": 250000,
    "currency": "تومان",
    "commission_rate": 10,
    "enable_email_notifications": True,
    "maintenance_mode": False,
}

FULL_UPDATE = {
    "institute_name": "آکادمی زبان پارس",
    "support_email": "help@pars.example.com",
    "default_class_duration": 90,
    "min_cancellation_hours": 48,
    "default_hourly_rate": 350000,
    "currency": "ریال",
    "commission_rate": 15,
    "enable_email_notifications": False,
    "maintenance_mode": True,
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
async def test_defaults_match_the_lms_standards() -> None:
    assert DEFAULT_PAYLOAD["default_class_duration"] == 60
    assert DEFAULT_PAYLOAD["min_cancellation_hours"] == 24
    assert DEFAULT_PAYLOAD["currency"] == "تومان"
    assert DEFAULT_PAYLOAD["commission_rate"] == 10
    assert DEFAULT_PAYLOAD["maintenance_mode"] is False


@pytest.mark.asyncio
async def test_admin_can_update_settings_and_read_them_back(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = await admin_headers(user_factory)

    updated = await client.put("/api/v1/admin/settings", json=FULL_UPDATE, headers=headers)

    assert updated.status_code == 200
    assert updated.json() == FULL_UPDATE

    fetched = await client.get("/api/v1/admin/settings", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json() == FULL_UPDATE


@pytest.mark.asyncio
async def test_partial_settings_update_keeps_the_other_values(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = await admin_headers(user_factory)
    await client.put(
        "/api/v1/admin/settings",
        json={
            "institute_name": "آکادمی پارس",
            "default_class_duration": 45,
            "commission_rate": 20,
            "maintenance_mode": True,
        },
        headers=headers,
    )

    response = await client.put(
        "/api/v1/admin/settings",
        json={"support_email": "support@pars.example.com", "min_cancellation_hours": 12},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["institute_name"] == "آکادمی پارس"
    assert body["default_class_duration"] == 45
    assert body["commission_rate"] == 20
    assert body["maintenance_mode"] is True
    assert body["min_cancellation_hours"] == 12
    assert body["support_email"] == "support@pars.example.com"
    assert body["default_hourly_rate"] == DEFAULT_PAYLOAD["default_hourly_rate"]


@pytest.mark.asyncio
async def test_booleans_are_stored_as_settings_strings(
    client: AsyncClient,
    user_factory: UserFactory,
    session_factory: SessionFactory,
) -> None:
    headers = await admin_headers(user_factory)
    await client.put(
        "/api/v1/admin/settings",
        json={
            "enable_email_notifications": False,
            "maintenance_mode": True,
            "commission_rate": 15,
        },
        headers=headers,
    )

    async with session_factory() as session:
        stored = await SettingsRepository(session).get_all()

    assert stored["enable_email_notifications"] == "false"
    assert stored["maintenance_mode"] == "true"
    assert stored["commission_rate"] == "15"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"support_email": "not-an-email"},
        {"institute_name": ""},
        {"institute_name": "   "},
        {"default_class_duration": 0},
        {"default_class_duration": 2000},
        {"min_cancellation_hours": -1},
        {"min_cancellation_hours": 1000},
        {"default_hourly_rate": -1},
        {"currency": ""},
        {"currency": "x" * 17},
        {"commission_rate": -1},
        {"commission_rate": 101},
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
        json={"institute_name": "hacked"},
        headers=headers,
    )

    for response in (read, write):
        assert response.status_code == 403
        assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_settings_endpoints_require_authentication(client: AsyncClient) -> None:
    read = await client.get("/api/v1/admin/settings")
    write = await client.put("/api/v1/admin/settings", json={"institute_name": "x"})

    for response in (read, write):
        assert response.status_code == 401
        assert error_code(response.json()) == "INVALID_TOKEN"
