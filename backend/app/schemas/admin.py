from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PlatformSettingsResponse(BaseModel):
    platform_name: str
    default_hourly_rate: int
    support_email: EmailStr


class PlatformSettingsUpdate(BaseModel):
    """Partial update of the admin-editable platform settings."""

    model_config = ConfigDict(extra="forbid")

    platform_name: str | None = Field(default=None, min_length=1, max_length=120)
    default_hourly_rate: int | None = Field(default=None, ge=0)
    support_email: EmailStr | None = None
