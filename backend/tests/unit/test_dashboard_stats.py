"""Contract tests for dashboard statistics (Feature 2g)."""

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


async def token_for(user_factory: UserFactory, email: str, role: str) -> str:
    user = await user_factory(email, role)
    return create_access_token(str(user.id), user.role)


@pytest.mark.asyncio
async def test_admin_stats_count_the_real_database_rows(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    await register(client, "stats-pending-1@example.com", "instructor")
    pending = await register(client, "stats-pending-2@example.com", "instructor")
    approved = await register(client, "stats-approved@example.com", "instructor")
    await register(client, "stats-student@example.com", "student")
    admin = await user_factory("stats-admin@example.com", "admin")
    headers = auth_headers(create_access_token(str(admin.id), admin.role))

    approve = await client.patch(
        f"/api/v1/admin/instructors/{approved['user']['id']}/approve",
        headers=headers,
    )
    assert approve.status_code == 200

    response = await client.get("/api/v1/dashboard/admin/stats", headers=headers)

    assert response.status_code == 200
    body = response.json()
    # 1 of the 3 instructors is approved, so 2 are still pending; 4 users + admin.
    assert body == {
        "pending_instructors": 2,
        "total_users": 5,
        "active_classes": 0,
        "open_complaints": 0,
    }
    assert pending["user"]["email"] == "stats-pending-2@example.com"


@pytest.mark.asyncio
async def test_admin_stats_drop_when_the_pending_queue_is_cleared(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    instructor = await register(client, "stats-clear@example.com", "instructor")
    admin = await user_factory("stats-admin-clear@example.com", "admin")
    headers = auth_headers(create_access_token(str(admin.id), admin.role))

    before = await client.get("/api/v1/dashboard/admin/stats", headers=headers)
    assert before.json()["pending_instructors"] == 1

    await client.patch(
        f"/api/v1/admin/instructors/{instructor['user']['id']}/reject",
        headers=headers,
    )

    after = await client.get("/api/v1/dashboard/admin/stats", headers=headers)
    assert after.json()["pending_instructors"] == 0
    assert after.json()["total_users"] == 1


@pytest.mark.asyncio
async def test_instructor_stats_are_role_scoped_and_real(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    instructor = await register(client, "stats-instructor@example.com", "instructor")
    headers = auth_headers(instructor["access_token"])

    response = await client.get("/api/v1/dashboard/instructor/stats", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "today_classes": 0,
        "pending_grading": 0,
        "total_students": 0,
    }

    student = await register(client, "stats-instructor-blocked@example.com", "student")
    blocked = await client.get(
        "/api/v1/dashboard/instructor/stats",
        headers=auth_headers(student["access_token"]),
    )
    assert blocked.status_code == 403
    assert error_code(blocked.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_student_stats_are_role_scoped_and_real(client: AsyncClient) -> None:
    student = await register(client, "stats-student-me@example.com", "student")
    headers = auth_headers(student["access_token"])

    response = await client.get("/api/v1/dashboard/student/stats", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "upcoming_classes": 0,
        "pending_homework": 0,
        "average_grade": 0.0,
    }

    instructor = await register(client, "stats-student-blocked@example.com", "instructor")
    blocked = await client.get(
        "/api/v1/dashboard/student/stats",
        headers=auth_headers(instructor["access_token"]),
    )
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_only_admin_can_read_admin_stats(
    client: AsyncClient,
) -> None:
    student = await register(client, "stats-admin-blocked@example.com", "student")

    response = await client.get(
        "/api/v1/dashboard/admin/stats",
        headers=auth_headers(student["access_token"]),
    )

    assert response.status_code == 403
    assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_dashboard_stats_require_authentication(client: AsyncClient) -> None:
    for path in ("admin", "instructor", "student"):
        response = await client.get(f"/api/v1/dashboard/{path}/stats")
        assert response.status_code == 401
        assert error_code(response.json()) == "INVALID_TOKEN"
