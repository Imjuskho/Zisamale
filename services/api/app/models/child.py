from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, Float, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Child(Base):
    __tablename__ = "children"

    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    household_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    child_name: Mapped[str | None] = mapped_column(String(255))
    dob: Mapped[str | None] = mapped_column(Date)
    sex: Mapped[str | None] = mapped_column(String(10))
    birth_weight_kg: Mapped[float | None] = mapped_column(Float)
    vaccination_status: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    muac: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    height_cm: Mapped[float | None] = mapped_column(Float)
    danger_signs: Mapped[dict | None] = mapped_column(JSONB, default=list)
    symptoms: Mapped[dict | None] = mapped_column(JSONB, default=list)
    risk_score: Mapped[float | None] = mapped_column(Float)
    risk_category: Mapped[str] = mapped_column(String(20), default="low")
    top_risk_factors: Mapped[dict | None] = mapped_column(JSONB, default=list)
    iccm_category: Mapped[str] = mapped_column(String(20), default="uncomplicated")
    treatment_given: Mapped[str | None] = mapped_column(String)
    referral_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    referral_status: Mapped[str | None] = mapped_column(String(20))
    chw_id: Mapped[str | None] = mapped_column(String(255))
    sync_status: Mapped[str] = mapped_column(String(20), default="pending")
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
