"""Authentication API contract tests for Feature 1."""

import pytest
from httpx import AsyncClient

GENERIC_LOGIN_MESSAGE = "Invalid email or password"
PASSWORD = "correct horse battery staple"


async def register_user(
    client: AsyncClient,
    email: str,
    role: str = "student",
    password: str = PASSWORD,
) -> object:
    return await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "role": role},
    )


async def login_user(client: AsyncClient, email: str, password: str = PASSWORD) -> object:
    return await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


def assert_auth_body(body: dict[str, object], email: str, role: str) -> dict[str, object]:
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]

    user = body["user"]
    assert isinstance(user, dict)
    assert user["email"] == email
    assert user["role"] == role
    assert "hashed_password" not in user
    return user


def assert_error_envelope(
    body: dict[str, object],
    *,
    code: str,
    message: str | None = None,
) -> None:
    error = body["error"]
    assert isinstance(error, dict)
    assert error["code"] == code
    assert isinstance(error["message"], str)
    if message is not None:
        assert error["message"] == message


@pytest.mark.asyncio
async def test_register_student_returns_201_with_safe_user_payload(
    client: AsyncClient,
) -> None:
    response = await register_user(client, "student@example.com")

    assert response.status_code == 201
    assert_auth_body(response.json(), "student@example.com", "student")


@pytest.mark.asyncio
async def test_register_returns_access_token(client: AsyncClient) -> None:
    response = await register_user(client, "token-student@example.com", role="instructor")

    assert response.status_code == 201
    body = response.json()
    assert_auth_body(body, "token-student@example.com", "instructor")
    assert "user" in body
    assert "access_token" in body
    assert "token_type" in body


@pytest.mark.asyncio
async def test_login_returns_access_token(client: AsyncClient) -> None:
    await register_user(client, "login@example.com")

    response = await login_user(client, "login@example.com")

    assert response.status_code == 200
    assert_auth_body(response.json(), "login@example.com", "student")


@pytest.mark.asyncio
async def test_login_invalid_password_returns_401(client: AsyncClient) -> None:
    await register_user(client, "wrong-password@example.com")

    response = await login_user(client, "wrong-password@example.com", "not-the-right-password")

    assert response.status_code == 401
    assert_error_envelope(
        response.json(),
        code="INVALID_CREDENTIALS",
        message=GENERIC_LOGIN_MESSAGE,
    )


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient) -> None:
    response = await login_user(client, "nobody@example.com")

    assert response.status_code == 401
    assert_error_envelope(
        response.json(),
        code="INVALID_CREDENTIALS",
        message=GENERIC_LOGIN_MESSAGE,
    )


@pytest.mark.asyncio
async def test_me_returns_current_user(client: AsyncClient) -> None:
    registered = await register_user(client, "me@example.com")
    token = registered.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == registered.json()["user"]


@pytest.mark.asyncio
async def test_me_without_token_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert_error_envelope(response.json(), code="INVALID_TOKEN")


@pytest.mark.asyncio
async def test_me_with_invalid_token_returns_401(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert_error_envelope(response.json(), code="INVALID_TOKEN")
