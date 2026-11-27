"""Contract tests for the role-specific profile page (Feature 2c).

Written RED before implementation, following the project TDD policy.
"""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User

PASSWORD = "correct horse battery staple"

UserFactory = Callable[[str, str], Awaitable[User]]


async def register_user(
    client: AsyncClient,
    email: str,
    role: str = "student",
) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    assert isinstance(token, str)
    return token


async def admin_token(user_factory: UserFactory) -> str:
    user = await user_factory("profile-admin@example.com", "admin")
    return create_access_token(str(user.id), user.role)


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def error_code(body: dict[str, object]) -> str:
    error = body["error"]
    assert isinstance(error, dict)
    code = error["code"]
    assert isinstance(code, str)
    return code


@pytest.mark.asyncio
async def test_student_can_update_language_level_and_learning_goal(
    client: AsyncClient,
) -> None:
    token = await register_user(client, "roles-student@example.com")
    headers = auth_headers(token)
    payload = {"current_level": "intermediate", "learning_goal": "آماده‌سازی آیلتس"}

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["current_level"] == "intermediate"
    assert body["learning_goal"] == payload["learning_goal"]

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["learning_goal"] == payload["learning_goal"]


@pytest.mark.asyncio
async def test_instructor_can_update_rate_languages_and_summary(
    client: AsyncClient,
) -> None:
    token = await register_user(client, "roles-instructor@example.com", role="instructor")
    headers = auth_headers(token)
    payload = {
        "hourly_rate": 250000,
        "teaching_languages": ["انگلیسی", "آلمانی"],
        "short_summary": "مدرس زبان با تمرکز بر مکالمه",
    }

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["hourly_rate"] == 250000
    assert body["teaching_languages"] == ["انگلیسی", "آلمانی"]
    assert body["short_summary"] == payload["short_summary"]

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    me_body = me.json()
    assert me_body["teaching_languages"] == ["انگلیسی", "آلمانی"]
    assert me_body["hourly_rate"] == 250000


@pytest.mark.asyncio
async def test_common_new_fields_are_available_to_every_role(client: AsyncClient) -> None:
    headers = auth_headers(await register_user(client, "roles-common@example.com"))
    payload = {"date_of_birth": "2000-05-01", "education_level": "کارشناسی"}

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["date_of_birth"] == "2000-05-01"
    assert body["education_level"] == "کارشناسی"


@pytest.mark.asyncio
async def test_instructor_can_save_education_level_with_teaching_fields(
    client: AsyncClient,
) -> None:
    token = await register_user(client, "roles-instructor-education@example.com", role="instructor")
    headers = auth_headers(token)
    payload = {
        "education_level": "کارشناسی ارشد",
        "hourly_rate": 250000,
        "teaching_languages": ["انگلیسی"],
        "short_summary": "مدرس آیلتس",
    }

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["education_level"] == "کارشناسی ارشد"

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["education_level"] == "کارشناسی ارشد"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"short_description": "unknown fields are forbidden"},
        {"education_level": "x" * 65},
    ],
)
async def test_instructor_education_level_is_validated(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    token = await register_user(
        client,
        f"roles-instructor-education-invalid-{next(iter(payload))}@example.com",
        role="instructor",
    )

    response = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(token),
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"short_summary": "only instructors may set this"},
        {"hourly_rate": 100000},
        {"teaching_languages": ["انگلیسی"]},
    ],
)
async def test_student_cannot_send_instructor_fields(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    headers = auth_headers(await register_user(client, f"roles-student-{next(iter(payload))}@example.com"))

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"learning_goal": "only students may set this"},
        {"current_level": "advanced"},
    ],
)
async def test_instructor_cannot_send_student_fields(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    headers = auth_headers(
        await register_user(client, f"roles-instructor-{next(iter(payload))}@example.com", role="instructor")
    )

    response = await client.put("/api/v1/auth/profile", json=payload, headers=headers)

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_admin_can_update_common_fields_only(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))

    allowed = await client.put(
        "/api/v1/auth/profile",
        json={"full_name": "مدیر سیستم", "phone_number": "+989120000001"},
        headers=headers,
    )
    assert allowed.status_code == 200
    assert allowed.json()["full_name"] == "مدیر سیستم"

    for payload in (
        {"learning_goal": "not for admin"},
        {"short_summary": "not for admin"},
        {"current_level": "advanced"},
    ):
        rejected = await client.put("/api/v1/auth/profile", json=payload, headers=headers)
        assert rejected.status_code == 422
        assert error_code(rejected.json()) == "VALIDATION_ERROR"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"short_summary": "x" * 201},
        {"hourly_rate": -1},
        {"teaching_languages": "انگلیسی"},
        {"date_of_birth": "not-a-date"},
    ],
)
async def test_invalid_role_field_values_are_rejected(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    token = await register_user(
        client,
        f"roles-invalid-{next(iter(payload))}@example.com",
        role="instructor",
    )

    response = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(token),
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"
