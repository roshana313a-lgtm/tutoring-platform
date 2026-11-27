"""Contract tests for the admin instructor directory and quality metrics."""

from collections.abc import Awaitable, Callable

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
    admin = await user_factory("directory-admin@example.com", "admin")
    return create_access_token(str(admin.id), admin.role)


@pytest.mark.asyncio
async def test_admin_instructor_list_includes_pending_approved_and_suspended(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))
    approved = await register(client, "directory-approved@example.com", "instructor")
    pending = await register(client, "directory-pending@example.com", "instructor")
    suspended = await register(client, "directory-suspended@example.com", "instructor")
    await register(client, "directory-student@example.com", "student")

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

    response = await client.get("/api/v1/admin/instructors", headers=headers)

    assert response.status_code == 200
    rows = response.json()
    assert {row["email"] for row in rows} == {
        "directory-approved@example.com",
        "directory-pending@example.com",
        "directory-suspended@example.com",
    }

    by_email = {row["email"]: row for row in rows}
    assert by_email["directory-approved@example.com"]["is_approved"] is True
    assert by_email["directory-approved@example.com"]["is_active"] is True
    assert by_email["directory-pending@example.com"]["is_approved"] is False
    assert by_email["directory-suspended@example.com"]["is_active"] is False
    assert pending["user"]["email"] == "directory-pending@example.com"


@pytest.mark.asyncio
async def test_instructor_directory_requires_admin(client: AsyncClient) -> None:
    student = await register(client, "directory-student-caller@example.com", "student")

    response = await client.get(
        "/api/v1/admin/instructors",
        headers=auth_headers(student["access_token"]),
    )

    assert response.status_code == 403
    assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_quality_metrics_count_real_suspended_users(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    headers = auth_headers(await admin_token(user_factory))

    empty = await client.get("/api/v1/admin/quality", headers=headers)
    assert empty.status_code == 200
    assert empty.json() == {
        "total_classes": 0,
        "average_rating": 0.0,
        "suspended_users": 0,
    }

    suspended = await register(client, "quality-suspended@example.com", "student")
    await client.patch(
        f"/api/v1/admin/users/{suspended['user']['id']}/suspend",
        headers=headers,
    )

    after = await client.get("/api/v1/admin/quality", headers=headers)
    assert after.status_code == 200
    assert after.json()["suspended_users"] == 1
    # No classes or reviews tables yet, so those stay at their real zero.
    assert after.json()["total_classes"] == 0
    assert after.json()["average_rating"] == 0.0

    reactivated = await client.patch(
        f"/api/v1/admin/users/{suspended['user']['id']}/suspend",
        headers=headers,
    )
    assert reactivated.status_code == 200
    assert (await client.get("/api/v1/admin/quality", headers=headers)).json()[
        "suspended_users"
    ] == 0


@pytest.mark.asyncio
async def test_quality_metrics_require_admin(client: AsyncClient) -> None:
    instructor = await register(client, "quality-instructor@example.com", "instructor")

    response = await client.get(
        "/api/v1/admin/quality",
        headers=auth_headers(instructor["access_token"]),
    )

    assert response.status_code == 403
