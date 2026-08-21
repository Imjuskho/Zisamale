from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Visit(Base):
    __tablename__ = "visits"

    visit_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    household_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    visit_date: Mapped[str] = mapped_column(DateTime, nullable=False)
    pregnancy_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    child_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    visit_type: Mapped[str] = mapped_column(String(20), nullable=False)
    symptoms: Mapped[dict | None] = mapped_column(JSONB, default=list)
    danger_signs: Mapped[dict | None] = mapped_column(JSONB, default=list)
    measurements: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    ai_recommendation: Mapped[dict | None] = mapped_column(JSONB)
    ai_risk_score: Mapped[float | None] = mapped_column(Float)
    chw_override: Mapped[bool] = mapped_column(Boolean, default=False)
    chw_override_reason: Mapped[str | None] = mapped_column(String)
    chw_notes: Mapped[str | None] = mapped_column(String)
    gps_lat: Mapped[float | None] = mapped_column(Float)
    gps_lon: Mapped[float | None] = mapped_column(Float)
    photos_queued: Mapped[int] = mapped_column(Integer, default=0)
    sync_status: Mapped[str] = mapped_column(String(20), default="pending")
