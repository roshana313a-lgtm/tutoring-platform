import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    phone_number: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    avatar_url: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    timezone: Mapped[str] = mapped_column(
        String(64), nullable=False, default="Asia/Tehran"
    )
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    years_of_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_level: Mapped[str] = mapped_column(String(64), nullable=False, default="")
