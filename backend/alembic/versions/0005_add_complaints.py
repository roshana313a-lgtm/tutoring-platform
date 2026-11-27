"""add complaints

Revision ID: 0005_add_complaints
Revises: 0004_add_is_active_and_settings
Create Date: 2026-11-27

Creates the `complaints` support-ticket table. A ticket belongs to the user who
opened it, starts in the `open` status and is triaged by admins into
`in_progress` and then `resolved`.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_add_complaints"
down_revision: str | None = "0004_add_is_active_and_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if insp.has_table("complaints"):
        return

    op.create_table(
        "complaints",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="open"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_complaints_user_id", "complaints", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_complaints_user_id", table_name="complaints")
    op.drop_table("complaints")
