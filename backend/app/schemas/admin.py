from pydantic import BaseModel, ConfigDict, EmailStr, Field, StrictBool


class PlatformSettingsResponse(BaseModel):
    institute_name: str
    support_email: EmailStr
    default_class_duration: int
    min_cancellation_hours: int
    default_hourly_rate: int
    currency: str
    commission_rate: int
    enable_email_notifications: bool
    maintenance_mode: bool


class PlatformSettingsUpdate(BaseModel):
    """Partial update of the admin-editable platform settings.

    Identity fields (the admin's own email/role) are intentionally absent:
    unknown keys are rejected, so this page can never edit them.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    institute_name: str | None = Field(default=None, min_length=1, max_length=120)
    support_email: EmailStr | None = None
    # Class length in minutes, 1 minute to a full day.
    default_class_duration: int | None = Field(default=None, ge=1, le=1440)
    # Free-cancellation window before the class, up to 30 days.
    min_cancellation_hours: int | None = Field(default=None, ge=0, le=720)
    default_hourly_rate: int | None = Field(default=None, ge=0, le=1_000_000_000)
    currency: str | None = Field(default=None, min_length=1, max_length=16)
    # Institute's share of each class, in percent.
    commission_rate: int | None = Field(default=None, ge=0, le=100)
    enable_email_notifications: StrictBool | None = None
    maintenance_mode: StrictBool | None = None
