"""Contract tests for public instructor discovery: search, filters and profile."""

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User

PASSWORD = "correct horse battery staple"
UserFactory = Callable[[str, str], Awaitable[User]]

DETAIL_FIELDS = {
    "id",
    "full_name",
    "avatar_url",
    "short_summary",
    "bio",
    "teaching_languages",
    "hourly_rate",
    "average_rating",
    "years_of_experience",
    "education_level",
}


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
    admin = await user_factory("discovery-admin@example.com", "admin")
    return create_access_token(str(admin.id), admin.role)


async def approved_instructor(
    client: AsyncClient,
    admin: str,
    email: str,
    *,
    full_name: str,
    languages: list[str],
    hourly_rate: int,
    short_summary: str = "",
    bio: str = "",
    approve: bool = True,
) -> dict:
    account = await register(client, email, "instructor")
    response = await client.put(
        "/api/v1/auth/profile",
        json={
            "full_name": full_name,
            "short_summary": short_summary,
            "bio": bio,
            "teaching_languages": languages,
            "hourly_rate": hourly_rate,
        },
        headers=auth_headers(account["access_token"]),
    )
    assert response.status_code == 200

    if approve:
        approved = await client.patch(
            f"/api/v1/admin/instructors/{account['user']['id']}/approve",
            headers=auth_headers(admin),
        )
        assert approved.status_code == 200

    return account


async def student_token(client: AsyncClient) -> str:
    account = await register(client, "discovery-student@example.com", "student")
    return str(account["access_token"])


@pytest.mark.asyncio
async def test_discovery_lists_only_approved_instructors(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    await approved_instructor(
        client,
        admin,
        "sara@example.com",
        full_name="سارا کریمی",
        languages=["انگلیسی"],
        hourly_rate=250000,
        short_summary="مدرس آیلتس",
    )
    await approved_instructor(
        client,
        admin,
        "pending@example.com",
        full_name="مدرس تاییدنشده",
        languages=["انگلیسی"],
        hourly_rate=200000,
        approve=False,
    )
    await register(client, "just-a-student@example.com", "student")

    response = await client.get(
        "/api/v1/instructors", headers=auth_headers(await student_token(client))
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["full_name"] for item in body] == ["سارا کریمی"]
    assert set(body[0]) >= {
        "id",
        "full_name",
        "avatar_url",
        "short_summary",
        "teaching_languages",
        "hourly_rate",
        "average_rating",
    }
    assert body[0]["average_rating"] is None


@pytest.mark.asyncio
async def test_discovery_searches_by_name_and_language(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    await approved_instructor(
        client,
        admin,
        "sara@example.com",
        full_name="Sara Karimi",
        languages=["English"],
        hourly_rate=250000,
    )
    await approved_instructor(
        client,
        admin,
        "reza@example.com",
        full_name="رضا محمدی",
        languages=["آلمانی"],
        hourly_rate=300000,
    )
    headers = auth_headers(await student_token(client))

    by_name = await client.get("/api/v1/instructors?search=sara", headers=headers)
    assert by_name.status_code == 200
    assert [item["full_name"] for item in by_name.json()] == ["Sara Karimi"]

    by_language = await client.get("/api/v1/instructors?search=آلمانی", headers=headers)
    assert by_language.status_code == 200
    assert [item["full_name"] for item in by_language.json()] == ["رضا محمدی"]

    no_match = await client.get("/api/v1/instructors?search=ژاپنی", headers=headers)
    assert no_match.status_code == 200
    assert no_match.json() == []


@pytest.mark.asyncio
async def test_discovery_filters_by_max_price(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    await approved_instructor(
        client,
        admin,
        "cheap@example.com",
        full_name="ارزان",
        languages=["انگلیسی"],
        hourly_rate=150000,
    )
    await approved_instructor(
        client,
        admin,
        "expensive@example.com",
        full_name="گران",
        languages=["انگلیسی"],
        hourly_rate=900000,
    )
    headers = auth_headers(await student_token(client))

    response = await client.get("/api/v1/instructors?max_price=200000", headers=headers)
    assert response.status_code == 200
    assert [item["full_name"] for item in response.json()] == ["ارزان"]

    invalid = await client.get("/api/v1/instructors?max_price=-1", headers=headers)
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_discovery_combines_search_and_price_filter(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    await approved_instructor(
        client,
        admin,
        "match@example.com",
        full_name="مریم رضایی",
        languages=["انگلیسی"],
        hourly_rate=200000,
    )
    await approved_instructor(
        client,
        admin,
        "too-pricey@example.com",
        full_name="مریم احمدی",
        languages=["انگلیسی"],
        hourly_rate=800000,
    )
    headers = auth_headers(await student_token(client))

    response = await client.get(
        "/api/v1/instructors?search=مریم&max_price=250000", headers=headers
    )

    assert response.status_code == 200
    assert [item["full_name"] for item in response.json()] == ["مریم رضایی"]


@pytest.mark.asyncio
async def test_instructor_detail_returns_full_profile(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    account = await approved_instructor(
        client,
        admin,
        "detail@example.com",
        full_name="سارا کریمی",
        languages=["انگلیسی", "آلمانی"],
        hourly_rate=250000,
        short_summary="مدرس آیلتس",
        bio="هشت سال تجربه تدریس آیلتس.",
    )
    headers = auth_headers(await student_token(client))

    response = await client.get(f"/api/v1/instructors/{account['user']['id']}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == DETAIL_FIELDS
    assert body["id"] == account["user"]["id"]
    assert body["full_name"] == "سارا کریمی"
    assert body["teaching_languages"] == ["انگلیسی", "آلمانی"]
    assert body["hourly_rate"] == 250000
    assert body["bio"] == "هشت سال تجربه تدریس آیلتس."
    assert body["average_rating"] is None


@pytest.mark.asyncio
async def test_instructor_detail_hides_unapproved_and_non_instructors(
    client: AsyncClient, user_factory: UserFactory
) -> None:
    admin = await admin_token(user_factory)
    pending = await approved_instructor(
        client,
        admin,
        "hidden@example.com",
        full_name="در انتظار تایید",
        languages=["انگلیسی"],
        hourly_rate=250000,
        approve=False,
    )
    student = await register(client, "detail-student@example.com", "student")
    headers = auth_headers(student["access_token"])

    unknown_id = "00000000-0000-4000-8000-000000000000"
    for instructor_id in (pending["user"]["id"], student["user"]["id"], unknown_id):
        response = await client.get(f"/api/v1/instructors/{instructor_id}", headers=headers)
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_instructor_detail_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/instructors/some-id")

    assert response.status_code == 401
