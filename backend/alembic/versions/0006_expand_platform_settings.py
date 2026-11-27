"""expand platform settings

Revision ID: 0006_expand_platform_settings
Revises: 0005_add_complaints
Create Date: 2026-11-27

Seeds the extra keys the categorized admin settings page edits: platform
description, currency, minimum withdrawal amount, email notifications and
maintenance mode. The key-value table itself already stores strings, so no
column changes are needed.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_expand_platform_settings"
down_revision: str | None = "0005_add_complaints"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_SETTINGS: dict[str, str] = {
    "platform_description": "",
    "currency": "تومان",
    "min_withdrawal_amount": "0",
    "enable_email_notifications": "true",
    "maintenance_mode": "false",
}


def upgrade() -> None:
    settings_table = sa.table(
        "platform_settings",
        sa.column("key", sa.String),
        sa.column("value", sa.String),
    )
    bind = op.get_bind()
    existing = {row[0] for row in bind.execute(sa.text("SELECT key FROM platform_settings"))}

    rows = [
        {"key": key, "value": value}
        for key, value in NEW_SETTINGS.items()
        if key not in existing
    ]
    if rows:
        op.bulk_insert(settings_table, rows)


def downgrade() -> None:
    bind = op.get_bind()
    statement = sa.text("DELETE FROM platform_settings WHERE key = :key")
    for key in NEW_SETTINGS:
        bind.execute(statement, {"key": key})
