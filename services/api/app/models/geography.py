from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class District(Base):
    __tablename__ = "districts"

    district_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str | None] = mapped_column(String(100))
    population: Mapped[int | None] = mapped_column(Integer)


class TraditionalAuthority(Base):
    __tablename__ = "traditional_authorities"

    ta_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    population: Mapped[int | None] = mapped_column(Integer)


class Village(Base):
    __tablename__ = "villages"

    village_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    ta_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    population: Mapped[int | None] = mapped_column(Integer)
