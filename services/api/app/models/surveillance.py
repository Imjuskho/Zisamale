from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SurveillanceWeekly(Base):
    __tablename__ = "surveillance_weekly"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    epidemiological_week: Mapped[str] = mapped_column(String(10), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disease: Mapped[str] = mapped_column(String(50), nullable=False)
    confirmed_cases: Mapped[int] = mapped_column(Integer, default=0)
    suspected_cases: Mapped[int] = mapped_column(Integer, default=0)
    admissions: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    rainfall_mm: Mapped[float | None] = mapped_column(Float)
    temperature_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    flood_event: Mapped[bool] = mapped_column(Boolean, default=False)
