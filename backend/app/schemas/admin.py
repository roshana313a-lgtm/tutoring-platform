from pydantic import BaseModel, ConfigDict, EmailStr, Field, StrictBool


class PlatformSettingsResponse(BaseModel):
    platform_name: str
    support_email: EmailStr
    platform_description: str
    default_hourly_rate: int
    currency: str
    min_withdrawal_amount: int
    enable_email_notifications: bool
    maintenance_mode: bool


class PlatformSettingsUpdate(BaseModel):
    """Partial update of the admin-editable platform settings.

    Identity fields (the admin's own email/role) are intentionally absent:
    unknown keys are rejected, so this page can never edit them.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    platform_name: str | None = Field(default=None, min_length=1, max_length=120)
    support_email: EmailStr | None = None
    platform_description: str | None = Field(default=None, max_length=1000)
    default_hourly_rate: int | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, min_length=1, max_length=16)
    min_withdrawal_amount: int | None = Field(default=None, ge=0, le=1_000_000_000)
    enable_email_notifications: StrictBool | None = None
    maintenance_mode: StrictBool | None = None
