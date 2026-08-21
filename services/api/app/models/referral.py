from __future__ import annotations

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Referral(Base):
    __tablename__ = "referrals"

    referral_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    visit_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    patient_type: Mapped[str] = mapped_column(String(20), nullable=False)
    referral_reason: Mapped[str] = mapped_column(String, nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), default="routine")
    recommended_facilities: Mapped[dict | None] = mapped_column(JSONB, default=list)
    selected_facility_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    referral_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    facility_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    facility_notified_at: Mapped[str | None] = mapped_column(DateTime)
    patient_arrived: Mapped[bool] = mapped_column(Boolean, default=False)
    patient_arrived_at: Mapped[str | None] = mapped_column(DateTime)
    outcome: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String(20), default="pending")
