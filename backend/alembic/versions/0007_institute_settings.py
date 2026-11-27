"""institute settings

Revision ID: 0007_institute_settings
Revises: 0006_expand_platform_settings
Create Date: 2026-11-27

Moves the key-value settings to the language-institute vocabulary:

- `platform_name` becomes `institute_name` (the stored value is preserved).
- `default_class_duration` (minutes), `min_cancellation_hours` and
  `commission_rate` (percent) are seeded.
- `platform_description` and `min_withdrawal_amount` are retired.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_institute_settings"
down_revision: str | None = "0006_expand_platform_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_SETTINGS: dict[str, str] = {
    "default_class_duration": "60",
    "min_cancellation_hours": "24",
    "commission_rate": "10",
}

RETIRED_SETTINGS: tuple[str, ...] = ("platform_description", "min_withdrawal_amount")


def _rows() -> dict[str, str]:
    bind = op.get_bind()
    return {
        row[0]: row[1]
        for row in bind.execute(sa.text("SELECT key, value FROM platform_settings"))
    }


def upgrade() -> None:
    settings_table = sa.table(
        "platform_settings",
        sa.column("key", sa.String),
        sa.column("value", sa.String),
    )
    stored = _rows()

    rows = [
        {"key": key, "value": value}
        for key, value in NEW_SETTINGS.items()
        if key not in stored
    ]
    if rows:
        op.bulk_insert(settings_table, rows)

    bind = op.get_bind()
    if "institute_name" not in stored and "platform_name" in stored:
        bind.execute(
            sa.text("UPDATE platform_settings SET key = 'institute_name' WHERE key = 'platform_name'")
        )
    if "platform_name" in stored:
        bind.execute(sa.text("DELETE FROM platform_settings WHERE key = 'platform_name'"))

    for key in RETIRED_SETTINGS:
        bind.execute(sa.text("DELETE FROM platform_settings WHERE key = :key"), {"key": key})


def downgrade() -> None:
    settings_table = sa.table(
        "platform_settings",
        sa.column("key", sa.String),
        sa.column("value", sa.String),
    )
    stored = _rows()
    bind = op.get_bind()

    if "platform_name" not in stored and "institute_name" in stored:
        bind.execute(
            sa.text("UPDATE platform_settings SET key = 'platform_name' WHERE key = 'institute_name'")
        )

    restored = [
        {"key": key, "value": value}
        for key, value in (("platform_description", ""), ("min_withdrawal_amount", "0"))
        if key not in stored
    ]
    if restored:
        op.bulk_insert(settings_table, restored)

    for key in NEW_SETTINGS:
        bind.execute(sa.text("DELETE FROM platform_settings WHERE key = :key"), {"key": key})
