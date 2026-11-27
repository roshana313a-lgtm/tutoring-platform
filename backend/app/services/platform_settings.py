from app.schemas.admin import PlatformSettingsResponse

DEFAULT_SETTINGS: dict[str, str] = {
    "platform_name": "مؤسسه آموزش آنلاین",
    "support_email": "support@institute.com",
    "platform_description": "",
    "default_hourly_rate": "250000",
    "currency": "تومان",
    "min_withdrawal_amount": "0",
    "enable_email_notifications": "true",
    "maintenance_mode": "false",
}

_TRUE_VALUES = {"1", "true", "yes", "on"}


def _as_int(stored: dict[str, str], key: str) -> int:
    """Stored integers are strings; fall back to the default when garbled."""
    try:
        return int(stored.get(key, DEFAULT_SETTINGS[key]))
    except (TypeError, ValueError):
        return int(DEFAULT_SETTINGS[key])


def _as_bool(stored: dict[str, str], key: str) -> bool:
    """Stored booleans are 'true'/'false' strings."""
    raw = stored.get(key, DEFAULT_SETTINGS[key])
    return str(raw).strip().lower() in _TRUE_VALUES


def to_stored_value(value: object) -> str:
    """Serialize an input value into the key-value table's string column."""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def is_maintenance_mode(stored: dict[str, str]) -> bool:
    """True when the admin switched the platform into maintenance mode."""
    return _as_bool(stored, "maintenance_mode")


def build_settings(stored: dict[str, str]) -> PlatformSettingsResponse:
    """Merge stored values over the defaults, tolerating missing/garbled rows."""
    return PlatformSettingsResponse(
        platform_name=stored.get("platform_name") or DEFAULT_SETTINGS["platform_name"],
        support_email=stored.get("support_email") or DEFAULT_SETTINGS["support_email"],
        platform_description=stored.get("platform_description") or "",
        default_hourly_rate=_as_int(stored, "default_hourly_rate"),
        currency=stored.get("currency") or DEFAULT_SETTINGS["currency"],
        min_withdrawal_amount=_as_int(stored, "min_withdrawal_amount"),
        enable_email_notifications=_as_bool(stored, "enable_email_notifications"),
        maintenance_mode=_as_bool(stored, "maintenance_mode"),
    )
