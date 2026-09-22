from __future__ import annotations

import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserRole(enum.StrEnum):
    chw = "chw"
    supervisor = "supervisor"
    dho = "dho"
    phim = "phim"
    mohp = "mohp"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    chw_id: Mapped[str | None] = mapped_column(String(50))
    phone: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
