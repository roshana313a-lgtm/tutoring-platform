import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# Only these two transitions are offered to admins; a ticket starts as "open".
COMPLAINT_STATUS_OPEN = "open"
COMPLAINT_STATUS_IN_PROGRESS = "in_progress"
COMPLAINT_STATUS_RESOLVED = "resolved"


class Complaint(Base):
    """A support ticket a student or instructor sends to the admin team."""

    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=COMPLAINT_STATUS_OPEN, server_default="open"
    )
    # Python-side default keeps sub-second precision so newest-first ordering is
    # stable even when two tickets are created in the same second.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
