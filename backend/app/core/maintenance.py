"""Maintenance-mode middleware.

When an admin switches `maintenance_mode` on, every API call from a
non-admin gets `503 MAINTENANCE_MODE`. Requests that carry a valid admin
token are let through so the admin can keep working and switch it off again;
the sign-in endpoint and `/health` stay reachable for the same reason.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.db import get_db
from app.core.errors import InvalidTokenError, error_response
from app.core.security import decode_access_token
from app.repositories.setting_repository import SettingsRepository
from app.services.platform_settings import is_maintenance_mode

MAINTENANCE_MESSAGE = "سامانه موقتاً در حال به‌روزرسانی است. لطفاً بعداً مراجعه کنید."
ADMIN_ROLE = "admin"
# Public endpoints that must keep answering while the platform is closed.
ALWAYS_ALLOWED_PATHS = frozenset({"/health", "/api/v1/auth/login"})
API_PREFIX = "/api/"

CallNext = Callable[[Request], Awaitable[Response]]


def role_from_authorization_header(header: str | None) -> str | None:
    """Return the verified token's role, or None for a missing/invalid token."""
    if not header or not header.lower().startswith("bearer "):
        return None

    try:
        payload = decode_access_token(header[7:].strip())
    except InvalidTokenError:
        return None

    role = payload.get("role")
    return role if isinstance(role, str) else None


async def _store(request: Request) -> dict[str, str]:
    """Read the settings rows with the app's configured (or overridden) session."""
    provider: Any = request.app.dependency_overrides.get(get_db, get_db)
    generator = provider()
    try:
        session: AsyncSession = await anext(generator)
        return await SettingsRepository(session).get_all()
    finally:
        await generator.aclose()


async def maintenance_enabled(request: Request) -> bool:
    """Read the flag, failing open so a database hiccup cannot lock everyone out."""
    try:
        return is_maintenance_mode(await _store(request))
    except Exception:  # noqa: BLE001 - the request itself will surface real errors
        return False


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    """Reject non-admin API traffic with 503 while maintenance mode is on."""

    async def dispatch(self, request: Request, call_next: CallNext) -> Response:
        path = request.url.path
        if (
            not path.startswith(API_PREFIX)
            or path in ALWAYS_ALLOWED_PATHS
            or request.method == "OPTIONS"
            or role_from_authorization_header(request.headers.get("authorization")) == ADMIN_ROLE
        ):
            return await call_next(request)

        if await maintenance_enabled(request):
            return error_response(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "MAINTENANCE_MODE",
                MAINTENANCE_MESSAGE,
            )

        return await call_next(request)

