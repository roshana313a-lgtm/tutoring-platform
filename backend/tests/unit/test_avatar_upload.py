"""Avatar upload contract tests for the profile page (Feature 2c).

Written RED before implementation, following the project TDD policy.
"""

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import settings

PASSWORD = "correct horse battery staple"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"avatar-bytes" * 8


@pytest.fixture
def media_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "media_dir", str(tmp_path))
    return tmp_path


async def register_token(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": "student"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    assert isinstance(token, str)
    return token


def error_code(body: dict[str, object]) -> str:
    error = body["error"]
    assert isinstance(error, dict)
    code = error["code"]
    assert isinstance(code, str)
    return code


@pytest.mark.asyncio
async def test_avatar_upload_requires_authentication(
    client: AsyncClient,
    media_dir: Path,
) -> None:
    response = await client.post(
        "/api/v1/uploads/avatar",
        files={"file": ("avatar.png", PNG_BYTES, "image/png")},
    )

    assert response.status_code == 401
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_avatar_upload_stores_image_and_returns_url(
    client: AsyncClient,
    media_dir: Path,
) -> None:
    token = await register_token(client, "avatar-student@example.com")

    response = await client.post(
        "/api/v1/uploads/avatar",
        files={"file": ("avatar.png", PNG_BYTES, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body, dict)
    avatar_url = body["avatar_url"]
    assert isinstance(avatar_url, str)
    assert avatar_url.startswith("/media/avatars/")
    assert avatar_url.endswith(".png")

    stored = media_dir / avatar_url.removeprefix("/media/")
    assert stored.is_file()
    assert stored.read_bytes() == PNG_BYTES


@pytest.mark.asyncio
async def test_avatar_upload_rejects_non_image_content_type(
    client: AsyncClient,
    media_dir: Path,
) -> None:
    token = await register_token(client, "avatar-text@example.com")

    response = await client.post(
        "/api/v1/uploads/avatar",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_avatar_upload_rejects_oversized_files(
    client: AsyncClient,
    media_dir: Path,
) -> None:
    token = await register_token(client, "avatar-large@example.com")
    oversized = b"\x89PNG\r\n\x1a\n" + b"0" * (3 * 1024 * 1024)

    response = await client.post(
        "/api/v1/uploads/avatar",
        files={"file": ("big.png", oversized, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    body = response.json()
    assert isinstance(body, dict)
    assert error_code(body) == "VALIDATION_ERROR"
