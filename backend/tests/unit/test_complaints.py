"""Contract tests for the complaints / support ticketing system."""

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


async def register(client: AsyncClient, email: str, role: str) -> dict:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "role": role},
    )
    assert response.status_code == 201
    return response.json()


async def admin_headers(client: AsyncClient, user_factory: UserFactory) -> dict[str, str]:
    admin = await user_factory("complaints-admin@example.com", "admin")
    return auth_headers(create_access_token(str(admin.id), admin.role))


async def submit(
    client: AsyncClient,
    token: str,
    subject: str = "کلاس لغو شد",
    description: str = "مدرس بدون اطلاع کلاس را لغو کرد.",
) -> dict:
    response = await client.post(
        "/api/v1/complaints",
        json={"subject": subject, "description": description},
        headers=auth_headers(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["student", "instructor"])
async def test_any_authenticated_role_can_submit_a_complaint(
    client: AsyncClient,
    role: str,
) -> None:
    account = await register(client, f"complaint-{role}@example.com", role)

    body = await submit(client, account["access_token"])

    assert body["user_id"] == account["user"]["id"]
    assert body["subject"] == "کلاس لغو شد"
    assert body["description"] == "مدرس بدون اطلاع کلاس را لغو کرد."
    assert body["status"] == "open"
    assert body["created_at"]
    uuid.UUID(body["id"])


@pytest.mark.asyncio
async def test_complaint_subject_and_description_are_trimmed(client: AsyncClient) -> None:
    account = await register(client, "complaint-trim@example.com", "student")

    body = await submit(client, account["access_token"], "  مشکل پرداخت  ", "  مبلغ کسر شد  ")

    assert body["subject"] == "مشکل پرداخت"
    assert body["description"] == "مبلغ کسر شد"


@pytest.mark.asyncio
async def test_complaint_submission_requires_authentication(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/complaints",
        json={"subject": "بدون ورود", "description": "توکن ندارم"},
    )

    assert response.status_code == 401
    assert error_code(response.json()) == "INVALID_TOKEN"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"subject": "", "description": "متن"},
        {"subject": "   ", "description": "متن"},
        {"subject": "موضوع", "description": ""},
        {"subject": "موضوع", "description": "   "},
        {"subject": "x" * 201, "description": "متن"},
        {"subject": "موضوع", "description": "x" * 2001},
        {"subject": "موضوع"},
        {"description": "متن"},
    ],
)
async def test_complaint_submission_rejects_invalid_payloads(
    client: AsyncClient,
    payload: dict[str, str],
) -> None:
    account = await register(client, "complaint-invalid@example.com", "student")

    response = await client.post(
        "/api/v1/complaints",
        json=payload,
        headers=auth_headers(account["access_token"]),
    )

    assert response.status_code == 422
    assert error_code(response.json()) == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_admin_lists_every_complaint_with_the_submitter(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    student = await register(client, "complaint-student-list@example.com", "student")
    await client.put(
        "/api/v1/auth/profile",
        json={"full_name": "علی احمدی"},
        headers=auth_headers(student["access_token"]),
    )
    instructor = await register(client, "complaint-instructor-list@example.com", "instructor")
    first = await submit(client, student["access_token"], "شکایت اول")
    second = await submit(client, instructor["access_token"], "شکایت دوم")

    response = await client.get(
        "/api/v1/admin/complaints",
        headers=await admin_headers(client, user_factory),
    )

    assert response.status_code == 200
    rows = response.json()
    assert [row["id"] for row in rows] == [second["id"], first["id"]]
    assert rows[0]["user_email"] == "complaint-instructor-list@example.com"
    # Instructors have no full name yet, so the email local-part is the fallback.
    assert rows[0]["user_name"] == "complaint-instructor-list"
    assert rows[1]["user_name"] == "علی احمدی"
    assert rows[1]["user_email"] == "complaint-student-list@example.com"
    assert rows[1]["status"] == "open"


@pytest.mark.asyncio
async def test_only_admin_can_list_or_update_complaints(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    student = await register(client, "complaint-blocked@example.com", "student")
    complaint = await submit(client, student["access_token"])
    headers = auth_headers(student["access_token"])

    listing = await client.get("/api/v1/admin/complaints", headers=headers)
    update = await client.patch(
        f"/api/v1/admin/complaints/{complaint['id']}/status",
        json={"status": "resolved"},
        headers=headers,
    )
    instructor = await register(client, "complaint-blocked-instructor@example.com", "instructor")
    instructor_listing = await client.get(
        "/api/v1/admin/complaints",
        headers=auth_headers(instructor["access_token"]),
    )

    assert listing.status_code == 403
    assert error_code(listing.json()) == "FORBIDDEN"
    assert update.status_code == 403
    assert instructor_listing.status_code == 403
    assert (await client.get("/api/v1/admin/complaints")).status_code == 401
    assert (
        await client.patch(
            f"/api/v1/admin/complaints/{complaint['id']}/status",
            json={"status": "resolved"},
        )
    ).status_code == 401


@pytest.mark.asyncio
async def test_admin_moves_a_complaint_to_in_progress_and_resolved(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    student = await register(client, "complaint-status@example.com", "student")
    complaint = await submit(client, student["access_token"])
    headers = await admin_headers(client, user_factory)

    started = await client.patch(
        f"/api/v1/admin/complaints/{complaint['id']}/status",
        json={"status": "in_progress"},
        headers=headers,
    )

    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"
    assert started.json()["id"] == complaint["id"]

    resolved = await client.patch(
        f"/api/v1/admin/complaints/{complaint['id']}/status",
        json={"status": "resolved"},
        headers=headers,
    )

    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{"status": "open"}, {"status": "closed"}, {}])
async def test_status_update_rejects_statuses_outside_the_workflow(
    client: AsyncClient,
    user_factory: UserFactory,
    payload: dict[str, str],
) -> None:
    student = await register(client, "complaint-bad-status@example.com", "student")
    complaint = await submit(client, student["access_token"])

    response = await client.patch(
        f"/api/v1/admin/complaints/{complaint['id']}/status",
        json=payload,
        headers=await admin_headers(client, user_factory),
    )

    assert response.status_code == 422
    assert error_code(response.json()) == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_status_update_returns_404_for_an_unknown_complaint(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    response = await client.patch(
        f"/api/v1/admin/complaints/{uuid.uuid4()}/status",
        json={"status": "resolved"},
        headers=await admin_headers(client, user_factory),
    )

    assert response.status_code == 404
    assert error_code(response.json()) == "COMPLAINT_NOT_FOUND"


@pytest.mark.asyncio
async def test_dashboard_open_complaints_count_tracks_the_queue(
    client: AsyncClient,
    user_factory: UserFactory,
) -> None:
    student = await register(client, "complaint-count@example.com", "student")
    first = await submit(client, student["access_token"], "اول")
    await submit(client, student["access_token"], "دوم")
    headers = await admin_headers(client, user_factory)

    before = await client.get("/api/v1/dashboard/admin/stats", headers=headers)
    assert before.json()["open_complaints"] == 2

    await client.patch(
        f"/api/v1/admin/complaints/{first['id']}/status",
        json={"status": "resolved"},
        headers=headers,
    )

    after = await client.get("/api/v1/dashboard/admin/stats", headers=headers)
    assert after.json()["open_complaints"] == 1
