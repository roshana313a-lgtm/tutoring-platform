"""add user is_approved flag

Revision ID: 0003_add_user_is_approved
Revises: 0002_add_role_profile_fields
Create Date: 2026-11-26

Instructors are created unapproved and stay hidden until an admin approves
them. Existing rows default to false, which is the intended state: every
instructor has to pass review once the feature ships.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_add_user_is_approved"
down_revision: str | None = "0002_add_role_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMN_NAME = "is_approved"


def _existing_columns(table: str) -> set[str]:
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(table):
        return set()
    return {col["name"] for col in insp.get_columns(table)}


def upgrade() -> None:
    if _COLUMN_NAME in _existing_columns("users"):
        return

    op.add_column(
        "users",
        sa.Column(
            _COLUMN_NAME,
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", _COLUMN_NAME)
