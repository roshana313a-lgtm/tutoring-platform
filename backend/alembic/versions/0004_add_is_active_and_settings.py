"""add is_active and platform settings

Revision ID: 0004_add_is_active_and_settings
Revises: 0003_add_user_is_approved
Create Date: 2026-11-26

Adds account suspension (`users.is_active`, default true) and the key-value
`platform_settings` table seeded with the three settings the admin panel edits.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_add_is_active_and_settings"
down_revision: str | None = "0003_add_user_is_approved"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_SETTINGS: dict[str, str] = {
    "platform_name": "مؤسسه آموزش آنلاین",
    "default_hourly_rate": "250000",
    "support_email": "support@institute.com",
}


def _existing_columns(table: str) -> set[str]:
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(table):
        return set()
    return {col["name"] for col in insp.get_columns(table)}


def upgrade() -> None:
    if "is_active" not in _existing_columns("users"):
        op.add_column(
            "users",
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
        )

    settings_table = sa.table(
        "platform_settings",
        sa.column("key", sa.String),
        sa.column("value", sa.String),
    )
    insp = sa.inspect(op.get_bind())
    if not insp.has_table("platform_settings"):
        op.create_table(
            "platform_settings",
            sa.Column("key", sa.String(length=64), primary_key=True),
            sa.Column("value", sa.String(length=1024), nullable=False, server_default=""),
        )
        op.bulk_insert(
            settings_table,
            [{"key": key, "value": value} for key, value in DEFAULT_SETTINGS.items()],
        )


def downgrade() -> None:
    op.drop_table("platform_settings")
    op.drop_column("users", "is_active")
