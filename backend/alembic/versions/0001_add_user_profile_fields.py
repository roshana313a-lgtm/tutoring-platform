"""add user profile fields

Revision ID: 0001_add_user_profile_fields
Revises:
Create Date: 2026-11-24

Adds self-service profile columns to the existing users table. All types are
portable between SQLite and PostgreSQL 16 per ADR-005.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_add_user_profile_fields"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(length=255), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column("phone_number", sa.String(length=50), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(length=1024), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default="Asia/Tehran",
        ),
    )
    op.add_column(
        "users",
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column(
            "years_of_experience",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column("current_level", sa.String(length=64), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("users", "current_level")
    op.drop_column("users", "years_of_experience")
    op.drop_column("users", "bio")
    op.drop_column("users", "timezone")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "full_name")
