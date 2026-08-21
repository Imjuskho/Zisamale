from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Facility(Base):
    __tablename__ = "facilities"

    facility_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    facility_type: Mapped[str] = mapped_column(String(50), nullable=False)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    catchment_population: Mapped[int | None] = mapped_column(Integer)
    staffing_level: Mapped[int | None] = mapped_column(Integer)
    bed_count: Mapped[int | None] = mapped_column(Integer)
    has_maternity: Mapped[bool] = mapped_column(Boolean, default=False)
    has_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    has_pharmacy: Mapped[bool] = mapped_column(Boolean, default=True)
    quality_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
