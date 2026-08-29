from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Pregnancy(Base):
    __tablename__ = "pregnancies"

    pregnancy_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    household_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    woman_name: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer)
    parity: Mapped[int] = mapped_column(Integer, default=0)
    gravida: Mapped[int] = mapped_column(Integer, default=1)
    lmp_date: Mapped[str | None] = mapped_column(Date)
    edd_date: Mapped[str | None] = mapped_column(Date)
    prior_stillbirths: Mapped[int] = mapped_column(Integer, default=0)
    prior_csections: Mapped[int] = mapped_column(Integer, default=0)
    prior_pph: Mapped[int] = mapped_column(Integer, default=0)
    hiv_status: Mapped[str | None] = mapped_column(String(20))
    bp_systolic: Mapped[int | None] = mapped_column(Integer)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer)
    hemoglobin: Mapped[float | None] = mapped_column(Float)
    danger_signs: Mapped[dict | None] = mapped_column(JSONB, default=list)
    risk_score: Mapped[float | None] = mapped_column(Float)
    risk_category: Mapped[str] = mapped_column(String(20), default="low")
    top_risk_factors: Mapped[dict | None] = mapped_column(JSONB, default=list)
    next_visit_date: Mapped[str | None] = mapped_column(Date)
    referral_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    referral_status: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    sync_status: Mapped[str] = mapped_column(String(20), default="pending")
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
