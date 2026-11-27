"""Contract tests for admin user management (Feature 2f)."""

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


async def register(client: AsyncClient, email: str, role: str) -> tuple[str, dict]:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    body = response.json()
    return body["access_token"], body["user"]


async def token_for(user_factory: UserFactory, email: str, role: str) -> str:
    user = await user_factory(email, role)
    return create_access_token(str(user.id), user.role)


@pytest.mark.asyncio
async def test_admin_lists_students_and_instructors_only(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    _, student = await register(client, "list-student@example.com", "student")
    _, instructor = await register(client, "list-instructor@example.com", "instructor")
    await user_factory("list-admin@example.com", "admin")
    headers = auth_headers(await token_for(user_factory, "listing-admin@example.com", "admin"))

    response = await client.get("/api/v1/admin/users", headers=headers)

    assert response.status_code == 200
    users = response.json()
    emails = {user["email"] for user in users}
    assert emails == {"list-student@example.com", "list-instructor@example.com"}
    assert {user["role"] for user in users} == {"student", "instructor"}
    assert all(user["is_active"] is True for user in users)

    listed = next(user for user in users if user["id"] == student["id"])
    assert set(listed) >= {"id", "email", "full_name", "role", "is_active"}
    assert listed["full_name"] == ""
    assert instructor["email"] in emails


@pytest.mark.asyncio
async def test_admin_user_list_includes_the_uploaded_avatar(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    token, student = await register(client, "avatar-student@example.com", "student")
    updated = await client.put(
        "/api/v1/auth/profile",
        json={"avatar_url": "/media/avatars/listed.png"},
        headers=auth_headers(token),
    )
    assert updated.status_code == 200
    headers = auth_headers(await token_for(user_factory, "avatar-admin@example.com", "admin"))

    response = await client.get("/api/v1/admin/users", headers=headers)

    assert response.status_code == 200
    listed = next(user for user in response.json() if user["id"] == student["id"])
    assert listed["avatar_url"] == "/media/avatars/listed.png"


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["student", "instructor"])
async def test_only_admin_can_list_or_suspend_users(
    client: AsyncClient,
    user_factory: UserFactory,
    role: str,
) -> None:
    _, target = await register(client, f"target-{role}@example.com", "student")
    headers = auth_headers(await token_for(user_factory, f"blocked-users-{role}@example.com", role))

    listing = await client.get("/api/v1/admin/users", headers=headers)
    suspend = await client.patch(
        f"/api/v1/admin/users/{target['id']}/suspend", headers=headers
    )

    for response in (listing, suspend):
        assert response.status_code == 403
        assert error_code(response.json()) == "FORBIDDEN"


@pytest.mark.asyncio
async def test_user_endpoints_require_authentication(client: AsyncClient) -> None:
    listing = await client.get("/api/v1/admin/users")
    suspend = await client.patch(f"/api/v1/admin/users/{uuid.uuid4()}/suspend")

    for response in (listing, suspend):
        assert response.status_code == 401
        assert error_code(response.json()) == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_suspend_blocks_login_and_reactivating_restores_it(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    _, student = await register(client, "suspend-me@example.com", "student")
    headers = auth_headers(await token_for(user_factory, "suspend-admin@example.com", "admin"))

    suspended = await client.patch(
        f"/api/v1/admin/users/{student['id']}/suspend", headers=headers
    )

    assert suspended.status_code == 200
    assert suspended.json()["is_active"] is False

    blocked_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "suspend-me@example.com", "password": PASSWORD},
    )
    assert blocked_login.status_code == 403
    assert error_code(blocked_login.json()) == "ACCOUNT_SUSPENDED"

    reactivated = await client.patch(
        f"/api/v1/admin/users/{student['id']}/suspend", headers=headers
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["is_active"] is True

    allowed_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "suspend-me@example.com", "password": PASSWORD},
    )
    assert allowed_login.status_code == 200


@pytest.mark.asyncio
async def test_suspending_an_admin_or_missing_user_returns_404(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    admin_user = await user_factory("protected-admin@example.com", "admin")
    headers = auth_headers(await token_for(user_factory, "acting-admin@example.com", "admin"))

    admin_target = await client.patch(
        f"/api/v1/admin/users/{admin_user.id}/suspend", headers=headers
    )
    missing = await client.patch(
        f"/api/v1/admin/users/{uuid.uuid4()}/suspend", headers=headers
    )

    for response in (admin_target, missing):
        assert response.status_code == 404
        assert error_code(response.json()) == "USER_NOT_FOUND"
