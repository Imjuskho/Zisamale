from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Household(Base):
    __tablename__ = "households"

    household_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    village_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    gps_lat: Mapped[float | None] = mapped_column(Float)
    gps_lon: Mapped[float | None] = mapped_column(Float)
    ta_name: Mapped[str | None] = mapped_column(String(100))
    village_name: Mapped[str | None] = mapped_column(String(100))
    water_source: Mapped[str | None] = mapped_column(String(50))
    sanitation_type: Mapped[str | None] = mapped_column(String(50))
    food_security_score: Mapped[int | None] = mapped_column(Integer)
    distance_to_facility_km: Mapped[float | None] = mapped_column(Float)
    transport_cost_mwk: Mapped[float | None] = mapped_column(Float)
    household_size: Mapped[int | None] = mapped_column(Integer)
    sync_status: Mapped[str] = mapped_column(String(20), default="pending")
