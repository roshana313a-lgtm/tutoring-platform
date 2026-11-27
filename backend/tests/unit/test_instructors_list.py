"""Contract tests for the instructor discovery list (Feature 2g)."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User

PASSWORD = "correct horse battery staple"
UserFactory = Callable[[str, str], Awaitable[User]]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def register(client: AsyncClient, email: str, role: str) -> dict:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    return response.json()


async def admin_token(user_factory: UserFactory) -> str:
    admin = await user_factory("instructors-list-admin@example.com", "admin")
    return create_access_token(str(admin.id), admin.role)


@pytest.mark.asyncio
async def test_only_approved_and_active_instructors_are_listed(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))
    approved = await register(client, "visible-instructor@example.com", "instructor")
    suspended = await register(client, "suspended-instructor@example.com", "instructor")
    pending = await register(client, "pending-instructor@example.com", "instructor")
    student = await register(client, "visible-student@example.com", "student")

    profile = {
        "full_name": "سارا کریمی",
        "short_summary": "مدرس آیلتس",
        "teaching_languages": ["انگلیسی"],
        "hourly_rate": 250000,
        "education_level": "کارشناسی ارشد",
    }
    await client.put(
        "/api/v1/auth/profile",
        json=profile,
        headers=auth_headers(approved["access_token"]),
    )

    for account in (approved, suspended):
        response = await client.patch(
            f"/api/v1/admin/instructors/{account['user']['id']}/approve",
            headers=headers,
        )
        assert response.status_code == 200
    await client.patch(
        f"/api/v1/admin/users/{suspended['user']['id']}/suspend",
        headers=headers,
    )

    response = await client.get(
        "/api/v1/instructors",
        headers=auth_headers(student["access_token"]),
    )

    assert response.status_code == 200
    instructors = response.json()
    assert [item["email"] for item in instructors] == ["visible-instructor@example.com"]

    listed = instructors[0]
    assert listed["full_name"] == profile["full_name"]
    assert listed["short_summary"] == profile["short_summary"]
    assert listed["teaching_languages"] == profile["teaching_languages"]
    assert listed["hourly_rate"] == profile["hourly_rate"]
    assert listed["education_level"] == profile["education_level"]
    assert set(listed) == {
        "id",
        "full_name",
        "email",
        "short_summary",
        "teaching_languages",
        "hourly_rate",
        "education_level",
        "avatar_url",
    }
    assert pending["user"]["email"] == "pending-instructor@example.com"


@pytest.mark.asyncio
async def test_instructor_list_is_empty_when_none_are_approved(client: AsyncClient) -> None:
    student = await register(client, "no-instructors-student@example.com", "student")
    await register(client, "unapproved@example.com", "instructor")

    response = await client.get(
        "/api/v1/instructors",
        headers=auth_headers(student["access_token"]),
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_instructor_list_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/instructors")

    assert response.status_code == 401
