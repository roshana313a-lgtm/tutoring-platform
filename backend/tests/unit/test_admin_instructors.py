"""Contract tests for the instructor approval system (Feature 2e).

Written RED before implementation, following the project TDD policy.
"""

import uuid
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


async def register(client: AsyncClient, email: str, role: str) -> tuple[str, str]:
    """Register a user and return (token, id)."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    body = response.json()
    return body["access_token"], body["user"]["id"]


async def token_for(user_factory: UserFactory, email: str, role: str) -> str:
    user = await user_factory(email, role)
    return create_access_token(str(user.id), user.role)


@pytest.mark.asyncio
async def test_new_instructor_is_created_unapproved(client: AsyncClient) -> None:
    token, _ = await register(client, "pending-new@example.com", "instructor")

    me = await client.get("/api/v1/auth/me", headers=auth_headers(token))

    assert me.status_code == 200
    assert me.json()["role"] == "instructor"
    assert me.json()["is_approved"] is False


@pytest.mark.asyncio
async def test_admin_lists_only_unapproved_instructors(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    pending_token, pending_id = await register(client, "pending-1@example.com", "instructor")
    await register(client, "pending-2@example.com", "instructor")
    await register(client, "pending-student@example.com", "student")
    admin = await token_for(user_factory, "approval-admin@example.com", "admin")

    response = await client.get(
        "/api/v1/admin/instructors/pending",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    instructors = response.json()
    assert isinstance(instructors, list)
    emails = {instructor["email"] for instructor in instructors}
    assert emails == {"pending-1@example.com", "pending-2@example.com"}
    assert all(instructor["role"] == "instructor" for instructor in instructors)
    assert all(instructor["is_approved"] is False for instructor in instructors)
    assert pending_id in {instructor["id"] for instructor in instructors}
    assert pending_token


@pytest.mark.asyncio
async def test_pending_instructors_include_the_full_review_profile(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    token, instructor_id = await register(client, "profile-review@example.com", "instructor")
    profile = {
        "short_summary": "مدرس آیلتس با هشت سال تجربه",
        "teaching_languages": ["انگلیسی", "آلمانی"],
        "hourly_rate": 250000,
        "education_level": "کارشناسی ارشد",
        "avatar_url": "/media/avatars/review.png",
    }
    updated = await client.put(
        "/api/v1/auth/profile", json=profile, headers=auth_headers(token)
    )
    assert updated.status_code == 200
    admin = await token_for(user_factory, "approval-admin-profile@example.com", "admin")

    response = await client.get(
        "/api/v1/admin/instructors/pending",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    row = next(item for item in response.json() if item["id"] == instructor_id)
    assert row["full_name"] == ""
    assert row["email"] == "profile-review@example.com"
    assert row["short_summary"] == profile["short_summary"]
    assert row["teaching_languages"] == profile["teaching_languages"]
    assert row["hourly_rate"] == profile["hourly_rate"]
    assert row["education_level"] == profile["education_level"]
    assert row["avatar_url"] == profile["avatar_url"]
    assert "hashed_password" not in row


@pytest.mark.asyncio
async def test_admin_approves_an_instructor(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    instructor_token, instructor_id = await register(
        client, "to-approve@example.com", "instructor"
    )
    admin = await token_for(user_factory, "approval-admin-2@example.com", "admin")

    response = await client.patch(
        f"/api/v1/admin/instructors/{instructor_id}/approve",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_approved"] is True
    assert body["email"] == "to-approve@example.com"

    pending = await client.get(
        "/api/v1/admin/instructors/pending",
        headers=auth_headers(admin),
    )
    assert pending.status_code == 200
    assert instructor_id not in {instructor["id"] for instructor in pending.json()}

    me = await client.get("/api/v1/auth/me", headers=auth_headers(instructor_token))
    assert me.status_code == 200
    assert me.json()["is_approved"] is True


@pytest.mark.asyncio
async def test_admin_rejects_an_instructor_by_removing_the_account(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    instructor_token, instructor_id = await register(
        client, "to-reject@example.com", "instructor"
    )
    admin = await token_for(user_factory, "approval-admin-3@example.com", "admin")

    response = await client.patch(
        f"/api/v1/admin/instructors/{instructor_id}/reject",
        headers=auth_headers(admin),
    )

    assert response.status_code == 204

    pending = await client.get(
        "/api/v1/admin/instructors/pending",
        headers=auth_headers(admin),
    )
    assert instructor_id not in {instructor["id"] for instructor in pending.json()}

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "to-reject@example.com", "password": PASSWORD},
    )
    assert login.status_code == 401
    assert instructor_token


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["instructor", "student"])
async def test_only_admin_can_use_the_approval_endpoints(
    client: AsyncClient,
    user_factory: UserFactory,
    role: str,
) -> None:
    _, instructor_id = await register(client, "target@example.com", "instructor")
    headers = auth_headers(await token_for(user_factory, f"blocked-{role}@example.com", role))

    pending = await client.get("/api/v1/admin/instructors/pending", headers=headers)
    approve = await client.patch(
        f"/api/v1/admin/instructors/{instructor_id}/approve", headers=headers
    )
    reject = await client.patch(
        f"/api/v1/admin/instructors/{instructor_id}/reject", headers=headers
    )

    for response in (pending, approve, reject):
        assert response.status_code == 403
        assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_approval_endpoints_require_authentication(client: AsyncClient) -> None:
    _, instructor_id = await register(client, "no-auth@example.com", "instructor")

    pending = await client.get("/api/v1/admin/instructors/pending")
    approve = await client.patch(f"/api/v1/admin/instructors/{instructor_id}/approve")
    reject = await client.patch(f"/api/v1/admin/instructors/{instructor_id}/reject")

    for response in (pending, approve, reject):
        assert response.status_code == 401
        assert error_code(response.json()) == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_approving_a_missing_or_non_instructor_user_returns_404(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    _, student_id = await register(client, "not-an-instructor@example.com", "student")
    admin = await token_for(user_factory, "approval-admin-4@example.com", "admin")

    missing = await client.patch(
        f"/api/v1/admin/instructors/{uuid.uuid4()}/approve",
        headers=auth_headers(admin),
    )
    student = await client.patch(
        f"/api/v1/admin/instructors/{student_id}/approve",
        headers=auth_headers(admin),
    )

    for response in (missing, student):
        assert response.status_code == 404
        assert error_code(response.json()) == "INSTRUCTOR_NOT_FOUND"
