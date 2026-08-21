from __future__ import annotations

from sqlalchemy import Date, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClimateDaily(Base):
    __tablename__ = "climate_daily"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    observation_date: Mapped[str] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    rainfall_mm: Mapped[float | None] = mapped_column(Float)
    temperature_max_c: Mapped[float | None] = mapped_column(Float)
    temperature_min_c: Mapped[float | None] = mapped_column(Float)
    temperature_mean_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    soil_moisture: Mapped[float | None] = mapped_column(Float)
    ndvi: Mapped[float | None] = mapped_column(Float)
