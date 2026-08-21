from __future__ import annotations

from sqlalchemy import DateTime, Enum, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    disease: Mapped[str] = mapped_column(String(50), nullable=False)
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_name: Mapped[str | None] = mapped_column(String(100))
    risk_score: Mapped[float | None] = mapped_column(Float)
    alert_level: Mapped[str] = mapped_column(String(10), nullable=False)
    predicted_cases: Mapped[int | None] = mapped_column(Integer)
    confidence_interval_lower: Mapped[int | None] = mapped_column(Integer)
    confidence_interval_upper: Mapped[int | None] = mapped_column(Integer)
    recommended_actions: Mapped[dict | None] = mapped_column(JSONB, default=list)
    model_version: Mapped[str | None] = mapped_column(String(50))
    generated_at: Mapped[str | None] = mapped_column(DateTime)
    valid_until: Mapped[str | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(
        Enum("pending", "acknowledged", "in_progress", "resolved", name="response_status"),
        default="pending",
    )
    responded_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    response_notes: Mapped[str | None] = mapped_column(String)
    actions_taken: Mapped[dict | None] = mapped_column(JSONB, default=list)
    resources_deployed: Mapped[dict | None] = mapped_column(JSONB)
    responded_at: Mapped[str | None] = mapped_column(DateTime)
