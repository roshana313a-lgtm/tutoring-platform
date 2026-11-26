from app.schemas.admin import PlatformSettingsResponse

DEFAULT_SETTINGS: dict[str, str] = {
    "platform_name": "مؤسسه آموزش آنلاین",
    "default_hourly_rate": "250000",
    "support_email": "support@institute.com",
}


def build_settings(stored: dict[str, str]) -> PlatformSettingsResponse:
    """Merge stored values over the defaults, tolerating missing/garbled rows."""
    raw_rate = stored.get("default_hourly_rate", DEFAULT_SETTINGS["default_hourly_rate"])
    try:
        hourly_rate = int(raw_rate)
    except (TypeError, ValueError):
        hourly_rate = int(DEFAULT_SETTINGS["default_hourly_rate"])

    return PlatformSettingsResponse(
        platform_name=stored.get("platform_name") or DEFAULT_SETTINGS["platform_name"],
        default_hourly_rate=hourly_rate,
        support_email=stored.get("support_email") or DEFAULT_SETTINGS["support_email"],
    )
