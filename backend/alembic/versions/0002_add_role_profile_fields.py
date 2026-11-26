"""add role-specific profile fields

Revision ID: 0002_add_role_profile_fields
Revises: 0001_add_user_profile_fields
Create Date: 2026-11-26

Adds the columns behind the role-specific profile page. All types are portable
between SQLite and PostgreSQL 16 per ADR-005 (generic JSON, no ARRAY/JSONB).
`avatar_url` and `current_level` already exist from revision 0001.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_add_role_profile_fields"
down_revision: str | None = "0001_add_user_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_COLUMNS: dict[str, sa.Column] = {
    "date_of_birth": sa.Column("date_of_birth", sa.Date(), nullable=True),
    "education_level": sa.Column(
        "education_level", sa.String(length=64), nullable=False, server_default=""
    ),
    "short_summary": sa.Column(
        "short_summary", sa.String(length=200), nullable=False, server_default=""
    ),
    "hourly_rate": sa.Column("hourly_rate", sa.Integer(), nullable=False, server_default="0"),
    "teaching_languages": sa.Column(
        "teaching_languages", sa.JSON(), nullable=False, server_default="[]"
    ),
    "learning_goal": sa.Column("learning_goal", sa.Text(), nullable=False, server_default=""),
}


def _existing_columns(table: str) -> set[str]:
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(table):
        return set()
    return {col["name"] for col in insp.get_columns(table)}


def upgrade() -> None:
    existing = _existing_columns("users")
    for name, column in _NEW_COLUMNS.items():
        if name not in existing:
            op.add_column("users", column)


def downgrade() -> None:
    for name in reversed(list(_NEW_COLUMNS)):
        op.drop_column("users", name)
