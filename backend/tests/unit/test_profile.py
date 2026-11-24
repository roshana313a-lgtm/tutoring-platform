"""Contract tests for profile completion — written RED before implementation."""

import pytest
from httpx import AsyncClient

PASSWORD = "correct horse battery staple"


async def register_user(
    client: AsyncClient,
    email: str,
    role: str = "student",
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    body = response.json()
    assert isinstance(body, dict)
    return body


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def access_token(body: dict[str, object]) -> str:
    token = body["access_token"]
    assert isinstance(token, str)
    return token


def error_code(body: dict[str, object]) -> str:
    error = body["error"]
    assert isinstance(error, dict)
    code = error["code"]
    assert isinstance(code, str)
    return code


@pytest.mark.asyncio
async def test_update_profile_returns_all_common_fields(client: AsyncClient) -> None:
    registered = await register_user(client, "profile-common@example.com")
    payload = {
        "full_name": "علی احمدی",
        "phone_number": "+989121234567",
        "avatar_url": "https://example.com/avatar.png",
        "timezone": "Europe/Berlin",
    }

    response = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(access_token(registered)),
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["full_name"] == payload["full_name"]
    assert body["phone_number"] == payload["phone_number"]
    assert body["avatar_url"] == payload["avatar_url"]
    assert body["timezone"] == payload["timezone"]
    assert "hashed_password" not in body


@pytest.mark.asyncio
async def test_get_me_returns_updated_profile_fields(client: AsyncClient) -> None:
    registered = await register_user(client, "profile-retrieve@example.com")
    payload = {
        "full_name": "سارا کریمی",
        "phone_number": "+989120000000",
        "avatar_url": "https://example.com/sara.png",
        "timezone": "Asia/Tehran",
    }

    update = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(access_token(registered)),
    )
    assert update.status_code == 200

    response = await client.get(
        "/api/v1/auth/me",
        headers=auth_headers(access_token(registered)),
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    for field, value in payload.items():
        assert body[field] == value
    assert "hashed_password" not in body


@pytest.mark.asyncio
async def test_partial_update_preserves_fields_and_timezone_default(client: AsyncClient) -> None:
    registered = await register_user(client, "profile-partial@example.com")
    headers = auth_headers(access_token(registered))

    first = await client.put(
        "/api/v1/auth/profile",
        json={"phone_number": "+989121111111"},
        headers=headers,
    )
    assert first.status_code == 200

    second = await client.put(
        "/api/v1/auth/profile",
        json={"full_name": "رضا محمدی"},
        headers=headers,
    )
    assert second.status_code == 200

    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["full_name"] == "رضا محمدی"
    assert body["phone_number"] == "+989121111111"
    assert body["avatar_url"] == ""
    assert body["timezone"] == "Asia/Tehran"


@pytest.mark.asyncio
async def test_instructor_can_update_bio_and_experience(client: AsyncClient) -> None:
    registered = await register_user(
        client,
        "profile-instructor@example.com",
        role="instructor",
    )
    headers = auth_headers(access_token(registered))

    response = await client.put(
        "/api/v1/auth/profile",
        json={"bio": "مدرس زبان انگلیسی", "years_of_experience": 7},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["bio"] == "مدرس زبان انگلیسی"
    assert body["years_of_experience"] == 7

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    me_body = me.json()
    assert isinstance(me_body, dict)
    assert me_body["years_of_experience"] == 7


@pytest.mark.asyncio
async def test_student_can_update_current_level(client: AsyncClient) -> None:
    registered = await register_user(client, "profile-student@example.com")
    headers = auth_headers(access_token(registered))

    response = await client.put(
        "/api/v1/auth/profile",
        json={"current_level": "intermediate"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body["current_level"] == "intermediate"

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    me_body = me.json()
    assert isinstance(me_body, dict)
    assert me_body["current_level"] == "intermediate"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "payload"),
    [
        ("student", {"bio": "not allowed"}),
        ("student", {"years_of_experience": 3}),
        ("instructor", {"current_level": "advanced"}),
    ],
)
async def test_role_specific_fields_rejected_for_other_roles(
    client: AsyncClient,
    role: str,
    payload: dict[str, object],
) -> None:
    registered = await register_user(
        client,
        f"profile-role-{role}-{next(iter(payload))}@example.com",
        role=role,
    )

    response = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(access_token(registered)),
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"years_of_experience": -1},
        {"full_name": "x" * 256},
        {"phone_number": "1" * 51},
    ],
)
async def test_invalid_profile_values_are_rejected(
    client: AsyncClient,
    payload: dict[str, object],
) -> None:
    registered = await register_user(
        client,
        f"profile-invalid-{next(iter(payload))}@example.com",
        role="instructor",
    )

    response = await client.put(
        "/api/v1/auth/profile",
        json=payload,
        headers=auth_headers(access_token(registered)),
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_profile_update_requires_authentication(client: AsyncClient) -> None:
    response = await client.put(
        "/api/v1/auth/profile",
        json={"full_name": "anonymous"},
    )

    assert response.status_code == 401
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "INVALID_TOKEN"
